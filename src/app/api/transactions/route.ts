import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const CreateTransactionSchema = z.object({
  accountId: z.string().min(1, 'Account selection is required'),
  amount: z.union([z.string(), z.number()]).refine((val) => Number(val) > 0, 'Amount must be greater than zero'),
  direction: z.enum(['DEBIT', 'CREDIT']),
  date: z.string().min(1, 'Date is required'),
  originalDescription: z.string().min(1, 'Description is required'),
  categoryId: z.string().optional().nullable(),
  subcategoryId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REVERSED', 'REFUNDED', 'CANCELLED']).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const searchParams = req.nextUrl.searchParams;
  const accountId = searchParams.get('accountId') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const direction = (searchParams.get('direction') as any) || undefined;
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const { transactions, total } = await StorageService.getTransactions(session.userId, {
    accountId,
    categoryId,
    direction,
    status,
    search,
    startDate,
    endDate,
    limit,
    offset,
  });

  return NextResponse.json({ transactions, total, limit, offset });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const tx = await StorageService.createTransaction(session.userId, {
      ...parsed.data,
      source: 'MANUAL',
    });

    return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create transaction' }, { status: 500 });
  }
}
