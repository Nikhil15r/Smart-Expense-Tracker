import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME, UserSessionPayload } from './auth';
import { StorageService, UserRecord } from './storage';

export async function getAuthenticatedUser(): Promise<UserSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export async function requireAuth(): Promise<UserSessionPayload> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function unauthorizedResponse(message: string = 'Authentication required. Please log in.'): NextResponse {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}
