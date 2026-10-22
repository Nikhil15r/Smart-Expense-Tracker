'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Printer,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState<number | ''>(10);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const url = month !== ''
        ? `/api/reports?year=${year}&month=${month}`
        : `/api/reports?year=${year}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [year, month]);

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  const handleDownloadCsv = () => {
    window.location.href = `/api/transactions/export`;
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Financial Statements & Periodic Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-grade monthly and annual financial statements with verified cash-flow breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:inline-flex">
            <Printer className="w-3.5 h-3.5" /> Print Statement
          </Button>
          <Button size="sm" onClick={handleDownloadCsv}>
            <Download className="w-3.5 h-3.5" /> Export Full Ledger (CSV)
          </Button>
        </div>
      </div>

      {/* Period Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Year:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Month:</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value === '' ? '' : Number(e.target.value))}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
            >
              <option value="">Full Year (Jan - Dec)</option>
              <option value={10}>October</option>
              <option value={9}>September</option>
              <option value={8}>August</option>
              <option value={7}>July</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <div className="text-xs text-slate-500 uppercase font-semibold">Total Income</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            +{formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified credit settlements</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-600">
          <div className="text-xs text-slate-500 uppercase font-semibold">Net Expenses</div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            -{formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Net of ₹{summary.totalRefunds || '0.00'} refunds</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-600">
          <div className="text-xs text-slate-500 uppercase font-semibold">Net Retained Cash</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {formatCurrency(summary.netCashFlow)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Operating period surplus</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-slate-400">
          <div className="text-xs text-slate-500 uppercase font-semibold">Transfers Excluded</div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
            {formatCurrency(summary.totalTransfers)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Credit card & inter-bank transfers</p>
        </Card>
      </div>

      {/* Annual Income vs Expense Comparison Bar Chart */}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Annual Cash Flow Trajectory ({year})
          </h2>
          <p className="text-xs text-slate-400">Month-by-month income credits versus debited expenses</p>
        </div>

        <div className="h-64 w-full">
          {data?.monthlyBreakdown && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="#dc2626" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Category Breakdown Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Category Spending Distribution
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-center">Transactions</th>
                <th className="py-2.5 px-4 text-right">Share</th>
                <th className="py-2.5 px-4 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.categoryBreakdown?.map((cat: any) => (
                <tr key={cat.categoryId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white capitalize">
                    {cat.name?.replace(/-/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">{cat.transactionCount}</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">{cat.percentage}%</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(cat.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
