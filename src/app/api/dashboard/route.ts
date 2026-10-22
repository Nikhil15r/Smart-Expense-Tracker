import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import {
  calculateCashFlowSummary,
  calculateSpendingByCategory,
  calculateSpendingByMerchant,
  toDecimal,
} from '@/lib/domain/ledger';
import { calculateEssentialVsDiscretionary } from '@/lib/domain/insights';
import { Decimal } from 'decimal.js';

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const searchParams = req.nextUrl.searchParams;
  const range = searchParams.get('range') || 'this-month';
  const accountId = searchParams.get('accountId');

  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  if (range === 'last-7-days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'last-30-days') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === 'last-month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else {
    // Default 'this-month'
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Fetch accounts for user
  const accounts = await StorageService.getAccounts(session.userId);

  // Fetch transactions
  const { transactions: allTxs } = await StorageService.getTransactions(session.userId, {
    accountId: accountId || undefined,
  });

  // Filter for period
  const periodTxs = allTxs.filter((t) => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });

  // 1. Calculate Total Balance across connected accounts
  const totalBalance = accounts.reduce((sum, a) => {
    // If credit card, currentBalance is liability (subtract from net worth)
    const bal = toDecimal(a.currentBalance);
    return a.type === 'CREDIT_CARD' ? sum.minus(bal) : sum.plus(bal);
  }, new Decimal(0));

  // 2. Cash flow summary for current period
  const cashFlow = calculateCashFlowSummary(periodTxs as any);

  // 3. Failed transactions count
  const failedCount = periodTxs.filter((t) => t.status === 'FAILED').length;

  // 4. Uncategorized count
  const uncategorizedCount = periodTxs.filter(
    (t) => !t.categoryId || t.categoryId === 'uncategorized' || t.subcategoryId === 'uncategorized'
  ).length;

  // 5. Budgets & Utilization
  const budgets = await StorageService.getBudgets(session.userId);
  let totalBudgetAmount = new Decimal(0);
  let totalBudgetSpent = new Decimal(0);

  for (const b of budgets) {
    const bAmt = toDecimal(b.amount);
    totalBudgetAmount = totalBudgetAmount.plus(bAmt);

    const spent = periodTxs
      .filter(
        (t) =>
          t.categoryId === b.categoryId &&
          t.direction === 'DEBIT' &&
          t.status === 'COMPLETED' &&
          !t.isTransfer
      )
      .reduce((sum, t) => sum.plus(toDecimal(t.amount)), new Decimal(0));

    totalBudgetSpent = totalBudgetSpent.plus(spent);
  }

  const overallBudgetUtilization = totalBudgetAmount.isZero()
    ? 0
    : Math.min(100, Math.round(totalBudgetSpent.dividedBy(totalBudgetAmount).times(100).toNumber()));

  // 6. Savings Goals Progress
  const goals = await StorageService.getSavingsGoals(session.userId);
  let totalGoalTarget = new Decimal(0);
  let totalGoalSaved = new Decimal(0);
  for (const g of goals) {
    totalGoalTarget = totalGoalTarget.plus(toDecimal(g.targetAmount));
    totalGoalSaved = totalGoalSaved.plus(toDecimal(g.currentAmount));
  }
  const overallSavingsProgress = totalGoalTarget.isZero()
    ? 0
    : Math.min(100, Math.round(totalGoalSaved.dividedBy(totalGoalTarget).times(100).toNumber()));

  // 7. Upcoming Recurring Payments
  const recurring = await StorageService.getRecurringPayments(session.userId);
  const upcomingRecurringCount = recurring.filter((r) => r.status !== 'DISMISSED').length;

  // 8. Spending by category
  const categoryBreakdown = calculateSpendingByCategory(periodTxs as any);

  // 9. Spending by merchant
  const topMerchants = calculateSpendingByMerchant(periodTxs as any, 6);

  // 10. Essential vs Discretionary
  const essentialDiscretionary = calculateEssentialVsDiscretionary(periodTxs as any);

  // 11. Daily Cash Flow Trend for Chart
  const dailyMap: Record<string, { date: string; income: Decimal; expense: Decimal }> = {};
  for (const tx of periodTxs) {
    if (tx.status !== 'COMPLETED' || tx.isTransfer) continue;
    const dayKey = tx.date.slice(0, 10);
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { date: dayKey, income: new Decimal(0), expense: new Decimal(0) };
    }
    const amt = toDecimal(tx.amount);
    if (tx.type === 'INCOME' && tx.direction === 'CREDIT') {
      dailyMap[dayKey].income = dailyMap[dayKey].income.plus(amt);
    } else if (tx.type === 'EXPENSE' && tx.direction === 'DEBIT') {
      dailyMap[dayKey].expense = dailyMap[dayKey].expense.plus(amt);
    } else if (tx.type === 'REFUND') {
      dailyMap[dayKey].expense = dailyMap[dayKey].expense.minus(amt);
    }
  }

  const cashFlowTrend = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      income: d.income.toNumber(),
      expense: d.expense.isNegative() ? 0 : d.expense.toNumber(),
    }));

  return NextResponse.json({
    kpis: {
      totalBalance: totalBalance.toFixed(2),
      totalIncome: cashFlow.totalIncome.toFixed(2),
      totalExpenses: cashFlow.totalExpenses.toFixed(2),
      netCashFlow: cashFlow.netCashFlow.toFixed(2),
      pendingCount: periodTxs.filter((t) => t.status === 'PENDING').length,
      pendingAmount: cashFlow.pendingExpenses.toFixed(2),
      failedCount,
      upcomingRecurringCount,
      budgetUtilization: overallBudgetUtilization,
      savingsProgress: overallSavingsProgress,
      uncategorizedCount,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currentBalance: a.currentBalance,
      currency: a.currency,
      accountNumberMasked: a.accountNumberMasked,
    })),
    cashFlowTrend,
    categoryBreakdown: categoryBreakdown.map((c) => ({
      categoryId: c.categoryId,
      name: c.categoryName,
      amount: c.amount.toNumber(),
      percentage: c.percentage,
    })),
    topMerchants: topMerchants.map((m) => ({
      name: m.merchantName,
      amount: m.amount.toNumber(),
      count: m.transactionCount,
    })),
    essentialDiscretionary,
    dateRange: {
      start: startDate.toISOString().slice(0, 10),
      end: endDate.toISOString().slice(0, 10),
    },
  });
}
