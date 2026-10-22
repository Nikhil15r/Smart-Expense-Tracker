import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const updated = await StorageService.updateTransaction(session.userId, params.id, {
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId,
      notes: body.notes,
      tags: body.tags,
      isReviewed: true,
      amount: body.amount,
      originalDescription: body.originalDescription,
      date: body.date,
      direction: body.direction,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    if (body.saveAsRule && updated.normalizedMerchant && body.categoryId) {
      await StorageService.createMerchantRule(session.userId, {
        pattern: updated.normalizedMerchant,
        normalizedName: updated.normalizedMerchant,
        categoryId: body.categoryId,
        priority: 100,
        isActive: true,
      });
    }

    return NextResponse.json({ success: true, transaction: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const deleted = await StorageService.deleteTransaction(session.userId, params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete transaction' }, { status: 500 });
  }
}
