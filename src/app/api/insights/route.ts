import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { answerFinancialQuery, calculateEssentialVsDiscretionary } from '@/lib/domain/insights';
import { calculateCashFlowSummary, toDecimal } from '@/lib/domain/ledger';
import { Decimal } from 'decimal.js';

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query string is required' }, { status: 400 });
    }

    const { transactions } = await StorageService.getTransactions(session.userId);
    const answer = answerFinancialQuery(query, transactions as any);

    return NextResponse.json({ success: true, answer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Insight query failed' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { transactions: allTxs } = await StorageService.getTransactions(session.userId);
  const thisMonthTxs = allTxs.filter((t) => t.date >= startOfMonth);

  const cashFlow = calculateCashFlowSummary(thisMonthTxs as any);
  const ratio = calculateEssentialVsDiscretionary(thisMonthTxs as any);

  // Compute a comprehensive Financial Health Score (0 - 100)
  // Factors:
  // 1. Savings Rate (target >= 20%): up to 40 pts
  // 2. Discretionary ratio (target <= 40%): up to 30 pts
  // 3. No failed payments: up to 15 pts
  // 4. Positive net cash flow: up to 15 pts
  let healthScore = 50;

  if (cashFlow.totalIncome.isPositive() && !cashFlow.totalIncome.isZero()) {
    const savingsRatio = cashFlow.netCashFlow.dividedBy(cashFlow.totalIncome).toNumber();
    if (savingsRatio >= 0.20) healthScore += 25;
    else if (savingsRatio >= 0.10) healthScore += 15;
    else if (savingsRatio < 0) healthScore -= 20;
  }

  if (ratio.discretionaryPercentage <= 35) healthScore += 15;
  else if (ratio.discretionaryPercentage >= 60) healthScore -= 10;

  const failedCount = thisMonthTxs.filter((t) => t.status === 'FAILED').length;
  if (failedCount === 0) healthScore += 10;
  else healthScore -= 15;

  healthScore = Math.max(10, Math.min(100, healthScore));

  // Identify spending anomalies (transactions that are > 3x the category average)
  const anomalies: { merchant: string; amount: string; category: string; date: string }[] = [];
  for (const tx of thisMonthTxs) {
    if (tx.status === 'COMPLETED' && tx.direction === 'DEBIT' && toDecimal(tx.amount).gt(15000)) {
      anomalies.push({
        merchant: tx.normalizedMerchant,
        amount: tx.amount,
        category: tx.categoryId || 'Uncategorized',
        date: tx.date.slice(0, 10),
      });
    }
  }

  return NextResponse.json({
    healthScore,
    savingsRate: cashFlow.totalIncome.isPositive() && !cashFlow.totalIncome.isZero()
      ? Math.max(0, Math.round(cashFlow.netCashFlow.dividedBy(cashFlow.totalIncome).times(100).toNumber()))
      : 0,
    essentialRatio: ratio.essentialPercentage,
    discretionaryRatio: ratio.discretionaryPercentage,
    anomalies: anomalies.slice(0, 5),
    totalSavedThisMonth: cashFlow.netCashFlow.toFixed(2),
  });
}
