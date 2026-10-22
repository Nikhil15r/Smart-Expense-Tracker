import { Decimal } from 'decimal.js';

export interface RecurringCandidate {
  merchantName: string;
  amount: Decimal;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  confidence: number;
  occurrences: number;
  lastDate: Date;
  nextExpectedDate: Date;
  isVariableAmount: boolean;
  categoryId?: string | null;
}

interface TxHistoryItem {
  id: string;
  normalizedMerchant: string;
  amount: Decimal | string | number;
  date: Date | string;
  categoryId?: string | null;
  status: string;
  direction: string;
  type: string;
}

/**
 * Scans transaction history and detects recurring payment cadences.
 */
export function detectRecurringPayments(transactions: TxHistoryItem[]): RecurringCandidate[] {
  // Filter for completed non-transfer debit expenses
  const eligible = transactions
    .filter(
      (tx) =>
        tx.status === 'COMPLETED' &&
        tx.direction === 'DEBIT' &&
        tx.type === 'EXPENSE' &&
        tx.normalizedMerchant
    )
    .map((tx) => ({
      ...tx,
      dateObj: typeof tx.date === 'string' ? new Date(tx.date) : tx.date,
      decAmount: tx.amount instanceof Decimal ? tx.amount : new Decimal(tx.amount.toString()),
    }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Group by normalized merchant
  const groups: Record<string, typeof eligible> = {};
  for (const tx of eligible) {
    const key = tx.normalizedMerchant.trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }

  const results: RecurringCandidate[] = [];

  for (const [merchantKey, items] of Object.entries(groups)) {
    if (items.length < 2) continue; // Need at least 2 occurrences to establish an interval

    // Calculate intervals in days between consecutive occurrences
    const intervals: number[] = [];
    for (let i = 1; i < items.length; i++) {
      const diffMs = items[i].dateObj.getTime() - items[i - 1].dateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Check cadence
    let frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null = null;
    let expectedDays = 30;

    if (avgInterval >= 5 && avgInterval <= 9) {
      frequency = 'WEEKLY';
      expectedDays = 7;
    } else if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = 'MONTHLY';
      expectedDays = 30;
    } else if (avgInterval >= 80 && avgInterval <= 100) {
      frequency = 'QUARTERLY';
      expectedDays = 90;
    } else if (avgInterval >= 350 && avgInterval <= 380) {
      frequency = 'ANNUALLY';
      expectedDays = 365;
    }

    if (!frequency) continue;

    // Amount variation check
    const amounts = items.map((i) => i.decAmount);
    const firstAmt = amounts[0];
    const isVariableAmount = amounts.some((a) => !a.equals(firstAmt));
    const latestItem = items[items.length - 1];

    // Calculate next expected date
    const nextExpected = new Date(latestItem.dateObj.getTime());
    nextExpected.setDate(nextExpected.getDate() + expectedDays);

    // Confidence scoring based on occurrence count and interval standard deviation
    let confidence = items.length >= 3 ? 0.95 : 0.75;
    if (isVariableAmount) confidence = Math.max(0.6, confidence - 0.15);

    results.push({
      merchantName: latestItem.normalizedMerchant,
      amount: latestItem.decAmount,
      frequency,
      confidence,
      occurrences: items.length,
      lastDate: latestItem.dateObj,
      nextExpectedDate: nextExpected,
      isVariableAmount,
      categoryId: latestItem.categoryId,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
