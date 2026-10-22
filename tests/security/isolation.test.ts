import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../../src/lib/storage';
import { sanitizeForSpreadsheet, assertUserOwnership } from '../../src/lib/security';

describe('Security & Multi-Tenant Isolation Tests', () => {
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    // Register two distinct users
    const emailA = `alice_${Date.now()}@example.com`;
    const emailB = `bob_${Date.now()}@example.com`;

    const userA = await StorageService.createUser({
      email: emailA,
      password: 'AlicePassword123!',
      name: 'Alice Smith',
    });
    userAId = userA.id;

    const userB = await StorageService.createUser({
      email: emailB,
      password: 'BobPassword123!',
      name: 'Bob Jones',
    });
    userBId = userB.id;
  });

  it('guarantees tenant isolation: User B cannot view User A transactions', async () => {
    // User A has seeded transactions
    const { transactions: userATxs } = await StorageService.getTransactions(userAId);
    expect(userATxs.length).toBeGreaterThan(0);

    // User B querying transactions only sees User B's transactions
    const { transactions: userBTxs } = await StorageService.getTransactions(userBId);
    expect(userBTxs.length).toBeGreaterThan(0);

    // Assert zero overlap between transactions
    const userAIds = new Set(userATxs.map((t) => t.id));
    for (const bTx of userBTxs) {
      expect(userAIds.has(bTx.id)).toBe(false);
      expect(bTx.userId).toBe(userBId);
      expect(bTx.userId).not.toBe(userAId);
    }
  });

  it('guarantees tenant isolation: User B cannot access User A accounts', async () => {
    const userAAccounts = await StorageService.getAccounts(userAId);
    const userBAccounts = await StorageService.getAccounts(userBId);

    expect(userAAccounts.length).toBeGreaterThan(0);
    expect(userBAccounts.length).toBeGreaterThan(0);

    // Directly attempting to fetch User A account with User B ID must return null
    const forbiddenFetch = await StorageService.getAccountById(userBId, userAAccounts[0].id);
    expect(forbiddenFetch).toBeNull();
  });

  it('assertUserOwnership throws 403 Forbidden on cross-user resource access', () => {
    expect(() => {
      assertUserOwnership(userAId, userBId, 'Transaction');
    }).toThrow(/Forbidden/);
  });

  it('sanitizes dangerous formulas in CSV exports to prevent CSV Injection (CWE-1236)', () => {
    // Malicious spreadsheet commands starting with =, +, -, @
    expect(sanitizeForSpreadsheet('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeForSpreadsheet('+123456789')).toBe("'+123456789");
    expect(sanitizeForSpreadsheet('-CMD|...')).toBe("'-CMD|...");
    expect(sanitizeForSpreadsheet('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)");
    expect(sanitizeForSpreadsheet('@SUM(1,2)')).toBe("\"'@SUM(1,2)\"");

    // Normal values pass through safely
    expect(sanitizeForSpreadsheet('Swiggy Order #481')).toBe('Swiggy Order #481');
    expect(sanitizeForSpreadsheet('12450.00')).toBe('12450.00');
  });

  it('verifies that full account purge wipes all user-owned financial records', async () => {
    const { transactions: beforeTxs } = await StorageService.getTransactions(userAId);
    expect(beforeTxs.length).toBeGreaterThan(0);

    await StorageService.purgeUserData(userAId);

    const user = await StorageService.findUserById(userAId);
    expect(user).toBeNull();

    const { transactions: afterTxs } = await StorageService.getTransactions(userAId);
    expect(afterTxs).toHaveLength(0);

    const accounts = await StorageService.getAccounts(userAId);
    expect(accounts).toHaveLength(0);
  });
});
