import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const recurring = await StorageService.getRecurringPayments(session.userId);
  return NextResponse.json({ recurring });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const { id, status } = await req.json();
    if (!id || !['CONFIRMED', 'DISMISSED', 'DETECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid id and status required' }, { status: 400 });
    }

    const recurring = await StorageService.getRecurringPayments(session.userId);
    const item = recurring.find((r) => r.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
