import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StorageService } from '@/lib/storage';
import { verifyPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    const { email, password } = parsed.data;
    let user = await StorageService.findUserByEmail(email);

    // If demo account requested and not present yet, auto-seed it
    if (!user && email.toLowerCase() === 'demo@smartfinance.in') {
      user = await StorageService.createUser({
        email: 'demo@smartfinance.in',
        password: 'DemoFinance2026!',
        name: 'Nikhil (Demo)',
        currency: 'INR',
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, currency: user.currency },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
