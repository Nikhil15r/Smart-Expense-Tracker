import { Decimal } from 'decimal.js';
import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from './auth';
import { generateTransactionFingerprint, toDecimal } from './domain/ledger';
import { normalizeMerchant, categorizeTransaction } from './domain/categorizer';
import { detectRecurringPayments } from './domain/recurring';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  currency: string;
  phone?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  mfaEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountRecord {
  id: string;
  userId: string;
  bankConnectionId?: string | null;
  name: string;
  officialName?: string | null;
  type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH' | 'LOAN';
  accountNumberMasked?: string | null;
  currency: string;
  currentBalance: string;
  availableBalance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  accountId: string;
  providerTransactionId?: string | null;
  fingerprint: string;
  amount: string; // decimal string
  currency: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REFUNDED' | 'CANCELLED';
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND';
  date: string;
  bookingDate?: string | null;
  originalDescription: string;
  normalizedMerchant: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  aiConfidence: number;
  isReviewed: boolean;
  isTransfer: boolean;
  linkedTransactionId?: string | null;
  notes?: string | null;
  tags: string[];
  source: 'BANK_SYNC' | 'CSV_IMPORT' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRecord {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  period: 'MONTHLY' | 'CUSTOM';
  startDate: string;
  endDate?: string | null;
  rollover: boolean;
  alertThresholds: number[];
  lastAlertedThreshold?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPaymentRecord {
  id: string;
  userId: string;
  accountId: string;
  merchantName: string;
  amount: string;
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  status: 'DETECTED' | 'CONFIRMED' | 'DISMISSED';
  lastDate: string;
  nextExpectedDate: string;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalRecord {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  color?: string | null;
  icon?: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'BUDGET_THRESHOLD' | 'SYNC_FAILURE' | 'RECURRING_DUE' | 'ANOMALY' | 'SYSTEM';
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MerchantRuleRecord {
  id: string;
  userId: string;
  pattern: string;
  normalizedName: string;
  categoryId: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  userId: string;
  action: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details: Record<string, any>;
  createdAt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  budgets: BudgetRecord[];
  recurringPayments: RecurringPaymentRecord[];
  savingsGoals: SavingsGoalRecord[];
  notifications: NotificationRecord[];
  merchantRules: MerchantRuleRecord[];
  auditEvents: AuditEventRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Thread-safe in-process cache with persistent file flush
let dbCache: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDB(): DatabaseSchema {
  if (dbCache) return dbCache;

  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(content);
      return dbCache!;
    } catch {
      // If corrupted or empty, reset
    }
  }

  dbCache = {
    users: [],
    accounts: [],
    transactions: [],
    budgets: [],
    recurringPayments: [],
    savingsGoals: [],
    notifications: [],
    merchantRules: [],
    auditEvents: [],
  };

  saveDB();
  return dbCache;
}

function saveDB() {
  if (!dbCache) return;
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
}

/**
 * Storage Service providing strict tenant-isolated queries and mutations.
 */
export const StorageService = {
  // --- USERS ---
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const db = loadDB();
    const cleanEmail = email.trim().toLowerCase();
    return db.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  },

  async findUserById(userId: string): Promise<UserRecord | null> {
    const db = loadDB();
    return db.users.find((u) => u.id === userId) || null;
  },

  async createUser(data: { email: string; password: string; name: string; currency?: string }): Promise<UserRecord> {
    const db = loadDB();
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(data.password);
    const user: UserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      passwordHash,
      name: data.name.trim(),
      currency: data.currency || 'INR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(user);
    saveDB();

    // Initialize user with standard default categories, sample accounts & budgets
    await this.seedNewUserData(user.id);
    return user;
  },

  async updateUserProfile(
    userId: string,
    updates: { name?: string; currency?: string; phone?: string | null }
  ): Promise<UserRecord | null> {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;

    if (updates.name) user.name = updates.name.trim();
    if (updates.currency) user.currency = updates.currency.toUpperCase();
    if (updates.phone !== undefined) user.phone = updates.phone ? updates.phone.trim() : null;

    user.updatedAt = new Date().toISOString();
    saveDB();
    return user;
  },

  async updateUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    user.passwordHash = await hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    saveDB();
    return true;
  },

  async findOrCreateGoogleUser(googleUser: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string | null;
  }): Promise<UserRecord> {
    const db = loadDB();
    const cleanEmail = googleUser.email.trim().toLowerCase();
    let user = db.users.find(
      (u) => u.email.toLowerCase() === cleanEmail || (u.googleId && u.googleId === googleUser.googleId)
    );

    if (user) {
      if (!user.googleId) user.googleId = googleUser.googleId;
      if (googleUser.avatarUrl && !user.avatarUrl) user.avatarUrl = googleUser.avatarUrl;
      user.updatedAt = new Date().toISOString();
      saveDB();
      return user;
    }

    const passwordHash = await hashPassword(`google-oauth-${Date.now()}-${Math.random()}`);
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      passwordHash,
      name: googleUser.name.trim() || 'Google User',
      currency: 'INR',
      googleId: googleUser.googleId,
      avatarUrl: googleUser.avatarUrl || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(user);
    saveDB();

    await this.seedNewUserData(user.id);
    return user;
  },

  // --- ACCOUNTS (Strictly scoped to userId) ---
  async getAccounts(userId: string): Promise<AccountRecord[]> {
    const db = loadDB();
    return db.accounts.filter((a) => a.userId === userId && a.isActive);
  },

  async getAccountById(userId: string, accountId: string): Promise<AccountRecord | null> {
    const db = loadDB();
    return db.accounts.find((a) => a.userId === userId && a.id === accountId) || null;
  },

  async createAccount(userId: string, account: Omit<AccountRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<AccountRecord> {
    const db = loadDB();
    const record: AccountRecord = {
      ...account,
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.accounts.push(record);
    saveDB();
    return record;
  },

  async updateAccountBalance(userId: string, accountId: string, currentBalance: string | Decimal, availableBalance?: string | Decimal): Promise<AccountRecord | null> {
    const db = loadDB();
    const acc = db.accounts.find((a) => a.userId === userId && a.id === accountId);
    if (!acc) return null;

    acc.currentBalance = toDecimal(currentBalance).toFixed(2);
    if (availableBalance !== undefined) {
      acc.availableBalance = toDecimal(availableBalance).toFixed(2);
    }
    acc.updatedAt = new Date().toISOString();
    saveDB();
    return acc;
  },

  async deleteAccount(userId: string, accountId: string): Promise<boolean> {
    const db = loadDB();
    const accIndex = db.accounts.findIndex((a) => a.userId === userId && a.id === accountId);
    if (accIndex === -1) return false;

    db.accounts.splice(accIndex, 1);
    db.transactions = db.transactions.filter((t) => !(t.userId === userId && t.accountId === accountId));
    saveDB();
    return true;
  },

  // --- TRANSACTIONS (Strictly scoped to userId) ---
  async getTransactions(
    userId: string,
    filters?: {
      accountId?: string;
      search?: string;
      categoryId?: string;
      direction?: 'DEBIT' | 'CREDIT';
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: TransactionRecord[]; total: number }> {
    const db = loadDB();
    let records = db.transactions.filter((t) => t.userId === userId);

    if (filters?.accountId) {
      records = records.filter((t) => t.accountId === filters.accountId);
    }
    if (filters?.categoryId) {
      records = records.filter((t) => t.categoryId === filters.categoryId || t.subcategoryId === filters.categoryId);
    }
    if (filters?.direction) {
      records = records.filter((t) => t.direction === filters.direction);
    }
    if (filters?.status) {
      records = records.filter((t) => t.status === filters.status);
    }
    if (filters?.startDate) {
      records = records.filter((t) => new Date(t.date) >= new Date(filters.startDate!));
    }
    if (filters?.endDate) {
      records = records.filter((t) => new Date(t.date) <= new Date(filters.endDate!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      records = records.filter(
        (t) =>
          t.originalDescription.toLowerCase().includes(q) ||
          t.normalizedMerchant.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q)
      );
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = records.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    const paginated = records.slice(offset, offset + limit);

    return { transactions: paginated, total };
  },

  async createTransaction(
    userId: string,
    txData: {
      accountId: string;
      amount: string | number | Decimal;
      currency?: string;
      direction: 'DEBIT' | 'CREDIT';
      status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REFUNDED' | 'CANCELLED';
      type?: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND';
      date: string | Date;
      originalDescription: string;
      categoryId?: string | null;
      subcategoryId?: string | null;
      notes?: string | null;
      tags?: string[];
      source?: 'BANK_SYNC' | 'CSV_IMPORT' | 'MANUAL';
    }
  ): Promise<TransactionRecord> {
    const db = loadDB();
    const dateStr = typeof txData.date === 'string' ? txData.date : txData.date.toISOString();
    const amtDec = toDecimal(txData.amount);
    const fingerprint = generateTransactionFingerprint(txData.accountId, dateStr, amtDec, txData.originalDescription);

    // Deduplication check
    const existing = db.transactions.find((t) => t.userId === userId && t.fingerprint === fingerprint);
    if (existing) {
      return existing; // idempotent return
    }

    // Categorization
    const userRules = (db.merchantRules || [])
      .filter((r) => r.userId === userId && r.isActive)
      .map((r) => ({
        pattern: r.pattern,
        normalizedName: r.normalizedName,
        categorySlug: r.categoryId,
      }));
    const catResult = categorizeTransaction(
      txData.originalDescription,
      userRules,
      amtDec.toNumber(),
      txData.direction
    );

    const normMerchant = normalizeMerchant(txData.originalDescription);

    // Determine type
    let determinedType: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND' = txData.type || (txData.direction === 'CREDIT' ? 'INCOME' : 'EXPENSE');
    if (catResult.subcategorySlug === 'refunds') determinedType = 'REFUND';

    const newRecord: TransactionRecord = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      accountId: txData.accountId,
      fingerprint,
      amount: amtDec.toFixed(2),
      currency: txData.currency || 'INR',
      direction: txData.direction,
      status: txData.status || 'COMPLETED',
      type: determinedType,
      date: dateStr,
      originalDescription: txData.originalDescription,
      normalizedMerchant: normMerchant,
      categoryId: txData.categoryId || catResult.categorySlug,
      subcategoryId: txData.subcategoryId || catResult.subcategorySlug,
      aiConfidence: catResult.confidence,
      isReviewed: Boolean(txData.categoryId),
      isTransfer: determinedType === 'TRANSFER',
      notes: txData.notes || null,
      tags: txData.tags || [],
      source: txData.source || 'MANUAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.transactions.push(newRecord);

    // Update account balance
    const acc = db.accounts.find((a) => a.userId === userId && a.id === txData.accountId);
    if (acc && newRecord.status === 'COMPLETED') {
      const curBal = toDecimal(acc.currentBalance);
      const newBal = newRecord.direction === 'CREDIT' ? curBal.plus(amtDec) : curBal.minus(amtDec);
      acc.currentBalance = newBal.toFixed(2);
      acc.availableBalance = newBal.toFixed(2);
      acc.updatedAt = new Date().toISOString();
    }

    saveDB();

    // Check budget thresholds
    if (newRecord.categoryId && newRecord.direction === 'DEBIT' && newRecord.status === 'COMPLETED') {
      await this.evaluateBudgetThresholds(userId, newRecord.categoryId);
    }

    return newRecord;
  },

  async updateTransaction(
    userId: string,
    transactionId: string,
    updates: {
      categoryId?: string | null;
      subcategoryId?: string | null;
      notes?: string | null;
      tags?: string[];
      isReviewed?: boolean;
      amount?: string | number | Decimal;
      originalDescription?: string;
      date?: string;
      direction?: 'DEBIT' | 'CREDIT';
    }
  ): Promise<TransactionRecord | null> {
    const db = loadDB();
    const tx = db.transactions.find((t) => t.userId === userId && t.id === transactionId);
    if (!tx) return null;

    if (updates.categoryId !== undefined) tx.categoryId = updates.categoryId;
    if (updates.subcategoryId !== undefined) tx.subcategoryId = updates.subcategoryId;
    if (updates.notes !== undefined) tx.notes = updates.notes;
    if (updates.tags !== undefined) tx.tags = updates.tags;
    if (updates.isReviewed !== undefined) tx.isReviewed = updates.isReviewed;
    if (updates.amount !== undefined) tx.amount = toDecimal(updates.amount).toFixed(2);
    if (updates.originalDescription !== undefined) {
      tx.originalDescription = updates.originalDescription;
      tx.normalizedMerchant = normalizeMerchant(updates.originalDescription);
    }
    if (updates.date !== undefined) tx.date = updates.date;
    if (updates.direction !== undefined) tx.direction = updates.direction;

    tx.updatedAt = new Date().toISOString();
    saveDB();
    return tx;
  },

  async deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const db = loadDB();
    const txIndex = db.transactions.findIndex((t) => t.userId === userId && t.id === transactionId);
    if (txIndex === -1) return false;

    const tx = db.transactions[txIndex];
    const acc = db.accounts.find((a) => a.userId === userId && a.id === tx.accountId);
    if (acc && tx.status === 'COMPLETED') {
      const curBal = toDecimal(acc.currentBalance);
      const amt = toDecimal(tx.amount);
      const newBal = tx.direction === 'CREDIT' ? curBal.minus(amt) : curBal.plus(amt);
      acc.currentBalance = newBal.toFixed(2);
      acc.availableBalance = newBal.toFixed(2);
      acc.updatedAt = new Date().toISOString();
    }

    db.transactions.splice(txIndex, 1);
    saveDB();
    return true;
  },

  async bulkCategorize(
    userId: string,
    transactionIds: string[],
    categoryId: string,
    subcategoryId?: string
  ): Promise<number> {
    const db = loadDB();
    let count = 0;
    for (const tx of db.transactions) {
      if (tx.userId === userId && transactionIds.includes(tx.id)) {
        tx.categoryId = categoryId;
        if (subcategoryId !== undefined) tx.subcategoryId = subcategoryId;
        tx.isReviewed = true;
        tx.updatedAt = new Date().toISOString();
        count++;
      }
    }
    saveDB();
    return count;
  },

  // --- BUDGETS ---
  async getBudgets(userId: string): Promise<BudgetRecord[]> {
    const db = loadDB();
    return db.budgets.filter((b) => b.userId === userId);
  },

  async createBudget(userId: string, data: Omit<BudgetRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<BudgetRecord> {
    const db = loadDB();
    const record: BudgetRecord = {
      ...data,
      id: `bdg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.budgets.push(record);
    saveDB();
    return record;
  },

  async deleteBudget(userId: string, budgetId: string): Promise<boolean> {
    const db = loadDB();
    const idx = db.budgets.findIndex((b) => b.userId === userId && b.id === budgetId);
    if (idx === -1) return false;
    db.budgets.splice(idx, 1);
    saveDB();
    return true;
  },

  async evaluateBudgetThresholds(userId: string, categoryId: string): Promise<void> {
    const db = loadDB();
    const budget = db.budgets.find((b) => b.userId === userId && b.categoryId === categoryId);
    if (!budget) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const spent = db.transactions
      .filter(
        (t) =>
          t.userId === userId &&
          t.categoryId === categoryId &&
          t.direction === 'DEBIT' &&
          t.status === 'COMPLETED' &&
          !t.isTransfer &&
          t.date >= startOfMonth
      )
      .reduce((sum, t) => sum.plus(toDecimal(t.amount)), new Decimal(0));

    const limit = toDecimal(budget.amount);
    if (limit.isZero()) return;

    const utilizationPct = spent.dividedBy(limit).times(100).toNumber();

    for (const threshold of budget.alertThresholds) {
      if (utilizationPct >= threshold && (!budget.lastAlertedThreshold || budget.lastAlertedThreshold < threshold)) {
        // Create in-app notification
        db.notifications.push({
          id: `notif_${Date.now()}`,
          userId,
          type: 'BUDGET_THRESHOLD',
          title: `Budget Alert: ${threshold}% Reached`,
          message: `You have spent ₹${spent.toFixed(2)} (${Math.round(utilizationPct)}%) of your ₹${limit.toFixed(2)} monthly budget for ${categoryId}.`,
          link: '/budgets',
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        budget.lastAlertedThreshold = threshold;
        budget.updatedAt = new Date().toISOString();
        saveDB();
        break;
      }
    }
  },

  // --- RECURRING PAYMENTS ---
  async getRecurringPayments(userId: string): Promise<RecurringPaymentRecord[]> {
    const db = loadDB();
    return db.recurringPayments.filter((r) => r.userId === userId);
  },

  async refreshRecurringPayments(userId: string): Promise<RecurringPaymentRecord[]> {
    const db = loadDB();
    const userTxs = db.transactions.filter((t) => t.userId === userId);
    const candidates = detectRecurringPayments(userTxs);

    const existing = db.recurringPayments.filter((r) => r.userId === userId);
    for (const cand of candidates) {
      const match = existing.find((e) => e.merchantName.toLowerCase() === cand.merchantName.toLowerCase());
      if (match) {
        match.amount = cand.amount.toFixed(2);
        match.lastDate = cand.lastDate.toISOString();
        match.nextExpectedDate = cand.nextExpectedDate.toISOString();
        match.updatedAt = new Date().toISOString();
      } else {
        const defaultAcc = db.accounts.find((a) => a.userId === userId);
        db.recurringPayments.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          accountId: defaultAcc?.id || 'manual',
          merchantName: cand.merchantName,
          amount: cand.amount.toFixed(2),
          frequency: cand.frequency,
          status: 'DETECTED',
          lastDate: cand.lastDate.toISOString(),
          nextExpectedDate: cand.nextExpectedDate.toISOString(),
          categoryId: cand.categoryId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    saveDB();
    return db.recurringPayments.filter((r) => r.userId === userId);
  },

  // --- SAVINGS GOALS ---
  async getSavingsGoals(userId: string): Promise<SavingsGoalRecord[]> {
    const db = loadDB();
    return db.savingsGoals.filter((g) => g.userId === userId);
  },

  async createSavingsGoal(userId: string, goal: Omit<SavingsGoalRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavingsGoalRecord> {
    const db = loadDB();
    const record: SavingsGoalRecord = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.savingsGoals.push(record);
    saveDB();
    return record;
  },

  async updateSavingsGoal(userId: string, goalId: string, currentAmount: string | Decimal): Promise<SavingsGoalRecord | null> {
    const db = loadDB();
    const goal = db.savingsGoals.find((g) => g.userId === userId && g.id === goalId);
    if (!goal) return null;

    goal.currentAmount = toDecimal(currentAmount).toFixed(2);
    if (toDecimal(goal.currentAmount).gte(toDecimal(goal.targetAmount))) {
      goal.isCompleted = true;
    }
    goal.updatedAt = new Date().toISOString();
    saveDB();
    return goal;
  },

  async deleteSavingsGoal(userId: string, goalId: string): Promise<boolean> {
    const db = loadDB();
    const idx = db.savingsGoals.findIndex((g) => g.userId === userId && g.id === goalId);
    if (idx === -1) return false;
    db.savingsGoals.splice(idx, 1);
    saveDB();
    return true;
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> {
    const db = loadDB();
    const notifs = db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unreadCount = notifs.filter((n) => !n.isRead).length;
    return { notifications: notifs, unreadCount };
  },

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    const db = loadDB();
    const notif = db.notifications.find((n) => n.userId === userId && n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      saveDB();
    }
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const db = loadDB();
    for (const notif of db.notifications) {
      if (notif.userId === userId) notif.isRead = true;
    }
    saveDB();
  },

  // --- MERCHANT RULES ---
  async getMerchantRules(userId: string): Promise<MerchantRuleRecord[]> {
    const db = loadDB();
    return (db.merchantRules || []).filter((r) => r.userId === userId);
  },

  async createMerchantRule(userId: string, rule: Omit<MerchantRuleRecord, 'id' | 'userId' | 'createdAt'>): Promise<MerchantRuleRecord> {
    const db = loadDB();
    if (!db.merchantRules) db.merchantRules = [];
    const record: MerchantRuleRecord = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      createdAt: new Date().toISOString(),
    };
    db.merchantRules.push(record);
    saveDB();
    return record;
  },

  async deleteMerchantRule(userId: string, ruleId: string): Promise<void> {
    const db = loadDB();
    if (!db.merchantRules) return;
    db.merchantRules = db.merchantRules.filter((r) => !(r.userId === userId && r.id === ruleId));
    saveDB();
  },

  // --- DATA EXPORT & ACCOUNT PURGE (DPDP & GDPR Compliance) ---
  async exportAllUserData(userId: string): Promise<Record<string, any>> {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    return {
      user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
      accounts: db.accounts.filter((a) => a.userId === userId),
      transactions: db.transactions.filter((t) => t.userId === userId),
      budgets: db.budgets.filter((b) => b.userId === userId),
      recurringPayments: db.recurringPayments.filter((r) => r.userId === userId),
      savingsGoals: db.savingsGoals.filter((g) => g.userId === userId),
      merchantRules: (db.merchantRules || []).filter((r) => r.userId === userId),
      exportedAt: new Date().toISOString(),
    };
  },

  async purgeUserData(userId: string): Promise<void> {
    const db = loadDB();
    db.users = db.users.filter((u) => u.id !== userId);
    db.accounts = db.accounts.filter((a) => a.userId !== userId);
    db.transactions = db.transactions.filter((t) => t.userId !== userId);
    db.budgets = db.budgets.filter((b) => b.userId !== userId);
    db.recurringPayments = db.recurringPayments.filter((r) => r.userId !== userId);
    db.savingsGoals = db.savingsGoals.filter((g) => g.userId !== userId);
    db.notifications = db.notifications.filter((n) => n.userId !== userId);
    if (db.merchantRules) db.merchantRules = db.merchantRules.filter((r) => r.userId !== userId);
    saveDB();
  },

  // --- SEED INITIAL RICH DEMO DATA ---
  async seedNewUserData(userId: string): Promise<void> {
    const db = loadDB();

    // 1. Create Default Accounts (HDFC Bank Savings, ICICI Credit Card, Cash Wallet)
    const hdfcAcc: AccountRecord = {
      id: `acc_hdfc_${userId}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      name: 'HDFC Savings Account',
      officialName: 'HDFC Bank Regular Savings A/C',
      type: 'SAVINGS',
      accountNumberMasked: '•••• 9821',
      currency: 'INR',
      currentBalance: '142850.50',
      availableBalance: '142850.50',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const iciciCard: AccountRecord = {
      id: `acc_card_${userId}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      name: 'ICICI Sapphiro Credit Card',
      officialName: 'ICICI Bank Visa Infinite Card',
      type: 'CREDIT_CARD',
      accountNumberMasked: '•••• 4012',
      currency: 'INR',
      currentBalance: '24890.00',
      availableBalance: '375110.00',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const cashWallet: AccountRecord = {
      id: `acc_cash_${userId}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      name: 'Cash In Hand',
      officialName: 'Manual Cash Wallet',
      type: 'CASH',
      currency: 'INR',
      currentBalance: '8500.00',
      availableBalance: '8500.00',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.accounts.push(hdfcAcc, iciciCard, cashWallet);

    // 2. Generate Realistic Historical Transactions across 3 months
    const now = new Date();
    const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const sampleTxTemplates = [
      // Income
      { acc: hdfcAcc.id, desc: 'NEFT CR-TECHCORP LTD-SALARY-OCT2026', amt: '165000.00', dir: 'CREDIT', type: 'INCOME', days: 1, cat: 'other', sub: 'salary' },
      { acc: hdfcAcc.id, desc: 'NEFT CR-TECHCORP LTD-SALARY-SEP2026', amt: '165000.00', dir: 'CREDIT', type: 'INCOME', days: 31, cat: 'other', sub: 'salary' },
      { acc: hdfcAcc.id, desc: 'NEFT CR-TECHCORP LTD-SALARY-AUG2026', amt: '165000.00', dir: 'CREDIT', type: 'INCOME', days: 62, cat: 'other', sub: 'salary' },
      { acc: hdfcAcc.id, desc: 'INTEREST CREDIT SAVINGS A/C Q2', amt: '1420.00', dir: 'CREDIT', type: 'INCOME', days: 20, cat: 'financial', sub: 'interest' },

      // Utilities & Rent
      { acc: hdfcAcc.id, desc: 'UPI/4921004/NOBROKER RENT/OCT', amt: '32000.00', dir: 'DEBIT', type: 'EXPENSE', days: 2, cat: 'home-and-utilities', sub: 'rent' },
      { acc: hdfcAcc.id, desc: 'UPI/4921004/NOBROKER RENT/SEP', amt: '32000.00', dir: 'DEBIT', type: 'EXPENSE', days: 32, cat: 'home-and-utilities', sub: 'rent' },
      { acc: hdfcAcc.id, desc: 'UPI/9834112/BESCOM ELECTRICITY/PAYTM', amt: '2850.00', dir: 'DEBIT', type: 'EXPENSE', days: 4, cat: 'home-and-utilities', sub: 'electricity' },
      { acc: hdfcAcc.id, desc: 'ACH DR-ACT FIBERNET BROADBAND', amt: '1199.00', dir: 'DEBIT', type: 'EXPENSE', days: 6, cat: 'home-and-utilities', sub: 'internet' },
      { acc: hdfcAcc.id, desc: 'ACH DR-ACT FIBERNET BROADBAND', amt: '1199.00', dir: 'DEBIT', type: 'EXPENSE', days: 36, cat: 'home-and-utilities', sub: 'internet' },

      // Food & Dining
      { acc: iciciCard.id, desc: 'POS 942318 SWIGGY BANGALORE IN', amt: '849.00', dir: 'DEBIT', type: 'EXPENSE', days: 1, cat: 'food-and-dining', sub: 'swiggy' },
      { acc: iciciCard.id, desc: 'POS 882190 ZOMATO RESTAURANT GURGAON', amt: '1240.00', dir: 'DEBIT', type: 'EXPENSE', days: 3, cat: 'food-and-dining', sub: 'zomato' },
      { acc: iciciCard.id, desc: 'POS 192840 STARBUCKS COFFEE KORAMANGALA', amt: '480.00', dir: 'DEBIT', type: 'EXPENSE', days: 5, cat: 'food-and-dining', sub: 'cafes-and-coffee' },
      { acc: iciciCard.id, desc: 'POS 994102 DOMINOS PIZZA INDIRANAGAR', amt: '920.00', dir: 'DEBIT', type: 'EXPENSE', days: 9, cat: 'food-and-dining', sub: 'food-delivery' },

      // Groceries
      { acc: iciciCard.id, desc: 'POS 774120 BLINKIT COMMERCE GURGAON', amt: '1499.00', dir: 'DEBIT', type: 'EXPENSE', days: 2, cat: 'groceries-and-household', sub: 'blinkit' },
      { acc: iciciCard.id, desc: 'ZEPTO QUICK COMMERCE BANGALORE', amt: '890.00', dir: 'DEBIT', type: 'EXPENSE', days: 4, cat: 'groceries-and-household', sub: 'zepto' },
      { acc: iciciCard.id, desc: 'DMART SUPERMARKET BTM LAYOUT', amt: '4820.00', dir: 'DEBIT', type: 'EXPENSE', days: 12, cat: 'groceries-and-household', sub: 'grocery-stores' },

      // Transportation
      { acc: iciciCard.id, desc: 'UPI/221940/UBER INDIA TECHNOLOGY', amt: '480.00', dir: 'DEBIT', type: 'EXPENSE', days: 1, cat: 'transportation', sub: 'cabs' },
      { acc: iciciCard.id, desc: 'UPI/772190/INDIAN OIL PETROL PUMP', amt: '2200.00', dir: 'DEBIT', type: 'EXPENSE', days: 5, cat: 'transportation', sub: 'fuel' },
      { acc: iciciCard.id, desc: 'IRCTC WEB TICKETING NEW DELHI', amt: '1850.00', dir: 'DEBIT', type: 'EXPENSE', days: 15, cat: 'transportation', sub: 'train-tickets' },

      // Subscriptions
      { acc: iciciCard.id, desc: 'NETFLIX ENTERTAINMENT SERVICES IN', amt: '649.00', dir: 'DEBIT', type: 'EXPENSE', days: 14, cat: 'other', sub: 'subscriptions' },
      { acc: iciciCard.id, desc: 'NETFLIX ENTERTAINMENT SERVICES IN', amt: '649.00', dir: 'DEBIT', type: 'EXPENSE', days: 44, cat: 'other', sub: 'subscriptions' },
      { acc: iciciCard.id, desc: 'SPOTIFY INDIA SUBSCRIPTION MUMBAI', amt: '119.00', dir: 'DEBIT', type: 'EXPENSE', days: 10, cat: 'other', sub: 'subscriptions' },
      { acc: iciciCard.id, desc: 'SPOTIFY INDIA SUBSCRIPTION MUMBAI', amt: '119.00', dir: 'DEBIT', type: 'EXPENSE', days: 40, cat: 'other', sub: 'subscriptions' },

      // Shopping & Refund
      { acc: iciciCard.id, desc: 'AMAZON PAY INDIA PVT LTD BANGALORE', amt: '5499.00', dir: 'DEBIT', type: 'EXPENSE', days: 7, cat: 'shopping', sub: 'online-shopping' },
      { acc: iciciCard.id, desc: 'REFUND AMAZON PAY RETURN IN', amt: '1200.00', dir: 'CREDIT', type: 'REFUND', days: 9, cat: 'shopping', sub: 'online-shopping' },

      // Transfers between checking and card
      { acc: hdfcAcc.id, desc: 'IMPS-CRED CC BILL PAYMENT-ICICI CARD', amt: '25000.00', dir: 'DEBIT', type: 'TRANSFER', days: 8, cat: 'financial', sub: 'credit-card-payments' },
    ];

    for (const item of sampleTxTemplates) {
      const dateStr = d(item.days);
      const amtDec = toDecimal(item.amt);
      const fp = generateTransactionFingerprint(item.acc, dateStr, amtDec, item.desc);
      const isTrans = item.type === 'TRANSFER';

      db.transactions.push({
        id: `tx_seed_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        accountId: item.acc,
        fingerprint: fp,
        amount: amtDec.toFixed(2),
        currency: 'INR',
        direction: item.dir as any,
        status: 'COMPLETED',
        type: item.type as any,
        date: dateStr,
        originalDescription: item.desc,
        normalizedMerchant: normalizeMerchant(item.desc),
        categoryId: item.cat,
        subcategoryId: item.sub,
        aiConfidence: 0.95,
        isReviewed: true,
        isTransfer: isTrans,
        notes: null,
        tags: [],
        source: 'BANK_SYNC',
        createdAt: dateStr,
        updatedAt: dateStr,
      });
    }

    // 3. Budgets
    db.budgets.push(
      {
        id: `bdg_${userId}_food`,
        userId,
        categoryId: 'food-and-dining',
        amount: '12000.00',
        period: 'MONTHLY',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        rollover: false,
        alertThresholds: [50, 75, 90, 100],
        lastAlertedThreshold: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `bdg_${userId}_groceries`,
        userId,
        categoryId: 'groceries-and-household',
        amount: '15000.00',
        period: 'MONTHLY',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        rollover: false,
        alertThresholds: [50, 75, 90, 100],
        lastAlertedThreshold: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `bdg_${userId}_transport`,
        userId,
        categoryId: 'transportation',
        amount: '8000.00',
        period: 'MONTHLY',
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        rollover: false,
        alertThresholds: [50, 75, 90, 100],
        lastAlertedThreshold: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // 4. Savings Goals
    const targetDate1 = new Date();
    targetDate1.setMonth(targetDate1.getMonth() + 10);

    const targetDate2 = new Date();
    targetDate2.setFullYear(targetDate2.getFullYear() + 2);

    db.savingsGoals.push(
      {
        id: `goal_${userId}_emergency`,
        userId,
        name: 'Emergency Fund (6 Months)',
        targetAmount: '300000.00',
        currentAmount: '185000.00',
        targetDate: targetDate1.toISOString(),
        color: '#059669',
        icon: 'shield-check',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: `goal_${userId}_travel`,
        userId,
        name: 'Japan Vacation Fund',
        targetAmount: '200000.00',
        currentAmount: '65000.00',
        targetDate: targetDate2.toISOString(),
        color: '#2563eb',
        icon: 'plane',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // 5. Initial Notifications
    db.notifications.push(
      {
        id: `notif_${userId}_welcome`,
        userId,
        type: 'SYSTEM',
        title: 'Welcome to Smart Expense Tracker',
        message: 'Your accounts and initial synthetic financial intelligence reports have been loaded.',
        link: '/overview',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: `notif_${userId}_sync`,
        userId,
        type: 'SYSTEM',
        title: 'Bank Accounts Connected',
        message: 'HDFC Bank Savings (•••• 9821) and ICICI Card (•••• 4012) successfully synchronized.',
        link: '/accounts',
        isRead: false,
        createdAt: new Date().toISOString(),
      }
    );

    saveDB();

    // Auto-detect recurring subscriptions from seeded data
    await this.refreshRecurringPayments(userId);
  },
};
