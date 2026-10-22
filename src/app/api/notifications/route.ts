import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const { notifications, unreadCount } = await StorageService.getNotifications(session.userId);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    if (body.all) {
      await StorageService.markAllNotificationsRead(session.userId);
    } else if (body.id) {
      await StorageService.markNotificationRead(session.userId, body.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update notification' }, { status: 500 });
  }
}
