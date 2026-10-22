import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const deleted = await StorageService.deleteAccount(session.userId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
