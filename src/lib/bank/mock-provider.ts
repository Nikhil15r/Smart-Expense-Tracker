import { Decimal } from 'decimal.js';
import {
  BankDataProvider,
  ProviderInstitution,
  ProviderAccount,
  ProviderTransaction,
  ProviderSyncBatch,
  ConsentInitResponse,
  ConsentStatusResponse,
} from './interface';

export class MockBankDataProvider implements BankDataProvider {
  readonly providerName = 'MOCK_PROVIDER';

  private simulateErrors: boolean = false;

  constructor(options?: { simulateErrors?: boolean }) {
    if (options?.simulateErrors) {
      this.simulateErrors = true;
    }
  }

  setSimulateErrors(simulate: boolean) {
    this.simulateErrors = simulate;
  }

  async getInstitutions(): Promise<ProviderInstitution[]> {
    return [
      {
        id: 'inst_hdfc',
        code: 'HDFC',
        name: 'HDFC Bank',
        logo: '/banks/hdfc.svg',
        type: 'BANK',
        countryCode: 'IN',
      },
      {
        id: 'inst_icici',
        code: 'ICICI',
        name: 'ICICI Bank',
        logo: '/banks/icici.svg',
        type: 'BANK',
        countryCode: 'IN',
      },
      {
        id: 'inst_sbi',
        code: 'SBI',
        name: 'State Bank of India',
        logo: '/banks/sbi.svg',
        type: 'BANK',
        countryCode: 'IN',
      },
      {
        id: 'inst_axis',
        code: 'AXIS',
        name: 'Axis Bank',
        logo: '/banks/axis.svg',
        type: 'BANK',
        countryCode: 'IN',
      },
    ];
  }

  async initiateConsent(institutionId: string, userId: string): Promise<ConsentInitResponse> {
    if (this.simulateErrors) {
      throw new Error('Mock Bank Provider: Institution authorization server timed out (Simulated Error)');
    }

    const consentId = `mock_consent_${institutionId}_${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 months consent validity

    return {
      consentId,
      authorizationUrl: undefined, // Direct mock consent
      expiresAt,
      status: 'ACTIVE',
    };
  }

  async checkConsentStatus(consentId: string): Promise<ConsentStatusResponse> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    return {
      consentId,
      status: 'ACTIVE',
      expiresAt,
    };
  }

  async revokeConsent(consentId: string): Promise<void> {
    // In mock mode, simply resolves
    return Promise.resolve();
  }

  async fetchSyncBatch(consentId: string, sinceDate?: Date): Promise<ProviderSyncBatch> {
    if (this.simulateErrors) {
      throw new Error('Mock Bank Provider: Account synchronization failed (Simulated Provider Error)');
    }

    const instCode = consentId.split('_')[2]?.toUpperCase() || 'HDFC';

    let accounts: ProviderAccount[] = [];
    let transactions: { accountId: string; transactions: ProviderTransaction[] }[] = [];

    const now = new Date();
    const d = (daysAgo: number) => {
      const dt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      return dt;
    };

    if (instCode === 'HDFC') {
      const savingsAccId = 'acc_hdfc_savings';
      const cardAccId = 'acc_hdfc_regalia';

      accounts = [
        {
          providerAccountId: savingsAccId,
          name: 'HDFC Savings Account',
          officialName: 'HDFC Regular Savings A/C',
          type: 'SAVINGS',
          accountNumberMasked: '•••• 9821',
          currency: 'INR',
          currentBalance: new Decimal('142850.50'),
          availableBalance: new Decimal('142850.50'),
        },
        {
          providerAccountId: cardAccId,
          name: 'HDFC Regalia Gold Credit Card',
          officialName: 'HDFC Visa Infinite Credit Card',
          type: 'CREDIT_CARD',
          accountNumberMasked: '•••• 4012',
          currency: 'INR',
          currentBalance: new Decimal('24890.00'), // Current outstanding
          availableBalance: new Decimal('375110.00'), // Credit limit remaining
        },
      ];

      transactions = [
        {
          accountId: savingsAccId,
          transactions: [
            {
              providerTransactionId: 'tx_hdfc_01',
              amount: new Decimal('165000.00'),
              currency: 'INR',
              direction: 'CREDIT',
              status: 'COMPLETED',
              date: d(1),
              originalDescription: 'NEFT CR-TECHCORP LTD-SALARY-OCT2026',
              paymentMethod: 'NEFT',
            },
            {
              providerTransactionId: 'tx_hdfc_02',
              amount: new Decimal('32000.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(2),
              originalDescription: 'UPI/4921004/NOBROKER RENT/HDFC/OCT',
              paymentMethod: 'UPI',
            },
            {
              providerTransactionId: 'tx_hdfc_03',
              amount: new Decimal('2850.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(3),
              originalDescription: 'UPI/9834112/BESCOM ELECTRICITY/PAYTM',
              paymentMethod: 'UPI',
            },
            {
              providerTransactionId: 'tx_hdfc_04',
              amount: new Decimal('1199.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(5),
              originalDescription: 'ACH DR-ACT FIBERNET BROADBAND',
              paymentMethod: 'ACH',
            },
            {
              providerTransactionId: 'tx_hdfc_05',
              amount: new Decimal('25000.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(6),
              originalDescription: 'IMPS-CRED CC BILL PAYMENT-HDFC CARD',
              paymentMethod: 'IMPS',
            },
          ],
        },
        {
          accountId: cardAccId,
          transactions: [
            {
              providerTransactionId: 'tx_hdfc_c1',
              amount: new Decimal('849.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(1),
              originalDescription: 'POS 942318 SWIGGY BANGALORE IN',
              paymentMethod: 'CARD_POS',
            },
            {
              providerTransactionId: 'tx_hdfc_c2',
              amount: new Decimal('620.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(2),
              originalDescription: 'POS 882190 ZOMATO RESTAURANT GURGAON',
              paymentMethod: 'CARD_POS',
            },
            {
              providerTransactionId: 'tx_hdfc_c3',
              amount: new Decimal('1499.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(3),
              originalDescription: 'POS 774120 BLINKIT COMMERCE GURGAON',
              paymentMethod: 'CARD_POS',
            },
            {
              providerTransactionId: 'tx_hdfc_c4',
              amount: new Decimal('649.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(4),
              originalDescription: 'NETFLIX ENTERTAINMENT SERVICES IN',
              paymentMethod: 'CARD_ONLINE',
            },
            {
              providerTransactionId: 'tx_hdfc_c5',
              amount: new Decimal('4299.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(7),
              originalDescription: 'AMAZON PAY INDIA PVT LTD BANGALORE',
              paymentMethod: 'CARD_ONLINE',
            },
            {
              providerTransactionId: 'tx_hdfc_c6',
              amount: new Decimal('1200.00'),
              currency: 'INR',
              direction: 'CREDIT',
              status: 'COMPLETED',
              date: d(8),
              originalDescription: 'REFUND AMAZON PAY RETURN IN',
              paymentMethod: 'CARD_REFUND',
            },
          ],
        },
      ];
    } else if (instCode === 'ICICI') {
      const accId = 'acc_icici_savings';
      accounts = [
        {
          providerAccountId: accId,
          name: 'ICICI Wealth Savings',
          officialName: 'ICICI Privilege Banking A/C',
          type: 'SAVINGS',
          accountNumberMasked: '•••• 5510',
          currency: 'INR',
          currentBalance: new Decimal('88420.00'),
          availableBalance: new Decimal('88420.00'),
        },
      ];

      transactions = [
        {
          accountId: accId,
          transactions: [
            {
              providerTransactionId: 'tx_icici_01',
              amount: new Decimal('2450.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(1),
              originalDescription: 'UPI/382910/ZEPTO QUICK COMMERCE/ICICI',
              paymentMethod: 'UPI',
            },
            {
              providerTransactionId: 'tx_icici_02',
              amount: new Decimal('480.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(2),
              originalDescription: 'UPI/221940/UBER INDIA TECHNOLOGY/ICICI',
              paymentMethod: 'UPI',
            },
            {
              providerTransactionId: 'tx_icici_03',
              amount: new Decimal('119.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(5),
              originalDescription: 'SPOTIFY INDIA SUBSCRIPTION MUMBAI',
              paymentMethod: 'CARD_ONLINE',
            },
          ],
        },
      ];
    } else {
      // Generic bank accounts
      const accId = `acc_${instCode.toLowerCase()}_01`;
      accounts = [
        {
          providerAccountId: accId,
          name: `${instCode} Core Account`,
          officialName: `${instCode} Commercial Account`,
          type: 'SAVINGS',
          accountNumberMasked: '•••• 1249',
          currency: 'INR',
          currentBalance: new Decimal('45200.00'),
          availableBalance: new Decimal('45200.00'),
        },
      ];

      transactions = [
        {
          accountId: accId,
          transactions: [
            {
              providerTransactionId: `tx_${instCode.toLowerCase()}_01`,
              amount: new Decimal('1800.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(2),
              originalDescription: 'UPI/772190/INDIAN OIL PETROL PUMP',
              paymentMethod: 'UPI',
            },
            {
              providerTransactionId: `tx_${instCode.toLowerCase()}_02`,
              amount: new Decimal('450.00'),
              currency: 'INR',
              direction: 'DEBIT',
              status: 'COMPLETED',
              date: d(4),
              originalDescription: 'UPI/884102/STARBUCKS COFFEE',
              paymentMethod: 'UPI',
            },
          ],
        },
      ];
    }

    return {
      accounts,
      transactions,
      hasMore: false,
      syncedAt: new Date(),
    };
  }
}
