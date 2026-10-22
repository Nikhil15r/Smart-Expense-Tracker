import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StorageService } from '@/lib/storage';
import { createSessionToken, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/security';

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  currency: z.string().optional().default('INR'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`register:${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email, password, name, currency } = parsed.data;
    const user = await StorageService.createUser({ email, password, name, currency });

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
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 400 });
  }
}
