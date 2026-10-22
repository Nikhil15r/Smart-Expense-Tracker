import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = PasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    await StorageService.updateUserPassword(
      session.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password update failed' }, { status: 400 });
  }
}
