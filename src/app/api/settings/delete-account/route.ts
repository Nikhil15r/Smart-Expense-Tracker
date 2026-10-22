import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { verifyPassword, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const { password, confirmationText } = await req.json();

    if (confirmationText !== 'DELETE') {
      return NextResponse.json({ error: 'Please enter "DELETE" to confirm account deletion.' }, { status: 400 });
    }

    const user = await StorageService.findUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password. Account deletion aborted.' }, { status: 401 });
    }

    // Purge all records associated with this user
    await StorageService.purgeUserData(session.userId);

    const response = NextResponse.json({ success: true, message: 'Your account and all financial data have been permanently deleted.' });
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
