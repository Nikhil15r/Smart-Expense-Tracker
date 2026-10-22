import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-auth';
import { StorageService } from '@/lib/storage';
import { MockBankDataProvider } from '@/lib/bank/mock-provider';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedUser();
  if (!session) return unauthorizedResponse();

  const rateCheck = checkRateLimit(`sync:${session.userId}`, 10, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Sync rate limit exceeded. Please wait a moment before synchronizing again.' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const institutionCode = body.institutionCode || 'HDFC';
    const simulateError = Boolean(body.simulateError);

    const provider = new MockBankDataProvider({ simulateErrors: simulateError });

    // Step 1: Initiate or verify consent
    const consent = await provider.initiateConsent(`inst_${institutionCode.toLowerCase()}`, session.userId);

    // Step 2: Fetch sync batch
    const batch = await provider.fetchSyncBatch(consent.consentId);

    let accountsSynced = 0;
    let transactionsIngested = 0;
    let duplicatesSkipped = 0;

    const existingAccounts = await StorageService.getAccounts(session.userId);

    // Step 3: Ingest or update accounts
    const accountIdMapping: Record<string, string> = {};

    for (const pAcc of batch.accounts) {
      let matchedAcc = existingAccounts.find(
        (a) => a.accountNumberMasked === pAcc.accountNumberMasked || a.name.toLowerCase() === pAcc.name.toLowerCase()
      );

      if (matchedAcc) {
        await StorageService.updateAccountBalance(
          session.userId,
          matchedAcc.id,
          pAcc.currentBalance,
          pAcc.availableBalance
        );
        accountIdMapping[pAcc.providerAccountId] = matchedAcc.id;
      } else {
        const created = await StorageService.createAccount(session.userId, {
          name: pAcc.name,
          officialName: pAcc.officialName,
          type: pAcc.type,
          accountNumberMasked: pAcc.accountNumberMasked,
          currency: pAcc.currency,
          currentBalance: pAcc.currentBalance.toFixed(2),
          availableBalance: pAcc.availableBalance.toFixed(2),
          isActive: true,
        });
        accountIdMapping[pAcc.providerAccountId] = created.id;
      }
      accountsSynced++;
    }

    // Step 4: Ingest transactions
    for (const group of batch.transactions) {
      const targetAccountId = accountIdMapping[group.accountId] || existingAccounts[0]?.id;
      if (!targetAccountId) continue;

      for (const pTx of group.transactions) {
        const result = await StorageService.createTransaction(session.userId, {
          accountId: targetAccountId,
          amount: pTx.amount,
          currency: pTx.currency,
          direction: pTx.direction,
          status: pTx.status,
          date: pTx.date,
          originalDescription: pTx.originalDescription,
          source: 'BANK_SYNC',
        });

        if (result.source === 'BANK_SYNC' && result.createdAt === result.updatedAt) {
          transactionsIngested++;
        } else {
          duplicatesSkipped++;
        }
      }
    }

    // Refresh recurring detection
    await StorageService.refreshRecurringPayments(session.userId);

    return NextResponse.json({
      success: true,
      institution: institutionCode,
      accountsSynced,
      transactionsIngested,
      duplicatesSkipped,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Synchronization failed',
      code: 'SYNC_ERROR',
    }, { status: 500 });
  }
}
