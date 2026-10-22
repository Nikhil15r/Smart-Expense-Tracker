export interface CategorizationResult {
  normalizedMerchant: string;
  categorySlug: string;
  subcategorySlug?: string;
  confidence: number;
  explanation: string;
  isFlaggedForReview: boolean;
}

export interface UserRule {
  pattern: string; // regex or exact case-insensitive match
  normalizedName: string;
  categorySlug: string;
  subcategorySlug?: string;
}

// Built-in dictionary of 100+ recognized merchants with category & subcategory taxonomy
export const KNOWN_MERCHANT_TAXONOMY: Record<
  string,
  {
    displayName: string;
    category: string;
    subcategory: string;
  }
> = {
  // Food Delivery & Dining
  swiggy: { displayName: 'Swiggy', category: 'food-and-dining', subcategory: 'swiggy' },
  zomato: { displayName: 'Zomato', category: 'food-and-dining', subcategory: 'zomato' },
  mcdonalds: { displayName: "McDonald's", category: 'food-and-dining', subcategory: 'restaurants' },
  dominos: { displayName: "Domino's Pizza", category: 'food-and-dining', subcategory: 'food-delivery' },
  starbucks: { displayName: 'Starbucks', category: 'food-and-dining', subcategory: 'cafes-and-coffee' },
  ccd: { displayName: 'Cafe Coffee Day', category: 'food-and-dining', subcategory: 'cafes-and-coffee' },
  thirdwave: { displayName: 'Third Wave Coffee', category: 'food-and-dining', subcategory: 'cafes-and-coffee' },
  blue_tokai: { displayName: 'Blue Tokai Coffee', category: 'food-and-dining', subcategory: 'cafes-and-coffee' },
  kfc: { displayName: 'KFC', category: 'food-and-dining', subcategory: 'restaurants' },
  subway: { displayName: 'Subway', category: 'food-and-dining', subcategory: 'restaurants' },
  burger_king: { displayName: 'Burger King', category: 'food-and-dining', subcategory: 'restaurants' },
  pizzahut: { displayName: 'Pizza Hut', category: 'food-and-dining', subcategory: 'food-delivery' },
  eatclub: { displayName: 'EatClub', category: 'food-and-dining', subcategory: 'food-delivery' },
  haldirams: { displayName: "Haldiram's", category: 'food-and-dining', subcategory: 'restaurants' },

  // Groceries & Quick Commerce
  blinkit: { displayName: 'Blinkit', category: 'groceries-and-household', subcategory: 'blinkit' },
  zepto: { displayName: 'Zepto', category: 'groceries-and-household', subcategory: 'zepto' },
  bigbasket: { displayName: 'BigBasket', category: 'groceries-and-household', subcategory: 'bigbasket' },
  bbdaily: { displayName: 'BBDaily', category: 'groceries-and-household', subcategory: 'bigbasket' },
  dmart: { displayName: 'DMart', category: 'groceries-and-household', subcategory: 'grocery-stores' },
  nature_basket: { displayName: "Nature's Basket", category: 'groceries-and-household', subcategory: 'grocery-stores' },
  instamart: { displayName: 'Swiggy Instamart', category: 'groceries-and-household', subcategory: 'grocery-stores' },
  reliance_fresh: { displayName: 'Reliance Fresh', category: 'groceries-and-household', subcategory: 'grocery-stores' },
  more_retail: { displayName: 'More Supermarket', category: 'groceries-and-household', subcategory: 'grocery-stores' },
  spencers: { displayName: "Spencer's Retail", category: 'groceries-and-household', subcategory: 'grocery-stores' },

  // Transportation & Commute
  uber: { displayName: 'Uber', category: 'transportation', subcategory: 'cabs' },
  ola: { displayName: 'Ola Cabs', category: 'transportation', subcategory: 'cabs' },
  rapido: { displayName: 'Rapido', category: 'transportation', subcategory: 'auto-rickshaw' },
  irctc: { displayName: 'IRCTC', category: 'transportation', subcategory: 'train-tickets' },
  makemytrip: { displayName: 'MakeMyTrip', category: 'transportation', subcategory: 'flights' },
  goibibo: { displayName: 'Goibibo', category: 'transportation', subcategory: 'flights' },
  indigo: { displayName: 'IndiGo Airlines', category: 'transportation', subcategory: 'flights' },
  airindia: { displayName: 'Air India', category: 'transportation', subcategory: 'flights' },
  fastag: { displayName: 'FASTag Toll', category: 'transportation', subcategory: 'tolls' },
  iocl: { displayName: 'Indian Oil Petrol', category: 'transportation', subcategory: 'fuel' },
  bpcl: { displayName: 'Bharat Petroleum', category: 'transportation', subcategory: 'fuel' },
  hpcl: { displayName: 'HP Petrol Pump', category: 'transportation', subcategory: 'fuel' },
  shell: { displayName: 'Shell Fuel Station', category: 'transportation', subcategory: 'fuel' },
  namma_metro: { displayName: 'Namma Metro BMRCL', category: 'transportation', subcategory: 'metro' },
  delhi_metro: { displayName: 'Delhi Metro DMRC', category: 'transportation', subcategory: 'metro' },

  // Shopping & E-Commerce
  amazon: { displayName: 'Amazon India', category: 'shopping', subcategory: 'online-shopping' },
  flipkart: { displayName: 'Flipkart', category: 'shopping', subcategory: 'online-shopping' },
  myntra: { displayName: 'Myntra', category: 'shopping', subcategory: 'clothing' },
  ajio: { displayName: 'AJIO', category: 'shopping', subcategory: 'clothing' },
  zara: { displayName: 'Zara', category: 'shopping', subcategory: 'clothing' },
  hm: { displayName: 'H&M', category: 'shopping', subcategory: 'clothing' },
  nykaa: { displayName: 'Nykaa', category: 'shopping', subcategory: 'personal-care' },
  tata_cliq: { displayName: 'Tata CLiQ', category: 'shopping', subcategory: 'online-shopping' },
  croma: { displayName: 'Croma Electronics', category: 'shopping', subcategory: 'electronics' },
  reliance_digital: { displayName: 'Reliance Digital', category: 'shopping', subcategory: 'electronics' },
  decathlon: { displayName: 'Decathlon', category: 'shopping', subcategory: 'general-merchandise' },
  ikea: { displayName: 'IKEA', category: 'shopping', subcategory: 'general-merchandise' },

  // Home & Utilities
  airtel: { displayName: 'Airtel Telecom', category: 'home-and-utilities', subcategory: 'mobile-recharge' },
  jio: { displayName: 'Reliance Jio', category: 'home-and-utilities', subcategory: 'mobile-recharge' },
  vodafone_idea: { displayName: 'Vi Telecom', category: 'home-and-utilities', subcategory: 'mobile-recharge' },
  act_fibernet: { displayName: 'ACT Fibernet', category: 'home-and-utilities', subcategory: 'internet' },
  bescom: { displayName: 'BESCOM Electricity', category: 'home-and-utilities', subcategory: 'electricity' },
  tneb: { displayName: 'TNEB Electricity', category: 'home-and-utilities', subcategory: 'electricity' },
  tata_power: { displayName: 'Tata Power', category: 'home-and-utilities', subcategory: 'electricity' },
  adanigas: { displayName: 'Adani Total Gas', category: 'home-and-utilities', subcategory: 'gas' },
  indane: { displayName: 'Indane LPG', category: 'home-and-utilities', subcategory: 'gas' },
  nobroker: { displayName: 'NoBroker Rent', category: 'home-and-utilities', subcategory: 'rent' },
  cred_rent: { displayName: 'CRED RentPay', category: 'home-and-utilities', subcategory: 'rent' },
  urban_company: { displayName: 'Urban Company', category: 'home-and-utilities', subcategory: 'maintenance' },

  // Subscriptions & Entertainment
  netflix: { displayName: 'Netflix', category: 'other', subcategory: 'subscriptions' },
  spotify: { displayName: 'Spotify', category: 'other', subcategory: 'subscriptions' },
  hotstar: { displayName: 'Disney+ Hotstar', category: 'other', subcategory: 'subscriptions' },
  youtube_premium: { displayName: 'YouTube Premium', category: 'other', subcategory: 'subscriptions' },
  apple_services: { displayName: 'Apple Subscriptions', category: 'other', subcategory: 'subscriptions' },
  google_storage: { displayName: 'Google One', category: 'other', subcategory: 'subscriptions' },
  bookmyshow: { displayName: 'BookMyShow', category: 'other', subcategory: 'entertainment' },
  pvr: { displayName: 'PVR INOX Cinemas', category: 'other', subcategory: 'entertainment' },

  // Financial & Investments
  zerodha: { displayName: 'Zerodha Broking', category: 'financial', subcategory: 'investments' },
  groww: { displayName: 'Groww Investments', category: 'financial', subcategory: 'investments' },
  kuvera: { displayName: 'Kuvera MF', category: 'financial', subcategory: 'investments' },
  cred_cc_bill: { displayName: 'CRED Card Payment', category: 'financial', subcategory: 'credit-card-payments' },
  axis_bank_loan: { displayName: 'Axis Bank EMI', category: 'financial', subcategory: 'loan-repayments' },
  hdfc_bank_loan: { displayName: 'HDFC Home Loan', category: 'financial', subcategory: 'loan-repayments' },

  // Healthcare
  apollo: { displayName: 'Apollo Pharmacy', category: 'other', subcategory: 'healthcare' },
  one_mg: { displayName: 'Tata 1mg', category: 'other', subcategory: 'healthcare' },
  pharmeasy: { displayName: 'PharmEasy', category: 'other', subcategory: 'healthcare' },
  medplus: { displayName: 'MedPlus Pharmacy', category: 'other', subcategory: 'healthcare' },
  practo: { displayName: 'Practo Healthcare', category: 'other', subcategory: 'healthcare' },
};

/**
 * Strips payment gateway prefixes, transaction reference IDs, and bank clutter
 * to extract a clean merchant entity name.
 */
export function normalizeMerchant(rawDescription: string): string {
  if (!rawDescription) return 'Unknown Merchant';

  let cleaned = rawDescription.trim().toUpperCase();

  // Pattern 1: Indian UPI string (e.g. UPI/423423/ZOMATO/ICICI/order123 -> ZOMATO)
  const upiMatch = cleaned.match(/UPI\/(?:CR\/|DR\/)?(?:\d+\/)?([A-Z0-9_\-\.]+)/i);
  if (upiMatch && upiMatch[1]) {
    const candidate = upiMatch[1].replace(/[^A-Z]/g, '');
    if (candidate.length > 2) {
      cleaned = candidate;
    }
  }

  // Pattern 2: POS strings (e.g. POS 123456 SWIGGY BANGALORE IN -> SWIGGY)
  cleaned = cleaned
    .replace(/^POS\s+\d+\s+/, '')
    .replace(/^NEFT[ -]/, '')
    .replace(/^RTGS[ -]/, '')
    .replace(/^IMPS[ -]\d+[ -]/, '')
    .replace(/^ACH[ -]/, '')
    .replace(/\s+(BANGALORE|BENGALURU|MUMBAI|DELHI|PUNE|HYDERABAD|CHENNAI|KOLKATA|IN|IND)$/i, '')
    .replace(/PRIVATE LIMITED|PVT LTD|LTD|INDIA|INC/g, '')
    .replace(/[*#]/g, ' ')
    .trim();

  // Match against known merchant keys
  const lower = cleaned.toLowerCase();
  for (const [key, meta] of Object.entries(KNOWN_MERCHANT_TAXONOMY)) {
    const searchToken = key.replace('_', ' ');
    if (lower.includes(searchToken) || lower.includes(key)) {
      return meta.displayName;
    }
  }

  // Title case fallback
  return cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Other Merchant';
}

/**
 * Hybrid categorization engine:
 * 1. Checks user rules (highest priority)
 * 2. Matches known merchant dictionary
 * 3. Pattern heuristics (e.g. keywords like salary, rent, fuel, emi)
 * 4. Flags uncertain items (confidence < 0.70) for user review
 */
export function categorizeTransaction(
  rawDescription: string,
  userRules: UserRule[] = [],
  amount: number = 0,
  direction: 'DEBIT' | 'CREDIT' = 'DEBIT'
): CategorizationResult {
  const norm = normalizeMerchant(rawDescription);
  const text = `${rawDescription} ${norm}`.toLowerCase();

  // 1. Check User Rules
  for (const rule of userRules) {
    const regex = new RegExp(rule.pattern, 'i');
    if (regex.test(rawDescription) || regex.test(norm)) {
      return {
        normalizedMerchant: rule.normalizedName || norm,
        categorySlug: rule.categorySlug,
        subcategorySlug: rule.subcategorySlug,
        confidence: 1.0,
        explanation: `Matched user custom rule: "${rule.pattern}"`,
        isFlaggedForReview: false,
      };
    }
  }

  // 2. Check Known Merchant Taxonomy
  for (const [key, meta] of Object.entries(KNOWN_MERCHANT_TAXONOMY)) {
    const token = key.replace('_', ' ');
    if (text.includes(token) || text.includes(key)) {
      return {
        normalizedMerchant: meta.displayName,
        categorySlug: meta.category,
        subcategorySlug: meta.subcategory,
        confidence: 0.95,
        explanation: `Identified verified merchant: ${meta.displayName}`,
        isFlaggedForReview: false,
      };
    }
  }

  // 3. Keyword / Context Heuristics
  if (direction === 'CREDIT') {
    if (text.includes('salary') || text.includes('payroll') || text.includes('wages')) {
      return {
        normalizedMerchant: norm || 'Employer Payroll',
        categorySlug: 'other',
        subcategorySlug: 'salary',
        confidence: 0.95,
        explanation: 'Salary payment identified from transaction description',
        isFlaggedForReview: false,
      };
    }
    if (text.includes('dividend') || text.includes('interest')) {
      return {
        normalizedMerchant: norm || 'Bank Interest',
        categorySlug: 'financial',
        subcategorySlug: 'interest',
        confidence: 0.90,
        explanation: 'Investment yield or interest credit',
        isFlaggedForReview: false,
      };
    }
    if (text.includes('refund') || text.includes('reversal')) {
      return {
        normalizedMerchant: norm,
        categorySlug: 'other',
        subcategorySlug: 'refunds',
        confidence: 0.92,
        explanation: 'Purchase refund or reversal',
        isFlaggedForReview: false,
      };
    }
  }

  if (text.includes('rent') || text.includes('maintenance')) {
    return {
      normalizedMerchant: norm,
      categorySlug: 'home-and-utilities',
      subcategorySlug: 'rent',
      confidence: 0.85,
      explanation: 'Keyword heuristic matched housing rent/maintenance',
      isFlaggedForReview: false,
    };
  }

  if (text.includes('fuel') || text.includes('petrol') || text.includes('diesel') || text.includes('cng')) {
    return {
      normalizedMerchant: norm,
      categorySlug: 'transportation',
      subcategorySlug: 'fuel',
      confidence: 0.88,
      explanation: 'Fuel station keyword matched',
      isFlaggedForReview: false,
    };
  }

  if (text.includes('pharmacy') || text.includes('hospital') || text.includes('clinic') || text.includes('medicals')) {
    return {
      normalizedMerchant: norm,
      categorySlug: 'other',
      subcategorySlug: 'healthcare',
      confidence: 0.85,
      explanation: 'Healthcare or medical keyword matched',
      isFlaggedForReview: false,
    };
  }

  // 4. Low-confidence fallback -> Flag for user review
  return {
    normalizedMerchant: norm,
    categorySlug: 'other',
    subcategorySlug: 'uncategorized',
    confidence: 0.40,
    explanation: 'Ambiguous description; queued for user verification',
    isFlaggedForReview: true,
  };
}
