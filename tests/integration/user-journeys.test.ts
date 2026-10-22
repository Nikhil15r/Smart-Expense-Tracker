import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../src/lib/storage';
import { MockBankDataProvider } from '../../src/lib/bank/mock-provider';
import { calculateCashFlowSummary, toDecimal } from '../../src/lib/domain/ledger';

describe('Comprehensive End-to-End User Journeys & Financial Flows', () => {
  let userId: string;

  beforeEach(async () => {
    // Journey Step 1: User Registration
    const user = await StorageService.createUser({
      email: `user_journey_${Date.now()}@smartfinance.in`,
      password: 'SecurePassword2026!',
      name: 'Nikhil Journey Tester',
      currency: 'INR',
    });
    userId = user.id;
  });

  it('Journey 1-5: User logs in, explores pre-seeded accounts, and checks dashboard ledger', async () => {
    // Verify accounts were seeded
    const accounts = await StorageService.getAccounts(userId);
    expect(accounts.length).toBeGreaterThanOrEqual(2);

    const hdfc = accounts.find((a) => a.name.includes('HDFC'));
    expect(hdfc).toBeDefined();

    // Verify transactions exist
    const { transactions, total } = await StorageService.getTransactions(userId);
    expect(total).toBeGreaterThan(10);

    // Verify financial correctness: Income, expenses, transfers excluded
    const cashFlow = calculateCashFlowSummary(transactions as any);
    expect(cashFlow.totalIncome.toNumber()).toBeGreaterThan(100000);
    expect(cashFlow.totalExpenses.toNumber()).toBeGreaterThan(10000);
    expect(cashFlow.totalTransfers.toNumber()).toBeGreaterThan(0);
  });

  it('Journey 6-7: Creates a budget and verifies threshold notification is dispatched upon spending', async () => {
    // Create a ₹3,000 budget for entertainment/other
    const budget = await StorageService.createBudget(userId, {
      categoryId: 'entertainment',
      amount: '3000.00',
      period: 'MONTHLY',
      startDate: new Date().toISOString(),
      rollover: false,
      alertThresholds: [50, 75, 90, 100],
      lastAlertedThreshold: null,
    });
    expect(budget.id).toBeDefined();

    const accounts = await StorageService.getAccounts(userId);
    const accId = accounts[0].id;

    // Ingest transaction spending ₹2,800 (which is 93% of the ₹3,000 budget)
    await StorageService.createTransaction(userId, {
      accountId: accId,
      amount: '2800.00',
      direction: 'DEBIT',
      date: new Date().toISOString(),
      originalDescription: 'PVR INOX CINEMAS IMAX TICKETS',
      categoryId: 'entertainment',
    });

    // Check that an in-app notification was dispatched for crossing the 90% threshold
    const { notifications } = await StorageService.getNotifications(userId);
    const thresholdAlert = notifications.find(
      (n) => n.type === 'BUDGET_THRESHOLD' && n.message.includes('entertainment')
    );
    expect(thresholdAlert).toBeDefined();
    expect(thresholdAlert?.title).toContain('Budget Alert');
  });

  it('Journey 8: Filters transactions and updates categorization', async () => {
    const { transactions: foodTxs } = await StorageService.getTransactions(userId, {
      categoryId: 'food-and-dining',
    });
    expect(foodTxs.length).toBeGreaterThan(0);

    // Re-categorize the first transaction to 'business-expenses'
    const targetTx = foodTxs[0];
    const updated = await StorageService.updateTransaction(userId, targetTx.id, {
      categoryId: 'other',
      notes: 'Client dinner meeting expense',
      isReviewed: true,
    });

    expect(updated).toBeDefined();
    expect(updated?.categoryId).toBe('other');
    expect(updated?.notes).toBe('Client dinner meeting expense');
    expect(updated?.isReviewed).toBe(true);
  });

  it('Journey 9-10: Simulates bank-provider failure, retries with mock sync, and checks idempotency', async () => {
    const provider = new MockBankDataProvider({ simulateErrors: true });

    // Verify provider failure injection throws appropriate recoverable error
    await expect(provider.fetchSyncBatch('mock_consent_HDFC_123')).rejects.toThrow(
      /Simulated Provider Error/
    );

    // Switch off error simulation and retry
    provider.setSimulateErrors(false);
    const batch = await provider.fetchSyncBatch('mock_consent_HDFC_123');
    expect(batch.accounts.length).toBeGreaterThan(0);
    expect(batch.transactions.length).toBeGreaterThan(0);

    // Ingest transactions and verify deduplication
    const { total: initialTotal } = await StorageService.getTransactions(userId);
    const accounts = await StorageService.getAccounts(userId);
    const accId = accounts[0].id;

    // Create a brand new distinct transaction
    const newTxDesc = `Unique Vendor Invoice ${Date.now()}`;
    await StorageService.createTransaction(userId, {
      accountId: accId,
      amount: '750.00',
      direction: 'DEBIT',
      date: new Date().toISOString(),
      originalDescription: newTxDesc,
      source: 'BANK_SYNC',
    });

    const { total: afterFirstInsert } = await StorageService.getTransactions(userId);
    expect(afterFirstInsert).toBe(initialTotal + 1);

    // Ingest the EXACT same transaction again -> must be deduplicated by SHA-256 fingerprint
    const dupe = await StorageService.createTransaction(userId, {
      accountId: accId,
      amount: '750.00',
      direction: 'DEBIT',
      date: new Date().toISOString(),
      originalDescription: newTxDesc,
      source: 'BANK_SYNC',
    });

    const { total: finalTotal } = await StorageService.getTransactions(userId);
    // Duplicate transaction must not increment total count
    expect(finalTotal).toBe(afterFirstInsert);
  });
});
