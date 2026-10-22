import { describe, it, expect } from 'vitest';
import { detectRecurringPayments } from '../../src/lib/domain/recurring';

describe('Recurring Payment & Subscription Cadence Detection', () => {
  it('detects a monthly subscription occurring across consecutive months', () => {
    const transactions = [
      {
        id: '1',
        normalizedMerchant: 'Netflix',
        amount: '649.00',
        date: new Date('2026-08-15'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
        categoryId: 'subscriptions',
      },
      {
        id: '2',
        normalizedMerchant: 'Netflix',
        amount: '649.00',
        date: new Date('2026-09-15'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
        categoryId: 'subscriptions',
      },
      {
        id: '3',
        normalizedMerchant: 'Netflix',
        amount: '649.00',
        date: new Date('2026-10-15'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
        categoryId: 'subscriptions',
      },
    ];

    const detected = detectRecurringPayments(transactions);
    expect(detected).toHaveLength(1);
    expect(detected[0].merchantName).toBe('Netflix');
    expect(detected[0].frequency).toBe('MONTHLY');
    expect(detected[0].occurrences).toBe(3);
    expect(detected[0].confidence).toBeGreaterThanOrEqual(0.9);
    expect(detected[0].isVariableAmount).toBe(false);

    // Next expected date should be ~30 days after Oct 15 -> ~Nov 14
    const nextExpected = detected[0].nextExpectedDate;
    expect(nextExpected.getMonth()).toBe(10); // November (0-indexed 10)
  });

  it('detects recurring utility bills with variable amounts', () => {
    const transactions = [
      {
        id: '1',
        normalizedMerchant: 'BESCOM Electricity',
        amount: '1850.00',
        date: new Date('2026-08-05'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
      },
      {
        id: '2',
        normalizedMerchant: 'BESCOM Electricity',
        amount: '2100.00',
        date: new Date('2026-09-05'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
      },
      {
        id: '3',
        normalizedMerchant: 'BESCOM Electricity',
        amount: '1940.00',
        date: new Date('2026-10-05'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
      },
    ];

    const detected = detectRecurringPayments(transactions);
    expect(detected).toHaveLength(1);
    expect(detected[0].merchantName).toBe('BESCOM Electricity');
    expect(detected[0].frequency).toBe('MONTHLY');
    expect(detected[0].isVariableAmount).toBe(true);
  });

  it('ignores one-off transactions that do not form a repeating cadence', () => {
    const transactions = [
      {
        id: '1',
        normalizedMerchant: 'Zara',
        amount: '4500.00',
        date: new Date('2026-10-02'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
      },
      {
        id: '2',
        normalizedMerchant: 'IKEA',
        amount: '12000.00',
        date: new Date('2026-10-10'),
        status: 'COMPLETED',
        direction: 'DEBIT',
        type: 'EXPENSE',
      },
    ];

    const detected = detectRecurringPayments(transactions);
    expect(detected).toHaveLength(0);
  });
});
