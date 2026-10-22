'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  Calendar,
  PieChart as PieIcon,
  Target,
  FileQuestion,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Landmark,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import Link from 'next/link';

const CATEGORY_COLORS = [
  '#2563eb', // blue
  '#059669', // green
  '#d97706', // amber
  '#7c3aed', // purple
  '#e11d48', // rose
  '#0891b2', // cyan
  '#475569', // slate
];

export default function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('this-month');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard?range=${range}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSync = () => fetchDashboardData();
    window.addEventListener('finance:synced', handleSync);
    return () => window.removeEventListener('finance:synced', handleSync);
  }, [range]);

  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const isPositiveCashFlow = Number(kpis.netCashFlow || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Page Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Financial Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-account cash flow, categorized expenditures, and financial health metrics.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-sm">
          {[
            { label: 'This Month', val: 'this-month' },
            { label: 'Last Month', val: 'last-month' },
            { label: 'Last 7 Days', val: 'last-7-days' },
            { label: 'Last 30 Days', val: 'last-30-days' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setRange(item.val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                range === item.val
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Balance */}
        <Card hoverEffect className="border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Connected Balance
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {formatCurrency(kpis.totalBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Landmark className="w-3 h-3 text-slate-400" /> Across {data?.accounts?.length || 0} active accounts
          </p>
        </Card>

        {/* Total Income */}
        <Card hoverEffect className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Inflow (Income)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            +{formatCurrency(kpis.totalIncome)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Excludes inter-account transfers</p>
        </Card>

        {/* Total Expenses */}
        <Card hoverEffect className="border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Outflow (Expenses)
            </span>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            -{formatCurrency(kpis.totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Net of purchase refunds</p>
        </Card>

        {/* Net Cash Flow */}
        <Card hoverEffect className={`border-l-4 ${isPositiveCashFlow ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Net Cash Flow
            </span>
            <div className={`p-2 rounded-lg ${isPositiveCashFlow ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <ArrowUpDown className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${isPositiveCashFlow ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositiveCashFlow ? '+' : ''}{formatCurrency(kpis.netCashFlow)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isPositiveCashFlow ? 'Surplus retained' : 'Deficit in period'}
          </p>
        </Card>
      </div>

      {/* Row 2: Secondary Metric Badges & Status Watch */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Pending Tx</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.pendingCount}
            <span className="text-xs font-normal text-slate-400 ml-1.5">
              ({formatCurrency(kpis.pendingAmount)})
            </span>
          </div>
        </Card>

        {/* Budget Utilization */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-blue-600">
            <PieIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Budget Used</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.budgetUtilization}%
          </div>
        </Card>

        {/* Savings Goal Progress */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Goal Progress</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.savingsProgress}%
          </div>
        </Card>

        {/* Upcoming Recurring */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-purple-600">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Subscriptions</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.upcomingRecurringCount} Active
          </div>
        </Card>

        {/* Uncategorized Review Queue */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-slate-600">
            <FileQuestion className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Needs Review</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.uncategorizedCount}
            {kpis.uncategorizedCount > 0 && (
              <Link href="/transactions?status=uncategorized" className="text-xs text-blue-600 hover:underline ml-1.5">
                Review
              </Link>
            )}
          </div>
        </Card>

        {/* Failed Transactions */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Failed</span>
          </div>
          <div className="mt-1 text-base font-bold text-slate-800 dark:text-slate-200">
            {kpis.failedCount}
          </div>
        </Card>
      </div>

      {/* Row 3: Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Area Chart */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Cash Flow Trend (Income vs Expense)
              </h2>
              <p className="text-xs text-slate-400">
                Daily settled income credits against debited expenditures
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Income
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Expense
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {data?.cashFlowTrend && data.cashFlowTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.cashFlowTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#dc2626"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No transaction data available for this range
              </div>
            )}
          </div>
        </Card>

        {/* Spending by Category Donut */}
        <Card className="flex flex-col">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Spending by Category
            </h2>
            <p className="text-xs text-slate-400">
              Proportional share of settled expenses
            </p>
          </div>

          <div className="h-52 w-full">
            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {data.categoryBreakdown.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expense data in period
              </div>
            )}
          </div>

          <div className="space-y-1.5 mt-2 flex-1 overflow-y-auto max-h-36 pr-1 text-xs">
            {data?.categoryBreakdown?.map((item: any, i: number) => (
              <div key={item.categoryId} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                  ></span>
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium capitalize">
                    {item.name?.replace(/-/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span>{formatCurrency(item.amount)}</span>
                  <span className="text-slate-400 text-[11px] w-9 text-right">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 4: Top Merchants & Connected Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Spending Merchants */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Top Merchants
              </h2>
              <p className="text-xs text-slate-400">Highest expenditure entities</p>
            </div>
            <Link href="/transactions" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-56">
            {data?.topMerchants && data.topMerchants.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topMerchants} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Spent']} />
                  <Bar dataKey="amount" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No merchant spending recorded
              </div>
            )}
          </div>
        </Card>

        {/* Connected Accounts Snapshot */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Connected Institutions & Accounts
              </h2>
              <p className="text-xs text-slate-400">Live balances and account standing</p>
            </div>
            <Link href="/accounts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.accounts?.map((acc: any) => {
              const isCard = acc.type === 'CREDIT_CARD';
              return (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                      {isCard ? (
                        <CreditCard className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Landmark className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{acc.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {acc.accountNumberMasked || acc.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${isCard ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(acc.currentBalance)}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {isCard ? 'Outstanding' : 'Available'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
