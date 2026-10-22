import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const BulkSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
  categoryId: z.string().min(1),
  subcategoryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = BulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bulk parameters' }, { status: 400 });
    }

    const count = await StorageService.bulkCategorize(
      session.userId,
      parsed.data.transactionIds,
      parsed.data.categoryId,
      parsed.data.subcategoryId
    );

    return NextResponse.json({ success: true, updatedCount: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Bulk categorization failed' }, { status: 500 });
  }
}
