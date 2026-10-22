import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // If live Google credentials are not configured yet, redirect through the mock sandbox flow
  // (per Mandatory Principle 10: "When an external integration cannot be completed because credentials
  // or provider access are unavailable, implement an explicit sandbox or mock implementation and clear setup instructions.")
  if (!clientId || clientId.trim() === '' || clientId.includes('replace-with')) {
    const sandboxUrl = new URL('/api/auth/google/callback', baseUrl);
    sandboxUrl.searchParams.set('sandbox', 'true');
    return NextResponse.redirect(sandboxUrl);
  }

  // Live Google OAuth 2.0 Flow
  const state = crypto.randomBytes(32).toString('hex');
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(googleAuthUrl);

  // Set CSRF state cookie valid for 10 minutes
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
