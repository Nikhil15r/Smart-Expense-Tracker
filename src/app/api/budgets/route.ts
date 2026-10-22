import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { toDecimal } from '@/lib/domain/ledger';
import { Decimal } from 'decimal.js';
import { z } from 'zod';

const CreateBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Budget amount must be positive'),
  rollover: z.boolean().optional().default(false),
  alertThresholds: z.array(z.number()).optional().default([50, 75, 90, 100]),
});

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const budgets = await StorageService.getBudgets(session.userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { transactions } = await StorageService.getTransactions(session.userId, {
    startDate: startOfMonth,
  });

  const budgetsWithProgress = budgets.map((b) => {
    const limit = toDecimal(b.amount);
    const spent = transactions
      .filter(
        (t) =>
          (t.categoryId === b.categoryId || t.subcategoryId === b.categoryId) &&
          t.direction === 'DEBIT' &&
          t.status === 'COMPLETED' &&
          !t.isTransfer
      )
      .reduce((sum, t) => sum.plus(toDecimal(t.amount)), new Decimal(0));

    const remaining = limit.minus(spent);
    const utilizationPct = limit.isZero()
      ? 0
      : Math.round(spent.dividedBy(limit).times(100).toNumber());

    return {
      ...b,
      spent: spent.toFixed(2),
      remaining: remaining.toFixed(2),
      utilizationPercentage: utilizationPct,
      isExceeded: spent.gt(limit),
    };
  });

  return NextResponse.json({ budgets: budgetsWithProgress });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CreateBudgetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { categoryId, amount, rollover, alertThresholds } = parsed.data;
    const now = new Date();

    const budget = await StorageService.createBudget(session.userId, {
      categoryId,
      amount: String(amount),
      period: 'MONTHLY',
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      rollover,
      alertThresholds,
      lastAlertedThreshold: null,
    });

    return NextResponse.json({ success: true, budget }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create budget' }, { status: 500 });
  }
}
