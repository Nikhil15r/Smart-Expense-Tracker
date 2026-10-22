import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  toDecimal,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateCashFlowSummary,
  calculateSpendingByCategory,
  calculateSpendingByMerchant,
  generateTransactionFingerprint,
  TransactionSummaryInput,
} from '../../src/lib/domain/ledger';

describe('Financial Ledger Domain Logic', () => {
  it('handles exact decimal arithmetic without floating point drift', () => {
    // In IEEE 754 float: 0.1 + 0.2 = 0.30000000000000004
    const a = toDecimal('0.10');
    const b = toDecimal('0.20');
    expect(a.plus(b).toString()).toBe('0.3');
    expect(a.plus(b).toFixed(2)).toBe('0.30');
  });

  it('calculates total income strictly from completed, non-transfer credits', () => {
    const transactions: TransactionSummaryInput[] = [
      {
        id: '1',
        accountId: 'acc-1',
        amount: '125000.00',
        direction: 'CREDIT',
        status: 'COMPLETED',
        type: 'INCOME',
        isTransfer: false,
        date: new Date('2026-10-01'),
      },
      {
        id: '2',
        accountId: 'acc-1',
        amount: '10000.00',
        direction: 'CREDIT',
        status: 'COMPLETED',
        type: 'TRANSFER', // Transfer from another account
        isTransfer: true,
        date: new Date('2026-10-05'),
      },
      {
        id: '3',
        accountId: 'acc-1',
        amount: '5000.00',
        direction: 'CREDIT',
        status: 'PENDING', // Not yet settled
        type: 'INCOME',
        isTransfer: false,
        date: new Date('2026-10-10'),
      },
    ];

    const income = calculateTotalIncome(transactions);
    expect(income.toFixed(2)).toBe('125000.00');
  });

  it('enforces refund netting: refunds subtract from expenses, never added to income', () => {
    const transactions: TransactionSummaryInput[] = [
      {
        id: '1',
        accountId: 'acc-1',
        amount: '4500.00', // Spent on electronics
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-02'),
        categoryId: 'shopping',
      },
      {
        id: '2',
        accountId: 'acc-1',
        amount: '1200.00', // Returned an item, got refund
        direction: 'CREDIT',
        status: 'COMPLETED',
        type: 'REFUND',
        isTransfer: false,
        date: new Date('2026-10-05'),
        categoryId: 'shopping',
      },
    ];

    const expenses = calculateTotalExpenses(transactions);
    // Net expense should be 4500 - 1200 = 3300.00
    expect(expenses.toFixed(2)).toBe('3300.00');

    // Income should be 0 (refund is not income)
    const income = calculateTotalIncome(transactions);
    expect(income.toFixed(2)).toBe('0.00');
  });

  it('excludes inter-account transfers from expenses and income', () => {
    const transactions: TransactionSummaryInput[] = [
      {
        id: '1',
        accountId: 'checking',
        amount: '20000.00', // Paying credit card bill
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'TRANSFER',
        isTransfer: true,
        date: new Date('2026-10-04'),
      },
      {
        id: '2',
        accountId: 'credit_card',
        amount: '20000.00', // Credit card receiving payment
        direction: 'CREDIT',
        status: 'COMPLETED',
        type: 'TRANSFER',
        isTransfer: true,
        date: new Date('2026-10-04'),
      },
      {
        id: '3',
        accountId: 'checking',
        amount: '350.00', // Regular coffee expense
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-04'),
      },
    ];

    const summary = calculateCashFlowSummary(transactions);
    expect(summary.totalIncome.toFixed(2)).toBe('0.00');
    expect(summary.totalExpenses.toFixed(2)).toBe('350.00');
    expect(summary.totalTransfers.toFixed(2)).toBe('40000.00');
    expect(summary.netCashFlow.toFixed(2)).toBe('-350.00');
  });

  it('keeps pending debits isolated from completed expenditures', () => {
    const transactions: TransactionSummaryInput[] = [
      {
        id: '1',
        accountId: 'acc-1',
        amount: '1500.00',
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-01'),
      },
      {
        id: '2',
        accountId: 'acc-1',
        amount: '2800.00',
        direction: 'DEBIT',
        status: 'PENDING',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-02'),
      },
    ];

    const summary = calculateCashFlowSummary(transactions);
    expect(summary.totalExpenses.toFixed(2)).toBe('1500.00');
    expect(summary.pendingExpenses.toFixed(2)).toBe('2800.00');
  });

  it('generates deterministic SHA-256 fingerprints for deduplication', () => {
    const fp1 = generateTransactionFingerprint('acc-1', '2026-10-15', '450.50', 'Swiggy Bangalore IN');
    const fp2 = generateTransactionFingerprint('acc-1', new Date('2026-10-15T14:30:00Z'), 450.5, 'swiggy bangalore in');
    const fp3 = generateTransactionFingerprint('acc-1', '2026-10-15', '450.50', 'Zomato Bangalore IN');

    expect(fp1).toBe(fp2); // identical normalized values produce identical hash
    expect(fp1).not.toBe(fp3); // different merchant produces different hash
  });

  it('aggregates category spending and calculates exact percentages', () => {
    const transactions: TransactionSummaryInput[] = [
      {
        id: '1',
        accountId: 'acc-1',
        amount: '600.00',
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-01'),
        categoryId: 'food',
      },
      {
        id: '2',
        accountId: 'acc-1',
        amount: '400.00',
        direction: 'DEBIT',
        status: 'COMPLETED',
        type: 'EXPENSE',
        isTransfer: false,
        date: new Date('2026-10-02'),
        categoryId: 'transport',
      },
    ];

    const breakdown = calculateSpendingByCategory(transactions, {
      food: 'Food & Dining',
      transport: 'Transportation',
    });

    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].categoryName).toBe('Food & Dining');
    expect(breakdown[0].amount.toFixed(2)).toBe('600.00');
    expect(breakdown[0].percentage).toBe(60.0);

    expect(breakdown[1].categoryName).toBe('Transportation');
    expect(breakdown[1].amount.toFixed(2)).toBe('400.00');
    expect(breakdown[1].percentage).toBe(40.0);
  });
});
