import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const CreateAccountSchema = z.object({
  name: z.string().min(2, 'Account name must be at least 2 characters'),
  type: z.enum(['SAVINGS', 'CHECKING', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'LOAN']),
  currency: z.string().default('INR'),
  initialBalance: z.union([z.string(), z.number()]).default('0.00'),
  accountNumberMasked: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const accounts = await StorageService.getAccounts(session.userId);
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CreateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, type, currency, initialBalance, accountNumberMasked } = parsed.data;
    const account = await StorageService.createAccount(session.userId, {
      name,
      type,
      currency,
      currentBalance: String(initialBalance),
      availableBalance: String(initialBalance),
      accountNumberMasked: accountNumberMasked || null,
      isActive: true,
    });

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create account' }, { status: 500 });
  }
}
