# Smart Expense Tracker & Personal Finance Intelligence Platform

[![Live App](https://img.shields.io/badge/Live%20Deployment-smartexpensemanagement.vercel.app-2563eb?style=for-the-badge&logo=vercel&logoColor=white)](https://smartexpensemanagement.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-emerald?style=for-the-badge)](https://smartexpensemanagement.vercel.app)

> 🚀 **Live Production Application**: **[https://smartexpensemanagement.vercel.app](https://smartexpensemanagement.vercel.app)**

A production-grade, secure, responsive full-stack personal finance web application built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **PostgreSQL**.

The platform intelligently manages bank transactions, categorizes expenses, monitors cash flows, manages budgets with threshold alerts, identifies recurring subscription patterns, and delivers verified financial intelligence without AI hallucinations.

---

## 🌐 Live Production Deployment

The application is deployed and available live on Vercel:

| Environment | URL | Status |
| :--- | :--- | :--- |
| **Production** | [https://smartexpensemanagement.vercel.app](https://smartexpensemanagement.vercel.app) | 🟢 Live & Operational |
| **Repository** | [https://github.com/Nikhil15r/Smart-Expense-Tracker](https://github.com/Nikhil15r/Smart-Expense-Tracker) | 🟢 Main Branch |

---

## 🌟 Key Capabilities

### 1. Unified Multi-Account Portfolio
- Multi-institution connectivity for savings accounts, checking accounts, credit cards, investments, and physical cash.
- Real-time balances and net worth consolidation across institutions.
- Regional support tailored for the Indian financial ecosystem with default **INR (₹)** and multi-currency support (`USD`, `EUR`, `GBP`).

### 2. Financial Ledger & Mathematical Correctness
- **Exact Decimal Arithmetic**: Powered by `Decimal.js` and PostgreSQL `Decimal(14, 2)` monetary columns. No floating-point errors (e.g. `0.10 + 0.20 = 0.30`).
- **Transfer Exclusion**: Inter-account liquidity movements (e.g. Checking account paying a Credit Card bill) are automatically identified and excluded from expense and income totals so spending is never double-counted.
- **Refund Netting**: Purchase refunds directly reduce category expenditures rather than distorting gross income figures.
- **Pending vs. Settled Isolation**: Unsettled pending debits/credits are isolated with visual amber indicators and segregated from settled ledger totals.
- **Deduplication Fingerprinting**: Deterministic SHA-256 transaction fingerprints (`hash(accountId + date + amount + description)`) prevent duplicate records across repeated bank syncs or statement imports.

### 3. Hybrid Categorization Engine
- **Merchant Normalizer**: Cleans raw bank gateway clutter (e.g. `UPI/432059203/ZOMATO/ICICI/order123` &rarr; `Zomato`, `POS 124891 SWIGGY BANGALORE IN` &rarr; `Swiggy`).
- **Pre-configured Taxonomy**: Built-in dictionary covering 100+ Indian & global merchants (Swiggy, Zomato, Blinkit, Zepto, BigBasket, DMart, Uber, Ola, IRCTC, Netflix, Spotify, CRED, BESCOM, etc.).
- **User Preference Overrides**: Users can override categories with "Always categorize this merchant as..." rules that take 100% precedence over automated heuristics.
- **Uncertain Review Queue**: Transactions with confidence &lt; 0.70 are flagged for human review.

### 4. Smart Financial Dashboard
- **10 Primary KPI Cards**: Net Connected Balance, Total Income, Net Expenses, Net Cash Flow, Pending Transactions, Failed Payments, Upcoming Recurring Commitments, Budget Utilization, Savings Goal Progress, and Uncategorized Review Queue.
- **Dynamic Date Filters**: This Month, Last Month, Last 7 Days, Last 30 Days.
- **Interactive Visualizations**: Daily Cash Flow trend (Area chart), Category spending (Donut chart), Top Merchants (Bar chart), and Needs vs. Wants ratio.

### 5. Bank Connectivity Architecture
- Provider-agnostic `BankDataProvider` interface.
- **MockBankDataProvider**: Fully interactive multi-account sandbox simulating HDFC Bank, ICICI Bank, State Bank of India (SBI), and Axis Bank with consent authorization, error simulation, and synchronization.
- **AccountAggregatorAdapter**: Standardized adapter conforming to the Indian Sahamati / Setu Account Aggregator specification for RBI NBFC-AA consent flows.

### 6. Budgets & Threshold Notifications
- Category monthly budgets with progress tracking.
- Proactive alerts dispatched to the in-app notification center when spending crosses 50%, 75%, 90%, and 100% of limits.

### 7. AI & Deterministic Financial Assistant
- Natural language query box answering analytical questions strictly using verified, read-only ledger queries:
  - *"How much did I spend on Zomato and Swiggy combined?"*
  - *"How much did I spend on groceries this month?"*
  - *"What were my top 5 merchants last month?"*
  - *"How much money did I save this month?"*
- Eliminates AI hallucinations, injection vulnerabilities, and unauthorized execution risks.

### 8. Recurring Payment & Subscription Detection
- Cadence detector identifying repeating payments across weekly, monthly, quarterly, and annual intervals with tolerance for variable amounts (utility bills) and fixed amounts (Netflix, Spotify, broadband).

### 9. Savings Goals & Planning
- Target amounts, current contributions, target completion dates, and dynamic cash-flow forecasting.

### 10. Defense-in-Depth Security & DPDP Compliance
- **Tenant Scoping**: 100% of queries scoped to authenticated `userId`. Zero IDOR vulnerabilities.
- **Formula Injection Defense**: CSV statement exports sanitize leading `=`, `+`, `-`, `@` characters to protect spreadsheet users (CWE-1236).
- **Session Protection**: HttpOnly, SameSite=Lax cookie sessions using JWT signed with HS256.
- **DPDP / GDPR Rights**: Complete data export (`JSON`) and one-click account deletion with cryptographic erasure of all records.

---

## 🛠 Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Next.js Route Handlers with layered domain services.
- **Database & ORM**: PostgreSQL with Prisma ORM (`Decimal(14, 2)` exact columns).
- **Validation & Security**: Zod, Bcrypt.js (salted password hashing), Jose (JWT).
- **Testing**: Vitest test runner (Unit, Security Isolation, and User Journey integration tests).

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js v18+ or v20+
- npm v10+

### 2. Installation
```bash
# Clone the repository and navigate into the project
cd "Expense Tracker & Management"

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_expense_tracker?schema=public"

# Authentication
JWT_SECRET="replace-with-a-very-secure-random-32-character-secret"
COOKIE_NAME="finance_session"

# Application Settings
NEXT_PUBLIC_APP_NAME="Smart Expense Tracker"
NEXT_PUBLIC_DEFAULT_CURRENCY="INR"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Running the Application
```bash
# Production Build & Start
npm run build
npm start

# Or Development Mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Account (1-Click Access)

On the login page (`/login`), click **"Explore Demo Account"** to immediately access pre-loaded accounts and 3 months of synthetic transaction data:
- **Email**: `demo@smartfinance.in`
- **Password**: `DemoFinance2026!`

---

## 🧪 Automated Testing Suite

The application includes 28 automated tests across unit, security, and integration suites:

```bash
# Run all tests
npm test

# Run financial ledger and categorization unit tests
npm run test:unit

# Run multi-tenant isolation and security tests
npm run test:security
```

### Verified Test Results:
```text
 ✓ tests/unit/ledger.test.ts (7 tests)
   - Exact decimal arithmetic without floating point drift
   - Total income strictly from completed non-transfer credits
   - Refund netting: refunds reduce expenses, never added to income
   - Inter-account transfer exclusion from cash flow
   - Pending debits isolated from completed expenditures
   - Deterministic SHA-256 fingerprint deduplication
   - Category spending aggregations with exact percentages

 ✓ tests/unit/categorizer.test.ts (9 tests)
   - Normalizes complex UPI, POS, and gateway strings
   - Matches known merchant taxonomy (Swiggy, Zomato, Blinkit, Uber, etc.)
   - Prioritizes user custom rules over built-in dictionary
   - Direction-aware income heuristics (salary, dividends)
   - Flags low-confidence transactions for review (< 0.70)

 ✓ tests/unit/recurring.test.ts (3 tests)
   - Cadence interval detection (Monthly subscriptions)
   - Variable utility bill recurring pattern matching
   - Filtering of one-off non-recurring payments

 ✓ tests/security/isolation.test.ts (5 tests)
   - Cross-user data isolation: User B cannot access User A transactions
   - Cross-user account access prevention (returns null / 403)
   - Spreadsheet formula injection defense (=, +, -, @ sanitized)
   - Full DPDP account purge wipes all user-owned financial records

 ✓ tests/integration/user-journeys.test.ts (4 tests)
   - Full journey: Registration, account seeding, ledger balance checks
   - Budget creation, spending breach, and in-app threshold notification
   - Transaction editing, notes, and rule persistence
   - Bank provider failure simulation, recovery, and deduplication idempotency

Test Files  5 passed (5)
Tests       28 passed (28)
```

---

## 📁 Project Architecture & File Structure

```text
Expense Tracker & Management/
├── prisma/
│   └── schema.prisma               # Complete PostgreSQL schema (13 models, Decimal 14,2)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx      # Secure login & 1-click demo button
│   │   │   └── register/page.tsx   # User registration
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # App shell, persistent sidebar, header, global modal
│   │   │   ├── overview/page.tsx   # Financial intelligence dashboard (10 KPIs & Recharts)
│   │   │   ├── transactions/page.tsx # Table, search, filters, CSV import & export
│   │   │   ├── accounts/page.tsx   # Connected banks, balances, sync & error simulation
│   │   │   ├── budgets/page.tsx    # Category limits, utilization progress & thresholds
│   │   │   ├── insights/page.tsx   # Verified Natural Language analytical query assistant
│   │   │   ├── recurring/page.tsx  # Detected subscriptions & cadence review
│   │   │   ├── goals/page.tsx      # Savings milestones & contribution tracking
│   │   │   ├── reports/page.tsx    # Statements, annual trajectory & category distribution
│   │   │   ├── notifications/page.tsx # Threshold alerts & synchronization notices
│   │   │   └── settings/page.tsx   # Security, profile, DPDP export & account deletion
│   │   ├── api/
│   │   │   ├── auth/[login, register, logout, me]/route.ts
│   │   │   ├── bank/[institutions, sync]/route.ts
│   │   │   ├── transactions/[route, [id], import, export, bulk-categorize]/route.ts
│   │   │   ├── accounts/route.ts
│   │   │   ├── budgets/route.ts
│   │   │   ├── insights/route.ts
│   │   │   ├── recurring/route.ts
│   │   │   ├── goals/route.ts
│   │   │   ├── reports/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   └── settings/[export, delete-account]/route.ts
│   │   ├── globals.css             # Refined fintech theme tokens
│   │   ├── layout.tsx
│   │   └── page.tsx                # Session-aware root redirect
│   ├── components/
│   │   ├── layout/                 # Sidebar, Header, MobileNav
│   │   ├── transactions/           # NewTransactionModal
│   │   └── ui/                     # Button, Card, Badge, Modal
│   └── lib/
│       ├── auth.ts                 # Bcrypt password hashing & JWT cookie verification
│       ├── api-auth.ts             # Route handler authentication guard
│       ├── security.ts             # Tenant guard, rate limiting, formula sanitization
│       ├── storage.ts              # Data persistence repository with tenant isolation
│       ├── bank/
│       │   ├── interface.ts        # BankDataProvider interface
│       │   ├── mock-provider.ts    # Synthetic HDFC, ICICI, SBI, Axis provider
│       │   └── account-aggregator.ts # Indian Account Aggregator (Setu/Sahamati) adapter
│       └── domain/
│           ├── ledger.ts           # Exact decimal math, transfers, refunds, cash flow
│           ├── categorizer.ts      # Merchant normalizer & hybrid rule engine
│           ├── recurring.ts        # Cadence detection algorithm
│           └── insights.ts         # Deterministic analytical query engine
└── tests/
    ├── unit/
    ├── security/
    └── integration/
```

---

## 🔒 Security & Privacy Architecture

- **Tenant Isolation**: Every database operation enforces `where: { userId: session.userId }`.
- **Zero Banking Credential Storage**: Banking passwords, UPI PINs, ATM PINs, OTPs, or CVVs are never requested or stored.
- **CWE-1236 Defense**: Spreadsheet exports sanitize leading `=`, `+`, `-`, `@` characters to protect downstream spreadsheet applications from formula execution.
- **DPDP Act (India) Alignment**: Data minimization, consent-based synchronization, self-service data portability (`JSON` export), and irreversible account purge.
