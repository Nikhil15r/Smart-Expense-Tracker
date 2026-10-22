import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  try {
    const { csvData, accountId } = await req.json();

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'CSV data string is required' }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Target Account ID is required' }, { status: 400 });
    }

    const lines = csvData.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must contain a header row and at least one transaction row' }, { status: 400 });
    }

    // Parse header row
    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

    const dateIdx = headers.findIndex((h) => h.includes('date'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('narration') || h.includes('particular') || h.includes('merchant'));
    const amountIdx = headers.findIndex((h) => h === 'amount' || h.includes('amount'));
    const debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal'));
    const creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('deposit'));

    if (dateIdx === -1 || descIdx === -1 || (amountIdx === -1 && debitIdx === -1 && creditIdx === -1)) {
      return NextResponse.json({
        error: 'Unable to recognize required columns. Your CSV must have Date, Description, and Amount/Debit/Credit columns.',
      }, { status: 400 });
    }

    let importedCount = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Safe CSV split taking quotes into account
      const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const cleanCols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const rawDate = cleanCols[dateIdx];
      const rawDesc = cleanCols[descIdx];

      if (!rawDate || !rawDesc) {
        errors.push(`Row ${i + 1}: Missing date or description`);
        continue;
      }

      let direction: 'DEBIT' | 'CREDIT' = 'DEBIT';
      let rawAmount = '0';

      if (debitIdx !== -1 && creditIdx !== -1) {
        const debitVal = cleanCols[debitIdx]?.replace(/[^0-9.-]/g, '');
        const creditVal = cleanCols[creditIdx]?.replace(/[^0-9.-]/g, '');

        if (creditVal && Number(creditVal) > 0) {
          direction = 'CREDIT';
          rawAmount = creditVal;
        } else if (debitVal && Number(debitVal) > 0) {
          direction = 'DEBIT';
          rawAmount = debitVal;
        } else {
          continue; // Empty row or zero
        }
      } else if (amountIdx !== -1) {
        const val = cleanCols[amountIdx]?.replace(/[^0-9.-]/g, '');
        if (!val || Number(val) === 0) continue;
        const num = Number(val);
        if (num < 0) {
          direction = 'DEBIT';
          rawAmount = Math.abs(num).toString();
        } else {
          direction = 'DEBIT'; // Default single amount column to debit unless type specified
          rawAmount = val;
        }
      }

      try {
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date format "${rawDate}"`);
          continue;
        }

        const res = await StorageService.createTransaction(session.userId, {
          accountId,
          amount: rawAmount,
          direction,
          date: parsedDate.toISOString(),
          originalDescription: rawDesc,
          source: 'CSV_IMPORT',
        });

        if (res.source === 'CSV_IMPORT' && res.createdAt === res.updatedAt) {
          importedCount++;
        } else {
          skippedDuplicates++;
        }
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedDuplicates,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}
