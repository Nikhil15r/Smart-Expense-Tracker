import { Decimal } from 'decimal.js';

export interface ProviderInstitution {
  id: string;
  code: string;
  name: string;
  logo: string;
  type: 'BANK' | 'CREDIT_CARD' | 'NBFC';
  countryCode: string;
}

export interface ProviderAccount {
  providerAccountId: string;
  name: string;
  officialName: string;
  type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH' | 'LOAN';
  accountNumberMasked: string;
  currency: string;
  currentBalance: Decimal;
  availableBalance: Decimal;
}

export interface ProviderTransaction {
  providerTransactionId: string;
  amount: Decimal;
  currency: string;
  direction: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'REFUNDED';
  date: Date;
  bookingDate?: Date;
  originalDescription: string;
  paymentMethod?: string;
  counterparty?: string;
}

export interface ProviderSyncBatch {
  accounts: ProviderAccount[];
  transactions: {
    accountId: string;
    transactions: ProviderTransaction[];
  }[];
  cursor?: string;
  hasMore: boolean;
  syncedAt: Date;
}

export interface ConsentInitResponse {
  consentId: string;
  authorizationUrl?: string; // Redirect URL for real AA / Plaid, null for direct mock
  expiresAt: Date;
  status: 'PENDING' | 'ACTIVE';
}

export interface ConsentStatusResponse {
  consentId: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
}

/**
 * Extensible provider-agnostic interface for financial data aggregators.
 */
export interface BankDataProvider {
  readonly providerName: string;

  /**
   * Returns list of supported institutions (e.g., HDFC, ICICI, SBI, Axis).
   */
  getInstitutions(): Promise<ProviderInstitution[]>;

  /**
   * Initiates consent agreement for an institution.
   */
  initiateConsent(institutionId: string, userId: string): Promise<ConsentInitResponse>;

  /**
   * Checks the status of an ongoing or active consent.
   */
  checkConsentStatus(consentId: string): Promise<ConsentStatusResponse>;

  /**
   * Revokes user consent, signaling the provider to purge tokens.
   */
  revokeConsent(consentId: string): Promise<void>;

  /**
   * Fetches latest accounts and transactions incrementally.
   */
  fetchSyncBatch(consentId: string, sinceDate?: Date): Promise<ProviderSyncBatch>;
}
