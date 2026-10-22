import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await StorageService.findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    },
  });
}
