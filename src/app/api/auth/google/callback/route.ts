import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/lib/storage';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const isSandbox = searchParams.get('sandbox') === 'true';
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (error) {
    const loginErrorUrl = new URL('/login', baseUrl);
    loginErrorUrl.searchParams.set('error', `Google authentication was canceled: ${error}`);
    return NextResponse.redirect(loginErrorUrl);
  }

  // 1. Sandbox Mock Flow (used when GOOGLE_CLIENT_ID / SECRET are not yet supplied)
  if (isSandbox) {
    const mockGoogleProfile = {
      email: 'alex.rivera.finance@gmail.com',
      name: 'Alex Rivera (Google)',
      googleId: 'google_oauth_sub_1092841920',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    };

    const user = await StorageService.findOrCreateGoogleUser(mockGoogleProfile);

    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });

    const response = NextResponse.redirect(new URL('/overview', baseUrl));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  }

  // 2. Live Google OAuth Flow
  if (!code || !state) {
    const errUrl = new URL('/login', baseUrl);
    errUrl.searchParams.set('error', 'Missing OAuth authorization code or state parameter.');
    return NextResponse.redirect(errUrl);
  }

  // CSRF validation
  const storedState = req.cookies.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    const errUrl = new URL('/login', baseUrl);
    errUrl.searchParams.set('error', 'OAuth state parameter mismatch (CSRF check failed).');
    return NextResponse.redirect(errUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errUrl = new URL('/login', baseUrl);
    errUrl.searchParams.set('error', 'Google OAuth credentials missing on server.');
    return NextResponse.redirect(errUrl);
  }

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
    }

    // Fetch verified user profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      throw new Error('Unable to retrieve email from Google profile');
    }

    // Find or create user
    const user = await StorageService.findOrCreateGoogleUser({
      email: profile.email,
      name: profile.name || profile.given_name || 'Google User',
      googleId: profile.sub,
      avatarUrl: profile.picture || null,
    });

    // Generate secure session cookie
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });

    const response = NextResponse.redirect(new URL('/overview', baseUrl));
    response.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    // Clear state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (err: any) {
    const errUrl = new URL('/login', baseUrl);
    errUrl.searchParams.set('error', err.message || 'Google authentication error');
    return NextResponse.redirect(errUrl);
  }
}
