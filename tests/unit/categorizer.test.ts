import { describe, it, expect } from 'vitest';
import {
  normalizeMerchant,
  categorizeTransaction,
  UserRule,
} from '../../src/lib/domain/categorizer';

describe('Merchant Normalization & Hybrid Categorization', () => {
  describe('normalizeMerchant', () => {
    it('normalizes complex UPI raw strings', () => {
      const raw = 'UPI/432059203/ZOMATO/ICICI/order123';
      expect(normalizeMerchant(raw)).toBe('Zomato');
    });

    it('normalizes POS bank statement entries', () => {
      const raw = 'POS 124891 SWIGGY BANGALORE IN';
      expect(normalizeMerchant(raw)).toBe('Swiggy');
    });

    it('normalizes e-commerce gateway entries', () => {
      const raw = 'AMAZON PAY INDIA PVT LTD';
      expect(normalizeMerchant(raw)).toBe('Amazon India');
    });

    it('normalizes quick commerce grocery services', () => {
      expect(normalizeMerchant('BLINKIT COMMERCE PVT LTD')).toBe('Blinkit');
      expect(normalizeMerchant('ZEPTO QUICK COMMERCE')).toBe('Zepto');
      expect(normalizeMerchant('BIGBASKET SUPERMARKET')).toBe('BigBasket');
    });

    it('normalizes transit and transport providers', () => {
      expect(normalizeMerchant('UBER INDIA TECHNOLOGY')).toBe('Uber');
      expect(normalizeMerchant('OLA CABS BENGALURU')).toBe('Ola Cabs');
      expect(normalizeMerchant('IRCTC WEB TICKETING NEW DELHI')).toBe('IRCTC');
    });
  });

  describe('categorizeTransaction', () => {
    it('matches known merchant dictionary with high confidence (0.95)', () => {
      const result = categorizeTransaction('UPI/423423/SWIGGY/012');
      expect(result.normalizedMerchant).toBe('Swiggy');
      expect(result.categorySlug).toBe('food-and-dining');
      expect(result.subcategorySlug).toBe('swiggy');
      expect(result.confidence).toBe(0.95);
      expect(result.isFlaggedForReview).toBe(false);
    });

    it('prioritizes user custom rules over built-in dictionary with 1.0 confidence', () => {
      const userRules: UserRule[] = [
        {
          pattern: 'Starbucks',
          normalizedName: 'Work Coffee Meetings',
          categorySlug: 'business-expenses',
          subcategorySlug: 'meetings',
        },
      ];

      const result = categorizeTransaction('STARBUCKS COFFEE KORAMANGALA', userRules);
      expect(result.normalizedMerchant).toBe('Work Coffee Meetings');
      expect(result.categorySlug).toBe('business-expenses');
      expect(result.confidence).toBe(1.0);
      expect(result.isFlaggedForReview).toBe(false);
    });

    it('identifies salary income correctly with direction awareness', () => {
      const result = categorizeTransaction('SALARY CREDIT OCT 2026 ACME CORP', [], 150000, 'CREDIT');
      expect(result.categorySlug).toBe('other');
      expect(result.subcategorySlug).toBe('salary');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.isFlaggedForReview).toBe(false);
    });

    it('flags ambiguous descriptions for user review with confidence < 0.70', () => {
      const result = categorizeTransaction('RANDOM MISC CASH PAYMENT 9842');
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.isFlaggedForReview).toBe(true);
      expect(result.subcategorySlug).toBe('uncategorized');
    });
  });
});
