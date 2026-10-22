import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { z } from 'zod';

const ProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currency: z.string().min(3).max(3),
  phone: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = ProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = await StorageService.updateUserProfile(session.userId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        currency: updated.currency,
        phone: updated.phone,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Profile update failed' }, { status: 500 });
  }
}
