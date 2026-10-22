import { NextResponse } from 'next/server';
import { MockBankDataProvider } from '@/lib/bank/mock-provider';

export async function GET() {
  const provider = new MockBankDataProvider();
  const institutions = await provider.getInstitutions();
  return NextResponse.json({ institutions });
}
