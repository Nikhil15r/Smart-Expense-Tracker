import { Decimal } from 'decimal.js';
import crypto from 'crypto';

// Enforce high precision and Banker's rounding for all ledger math
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export interface TransactionSummaryInput {
  id: string;
  accountId: string;
  amount: string | number | Decimal;
  direction: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REFUNDED' | 'CANCELLED';
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND';
  isTransfer: boolean;
  date: Date | string;
  categoryId?: string | null;
  normalizedMerchant?: string | null;
}

export interface CashFlowSummary {
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netCashFlow: Decimal;
  pendingExpenses: Decimal;
  totalRefunds: Decimal;
  totalTransfers: Decimal;
}

export interface CategorySpending {
  categoryId: string;
  categoryName?: string;
  amount: Decimal;
  percentage: number;
  transactionCount: number;
}

export interface MerchantSpending {
  merchantName: string;
  amount: Decimal;
  transactionCount: number;
}

/**
 * Normalizes any number, string, or Decimal representation into an exact Decimal instance.
 */
export function toDecimal(val: string | number | Decimal): Decimal {
  if (val instanceof Decimal) return val;
  if (typeof val === 'number') return new Decimal(val.toString());
  if (typeof val === 'string') {
    // strip currency symbols or commas if present
    const cleaned = val.replace(/[^0-9.-]/g, '');
    return new Decimal(cleaned || '0');
  }
  return new Decimal(0);
}

/**
 * Calculates deterministic SHA-256 fingerprint for deduplication across recurring bank syncs and CSV statements.
 */
export function generateTransactionFingerprint(
  accountId: string,
  date: Date | string,
  amount: string | number | Decimal,
  description: string
): string {
  const dateStr = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const amtStr = toDecimal(amount).toFixed(2);
  const cleanDesc = description.trim().toLowerCase().replace(/\s+/g, ' ');
  const payload = `${accountId}|${dateStr}|${amtStr}|${cleanDesc}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Calculates total income for settled non-transfer credit transactions.
 */
export function calculateTotalIncome(transactions: TransactionSummaryInput[]): Decimal {
  return transactions
    .filter(
      (tx) =>
        tx.status === 'COMPLETED' &&
        tx.direction === 'CREDIT' &&
        tx.type === 'INCOME' &&
        !tx.isTransfer
    )
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));
}

/**
 * Calculates net expenses: (Settled non-transfer DEBIT expenses) - (Settled REFUND credits).
 * Enforces rule: Refunds directly reduce net category spending and are never treated as income.
 */
export function calculateTotalExpenses(transactions: TransactionSummaryInput[]): Decimal {
  const grossDebits = transactions
    .filter(
      (tx) =>
        tx.status === 'COMPLETED' &&
        tx.direction === 'DEBIT' &&
        tx.type === 'EXPENSE' &&
        !tx.isTransfer
    )
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));

  const totalRefunds = transactions
    .filter((tx) => tx.status === 'COMPLETED' && tx.type === 'REFUND')
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));

  const net = grossDebits.minus(totalRefunds);
  return net.isNegative() ? new Decimal(0) : net;
}

/**
 * Calculates full cash flow summary with pending isolation.
 */
export function calculateCashFlowSummary(transactions: TransactionSummaryInput[]): CashFlowSummary {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);
  const netCashFlow = totalIncome.minus(totalExpenses);

  const pendingExpenses = transactions
    .filter(
      (tx) =>
        tx.status === 'PENDING' &&
        tx.direction === 'DEBIT' &&
        tx.type === 'EXPENSE' &&
        !tx.isTransfer
    )
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));

  const totalRefunds = transactions
    .filter((tx) => tx.status === 'COMPLETED' && tx.type === 'REFUND')
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));

  const totalTransfers = transactions
    .filter((tx) => tx.status === 'COMPLETED' && tx.isTransfer)
    .reduce((sum, tx) => sum.plus(toDecimal(tx.amount)), new Decimal(0));

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    pendingExpenses,
    totalRefunds,
    totalTransfers,
  };
}

/**
 * Groups expenses by category and returns sorted breakdown with exact percentages.
 */
export function calculateSpendingByCategory(
  transactions: TransactionSummaryInput[],
  categoryMap: Record<string, string> = {}
): CategorySpending[] {
  const categoryTotals: Record<string, { amount: Decimal; count: number }> = {};
  let overallExpense = new Decimal(0);

  // Group debits and subtract refunds
  for (const tx of transactions) {
    if (tx.status !== 'COMPLETED' || tx.isTransfer) continue;
    const catId = tx.categoryId || 'uncategorized';

    if (!categoryTotals[catId]) {
      categoryTotals[catId] = { amount: new Decimal(0), count: 0 };
    }

    if (tx.type === 'EXPENSE' && tx.direction === 'DEBIT') {
      const amt = toDecimal(tx.amount);
      categoryTotals[catId].amount = categoryTotals[catId].amount.plus(amt);
      categoryTotals[catId].count += 1;
      overallExpense = overallExpense.plus(amt);
    } else if (tx.type === 'REFUND') {
      const amt = toDecimal(tx.amount);
      categoryTotals[catId].amount = categoryTotals[catId].amount.minus(amt);
      overallExpense = overallExpense.minus(amt);
    }
  }

  const results: CategorySpending[] = [];
  for (const [catId, data] of Object.entries(categoryTotals)) {
    const finalAmount = data.amount.isNegative() ? new Decimal(0) : data.amount;
    const percentage = overallExpense.isPositive() && !overallExpense.isZero()
      ? finalAmount.dividedBy(overallExpense).times(100).toNumber()
      : 0;

    results.push({
      categoryId: catId,
      categoryName: categoryMap[catId] || (catId === 'uncategorized' ? 'Uncategorized' : catId),
      amount: finalAmount,
      percentage: Math.round(percentage * 10) / 10,
      transactionCount: data.count,
    });
  }

  return results.sort((a, b) => b.amount.comparedTo(a.amount));
}

/**
 * Calculates top merchants by total spend.
 */
export function calculateSpendingByMerchant(
  transactions: TransactionSummaryInput[],
  limit: number = 10
): MerchantSpending[] {
  const merchantTotals: Record<string, { amount: Decimal; count: number }> = {};

  for (const tx of transactions) {
    if (
      tx.status !== 'COMPLETED' ||
      tx.isTransfer ||
      tx.direction !== 'DEBIT' ||
      tx.type !== 'EXPENSE'
    ) {
      continue;
    }

    const merchant = tx.normalizedMerchant?.trim() || 'Unknown Merchant';
    if (!merchantTotals[merchant]) {
      merchantTotals[merchant] = { amount: new Decimal(0), count: 0 };
    }

    merchantTotals[merchant].amount = merchantTotals[merchant].amount.plus(toDecimal(tx.amount));
    merchantTotals[merchant].count += 1;
  }

  return Object.entries(merchantTotals)
    .map(([merchantName, data]) => ({
      merchantName,
      amount: data.amount,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount.comparedTo(a.amount))
    .slice(0, limit);
}

/**
 * Formats monetary amounts with exact currency symbol and decimal formatting (e.g. INR ₹ 1,24,500.00).
 */
export function formatCurrency(amount: string | number | Decimal, currency: string = 'INR'): string {
  const dec = toDecimal(amount);
  const num = dec.toNumber();

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${dec.toFixed(2)}`;
  }
}
