import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const GoalSchema = z.object({
  name: z.string().min(2, 'Goal name must be at least 2 characters'),
  targetAmount: z.union([z.string(), z.number()]).refine((v) => Number(v) > 0, 'Target amount must be positive'),
  currentAmount: z.union([z.string(), z.number()]).optional().default('0.00'),
  targetDate: z.string().min(1, 'Target date is required'),
  color: z.string().optional().default('#059669'),
  icon: z.string().optional().default('target'),
});

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const goals = await StorageService.getSavingsGoals(session.userId);
  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = GoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, targetAmount, currentAmount, targetDate, color, icon } = parsed.data;
    const goal = await StorageService.createSavingsGoal(session.userId, {
      name,
      targetAmount: String(targetAmount),
      currentAmount: String(currentAmount),
      targetDate,
      color,
      icon,
      isCompleted: false,
    });

    return NextResponse.json({ success: true, goal }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create savings goal' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const { id, currentAmount } = await req.json();
    if (!id || currentAmount === undefined) {
      return NextResponse.json({ error: 'Goal id and currentAmount required' }, { status: 400 });
    }

    const goal = await StorageService.updateSavingsGoal(session.userId, id, currentAmount);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, goal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
