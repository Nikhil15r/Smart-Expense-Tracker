import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { sanitizeForSpreadsheet } from '@/lib/security';

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const searchParams = req.nextUrl.searchParams;
  const accountId = searchParams.get('accountId') || undefined;
  const categoryId = searchParams.get('categoryId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const { transactions } = await StorageService.getTransactions(session.userId, {
    accountId,
    categoryId,
    startDate,
    endDate,
    limit: 10000,
  });

  const accounts = await StorageService.getAccounts(session.userId);
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  const headers = [
    'Date',
    'Account',
    'Merchant',
    'Description',
    'Category',
    'Direction',
    'Amount',
    'Currency',
    'Status',
    'Type',
    'Notes',
  ];

  const rows = transactions.map((t) => [
    sanitizeForSpreadsheet(t.date.slice(0, 10)),
    sanitizeForSpreadsheet(accountMap[t.accountId] || t.accountId),
    sanitizeForSpreadsheet(t.normalizedMerchant),
    sanitizeForSpreadsheet(t.originalDescription),
    sanitizeForSpreadsheet(t.categoryId || 'Uncategorized'),
    sanitizeForSpreadsheet(t.direction),
    sanitizeForSpreadsheet(t.amount),
    sanitizeForSpreadsheet(t.currency),
    sanitizeForSpreadsheet(t.status),
    sanitizeForSpreadsheet(t.type),
    sanitizeForSpreadsheet(t.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const todayStr = new Date().toISOString().slice(0, 10);
  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="smart_expense_statement_${todayStr}.csv"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
