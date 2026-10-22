import { Decimal } from 'decimal.js';
import {
  toDecimal,
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateSpendingByCategory,
  calculateSpendingByMerchant,
  formatCurrency,
  TransactionSummaryInput,
} from './ledger';

export interface InsightAnswer {
  question: string;
  answer: string;
  figures: {
    label: string;
    value: string;
  }[];
  category?: string;
  confidence: number;
  supportingTransactionsCount: number;
  dateRange: string;
  isForecast?: boolean;
}

export interface SpendingComparison {
  category: string;
  currentPeriodAmount: Decimal;
  previousPeriodAmount: Decimal;
  percentageChange: number;
  direction: 'UP' | 'DOWN' | 'UNCHANGED';
}

/**
 * Deterministic read-only financial query engine.
 * Converts natural language queries into safe analytical filters.
 * Prevents prompt injection and eliminates AI hallucinations.
 */
export function answerFinancialQuery(
  query: string,
  transactions: TransactionSummaryInput[],
  categoryMap: Record<string, string> = {}
): InsightAnswer {
  const normalizedQuery = query.toLowerCase().trim();
  const now = new Date();

  // Helper date ranges
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter transactions within this month
  const thisMonthTxs = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= startOfThisMonth && d <= endOfThisMonth;
  });

  // Filter transactions within last month
  const lastMonthTxs = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  });

  // Query 1: Swiggy and Zomato combined
  if (
    (normalizedQuery.includes('swiggy') && normalizedQuery.includes('zomato')) ||
    normalizedQuery.includes('food delivery')
  ) {
    const deliveryTxs = thisMonthTxs.filter(
      (tx) =>
        tx.status === 'COMPLETED' &&
        tx.direction === 'DEBIT' &&
        (tx.normalizedMerchant?.toLowerCase().includes('swiggy') ||
          tx.normalizedMerchant?.toLowerCase().includes('zomato'))
    );

    const swiggyAmt = deliveryTxs
      .filter((t) => t.normalizedMerchant?.toLowerCase().includes('swiggy'))
      .reduce((sum, t) => sum.plus(toDecimal(t.amount)), new Decimal(0));

    const zomatoAmt = deliveryTxs
      .filter((t) => t.normalizedMerchant?.toLowerCase().includes('zomato'))
      .reduce((sum, t) => sum.plus(toDecimal(t.amount)), new Decimal(0));

    const total = swiggyAmt.plus(zomatoAmt);

    return {
      question: query,
      answer: `You spent a total of ${formatCurrency(total)} on Swiggy and Zomato combined this month (${deliveryTxs.length} orders).`,
      figures: [
        { label: 'Total Food Delivery', value: formatCurrency(total) },
        { label: 'Swiggy', value: formatCurrency(swiggyAmt) },
        { label: 'Zomato', value: formatCurrency(zomatoAmt) },
      ],
      supportingTransactionsCount: deliveryTxs.length,
      dateRange: 'This Month',
      confidence: 1.0,
    };
  }

  // Query 2: Groceries this month
  if (normalizedQuery.includes('grocer') || normalizedQuery.includes('blinkit') || normalizedQuery.includes('zepto')) {
    const groceryTxs = thisMonthTxs.filter((tx) => {
      const cat = tx.categoryId?.toLowerCase() || '';
      const merch = tx.normalizedMerchant?.toLowerCase() || '';
      return (
        cat.includes('grocer') ||
        merch.includes('blinkit') ||
        merch.includes('zepto') ||
        merch.includes('bigbasket') ||
        merch.includes('dmart')
      );
    });

    const total = calculateTotalExpenses(groceryTxs);

    return {
      question: query,
      answer: `Your grocery and household expenditure this month stands at ${formatCurrency(total)} across ${groceryTxs.length} transactions.`,
      figures: [
        { label: 'Total Groceries', value: formatCurrency(total) },
        { label: 'Transactions Count', value: groceryTxs.length.toString() },
      ],
      supportingTransactionsCount: groceryTxs.length,
      dateRange: 'This Month',
      confidence: 0.98,
    };
  }

  // Query 3: Transport / Commute spending
  if (
    normalizedQuery.includes('transport') ||
    normalizedQuery.includes('uber') ||
    normalizedQuery.includes('ola') ||
    normalizedQuery.includes('cab') ||
    normalizedQuery.includes('metro')
  ) {
    const txsToUse = normalizedQuery.includes('week')
      ? transactions.filter((t) => new Date(t.date) >= sevenDaysAgo)
      : thisMonthTxs;

    const transportTxs = txsToUse.filter((tx) => {
      const cat = tx.categoryId?.toLowerCase() || '';
      const merch = tx.normalizedMerchant?.toLowerCase() || '';
      return (
        cat.includes('transport') ||
        merch.includes('uber') ||
        merch.includes('ola') ||
        merch.includes('metro') ||
        merch.includes('fuel') ||
        merch.includes('irctc')
      );
    });

    const total = calculateTotalExpenses(transportTxs);
    const rangeLabel = normalizedQuery.includes('week') ? 'Last 7 Days' : 'This Month';

    return {
      question: query,
      answer: `You spent ${formatCurrency(total)} on transportation and commute during ${rangeLabel.toLowerCase()}.`,
      figures: [
        { label: 'Total Transport', value: formatCurrency(total) },
        { label: 'Rides / Bookings', value: transportTxs.length.toString() },
      ],
      supportingTransactionsCount: transportTxs.length,
      dateRange: rangeLabel,
      confidence: 0.98,
    };
  }

  // Query 4: Top merchants last month
  if (normalizedQuery.includes('top') && (normalizedQuery.includes('merchant') || normalizedQuery.includes('five') || normalizedQuery.includes('5'))) {
    const targetTxs = normalizedQuery.includes('last month') ? lastMonthTxs : thisMonthTxs;
    const topMerchants = calculateSpendingByMerchant(targetTxs, 5);

    const topList = topMerchants.map((m) => `${m.merchantName}: ${formatCurrency(m.amount)}`).join(', ');

    return {
      question: query,
      answer: `Top 5 merchants: ${topList}.`,
      figures: topMerchants.map((m) => ({
        label: m.merchantName,
        value: formatCurrency(m.amount),
      })),
      supportingTransactionsCount: targetTxs.length,
      dateRange: normalizedQuery.includes('last month') ? 'Last Month' : 'This Month',
      confidence: 1.0,
    };
  }

  // Query 5: Savings / Net cash flow this month
  if (normalizedQuery.includes('save') || normalizedQuery.includes('savings') || normalizedQuery.includes('net cash')) {
    const income = calculateTotalIncome(thisMonthTxs);
    const expense = calculateTotalExpenses(thisMonthTxs);
    const savings = income.minus(expense);
    const savingsRate = income.isPositive() && !income.isZero()
      ? savings.dividedBy(income).times(100).toFixed(1)
      : '0.0';

    return {
      question: query,
      answer: `You have saved ${formatCurrency(savings)} this month (Savings rate: ${savingsRate}% of income).`,
      figures: [
        { label: 'Total Income', value: formatCurrency(income) },
        { label: 'Total Expenses', value: formatCurrency(expense) },
        { label: 'Net Savings', value: formatCurrency(savings) },
        { label: 'Savings Rate', value: `${savingsRate}%` },
      ],
      supportingTransactionsCount: thisMonthTxs.length,
      dateRange: 'This Month',
      confidence: 1.0,
    };
  }

  // Fallback: General category overview
  const categoryBreakdown = calculateSpendingByCategory(thisMonthTxs, categoryMap);
  const topCat = categoryBreakdown[0];

  return {
    question: query,
    answer: topCat
      ? `Your highest expenditure category this month is ${topCat.categoryName} at ${formatCurrency(topCat.amount)} (${topCat.percentage}% of spending).`
      : 'No transaction data available for the requested period.',
    figures: categoryBreakdown.slice(0, 3).map((c) => ({
      label: c.categoryName || 'Category',
      value: formatCurrency(c.amount),
    })),
    supportingTransactionsCount: thisMonthTxs.length,
    dateRange: 'This Month',
    confidence: 0.85,
  };
}

/**
 * Calculates essential (housing, groceries, utilities, healthcare) vs
 * discretionary (dining out, entertainment, shopping, travel) spending ratio.
 */
export function calculateEssentialVsDiscretionary(
  transactions: TransactionSummaryInput[]
): {
  essentialAmount: Decimal;
  discretionaryAmount: Decimal;
  essentialPercentage: number;
  discretionaryPercentage: number;
} {
  let essential = new Decimal(0);
  let discretionary = new Decimal(0);

  const essentialCategories = new Set([
    'groceries-and-household',
    'home-and-utilities',
    'transportation',
    'healthcare',
  ]);

  for (const tx of transactions) {
    if (tx.status !== 'COMPLETED' || tx.direction !== 'DEBIT' || tx.isTransfer) continue;
    const cat = tx.categoryId?.toLowerCase() || '';
    const amt = toDecimal(tx.amount);

    if (essentialCategories.has(cat)) {
      essential = essential.plus(amt);
    } else {
      discretionary = discretionary.plus(amt);
    }
  }

  const total = essential.plus(discretionary);
  const essentialPercentage = total.isZero() ? 50 : essential.dividedBy(total).times(100).toNumber();
  const discretionaryPercentage = total.isZero() ? 50 : discretionary.dividedBy(total).times(100).toNumber();

  return {
    essentialAmount: essential,
    discretionaryAmount: discretionary,
    essentialPercentage: Math.round(essentialPercentage),
    discretionaryPercentage: Math.round(discretionaryPercentage),
  };
}
