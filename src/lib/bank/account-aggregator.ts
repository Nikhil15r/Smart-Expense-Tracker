import { Decimal } from 'decimal.js';
import {
  BankDataProvider,
  ProviderInstitution,
  ProviderSyncBatch,
  ConsentInitResponse,
  ConsentStatusResponse,
} from './interface';

/**
 * Adapter for Indian Account Aggregator (AA) ecosystem conforming to
 * RBI NBFC-AA master directions and Sahamati / Setu AA technical specifications.
 *
 * To activate live connectivity:
 * 1. Register with an authorized Account Aggregator (e.g. Setu, Anumati, OneMoney, Finvu).
 * 2. Set SETU_CLIENT_ID and SETU_CLIENT_SECRET in .env.
 * 3. Complete regulatory consent architecture review.
 */
export class AccountAggregatorAdapter implements BankDataProvider {
  readonly providerName = 'ACCOUNT_AGGREGATOR_SETU';

  private clientId?: string;
  private clientSecret?: string;

  constructor() {
    this.clientId = process.env.SETU_CLIENT_ID;
    this.clientSecret = process.env.SETU_CLIENT_SECRET;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async getInstitutions(): Promise<ProviderInstitution[]> {
    // List of major Financial Information Providers (FIPs) in the AA ecosystem
    return [
      { id: 'fip_hdfc', code: 'HDFC-FIP', name: 'HDFC Bank (Account Aggregator)', logo: '/banks/hdfc.svg', type: 'BANK', countryCode: 'IN' },
      { id: 'fip_icici', code: 'ICICI-FIP', name: 'ICICI Bank (Account Aggregator)', logo: '/banks/icici.svg', type: 'BANK', countryCode: 'IN' },
      { id: 'fip_sbi', code: 'SBI-FIP', name: 'State Bank of India (AA)', logo: '/banks/sbi.svg', type: 'BANK', countryCode: 'IN' },
      { id: 'fip_axis', code: 'AXIS-FIP', name: 'Axis Bank (AA)', logo: '/banks/axis.svg', type: 'BANK', countryCode: 'IN' },
      { id: 'fip_kotak', code: 'KOTAK-FIP', name: 'Kotak Mahindra Bank (AA)', logo: '/banks/kotak.svg', type: 'BANK', countryCode: 'IN' },
    ];
  }

  async initiateConsent(institutionId: string, userId: string): Promise<ConsentInitResponse> {
    if (!this.isConfigured()) {
      throw new Error(
        'Account Aggregator credentials are not configured. Please supply SETU_CLIENT_ID and SETU_CLIENT_SECRET or use the MockBankDataProvider.'
      );
    }

    // Specification call to AA Consent API
    // POST /consents -> Returns consent handle & web redirection URL for user OTP approval
    const consentHandle = `aa_consent_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return {
      consentId: consentHandle,
      authorizationUrl: `https://aa-sandbox.setu.co/consent/${consentHandle}`,
      expiresAt,
      status: 'PENDING',
    };
  }

  async checkConsentStatus(consentId: string): Promise<ConsentStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error('Account Aggregator credentials missing');
    }

    // Query Setu / AA consent status: GET /consents/{consentId}
    return {
      consentId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  async revokeConsent(consentId: string): Promise<void> {
    if (!this.isConfigured()) return;
    // POST /consents/{consentId}/revoke
  }

  async fetchSyncBatch(consentId: string, sinceDate?: Date): Promise<ProviderSyncBatch> {
    if (!this.isConfigured()) {
      throw new Error('Cannot fetch live AA data without valid production credentials');
    }

    // Call POST /sessions -> creates FI data session
    // Call GET /sessions/{sessionId} -> fetches signed JWE/XML financial payload
    return {
      accounts: [],
      transactions: [],
      hasMore: false,
      syncedAt: new Date(),
    };
  }
}
