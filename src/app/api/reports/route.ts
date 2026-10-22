import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import {
  calculateCashFlowSummary,
  calculateSpendingByCategory,
  calculateSpendingByMerchant,
  toDecimal,
} from '@/lib/domain/ledger';
import { Decimal } from 'decimal.js';

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const searchParams = req.nextUrl.searchParams;
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;

  const { transactions: allTxs } = await StorageService.getTransactions(session.userId);

  // If specific month requested:
  let filteredTxs = allTxs;
  if (month !== undefined) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59).toISOString();
    filteredTxs = allTxs.filter((t) => t.date >= start && t.date <= end);
  } else {
    // Whole year
    const start = new Date(year, 0, 1).toISOString();
    const end = new Date(year, 11, 31, 23, 59, 59).toISOString();
    filteredTxs = allTxs.filter((t) => t.date >= start && t.date <= end);
  }

  const cashFlow = calculateCashFlowSummary(filteredTxs as any);
  const categoryBreakdown = calculateSpendingByCategory(filteredTxs as any);
  const topMerchants = calculateSpendingByMerchant(filteredTxs as any, 10);

  // Month-by-month cash flow breakdown for the year
  const monthlyBreakdown: { month: number; monthName: string; income: number; expense: number; net: number }[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let m = 0; m < 12; m++) {
    const mStart = new Date(year, m, 1).toISOString();
    const mEnd = new Date(year, m + 1, 0, 23, 59, 59).toISOString();
    const mTxs = allTxs.filter((t) => t.date >= mStart && t.date <= mEnd);
    const mSummary = calculateCashFlowSummary(mTxs as any);

    monthlyBreakdown.push({
      month: m + 1,
      monthName: monthNames[m],
      income: mSummary.totalIncome.toNumber(),
      expense: mSummary.totalExpenses.toNumber(),
      net: mSummary.netCashFlow.toNumber(),
    });
  }

  return NextResponse.json({
    period: { year, month: month || null },
    summary: {
      totalIncome: cashFlow.totalIncome.toFixed(2),
      totalExpenses: cashFlow.totalExpenses.toFixed(2),
      netCashFlow: cashFlow.netCashFlow.toFixed(2),
      totalRefunds: cashFlow.totalRefunds.toFixed(2),
      totalTransfers: cashFlow.totalTransfers.toFixed(2),
      transactionCount: filteredTxs.length,
    },
    categoryBreakdown: categoryBreakdown.map((c) => ({
      categoryId: c.categoryId,
      name: c.categoryName,
      amount: c.amount.toNumber(),
      percentage: c.percentage,
      transactionCount: c.transactionCount,
    })),
    topMerchants: topMerchants.map((m) => ({
      name: m.merchantName,
      amount: m.amount.toNumber(),
      count: m.transactionCount,
    })),
    monthlyBreakdown,
  });
}
