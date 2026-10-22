'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SAMPLE_QUERIES = [
  'How much did I spend on Zomato and Swiggy combined?',
  'How much did I spend on groceries this month?',
  'What were my top 5 merchants last month?',
  'How much did I spend on transport this week?',
  'How much money did I save this month?',
];

export default function InsightsPage() {
  const [query, setQuery] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => setHealthData(d))
      .catch(() => {});
  }, []);

  const handleAsk = async (questionText: string) => {
    const q = questionText || query;
    if (!q.trim()) return;
    setIsAnswering(true);
    setQuery(q);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentAnswer(data.answer);
      }
    } catch {
      // ignore
    } finally {
      setIsAnswering(false);
    }
  };

  const healthScore = healthData?.healthScore || 75;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          Financial Intelligence & Insights
          <Badge variant="purple" size="sm">
            <Sparkles className="w-3 h-3 mr-1" /> Verified Analytics
          </Badge>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Ask natural-language analytical questions answered strictly using verified, read-only transaction ledger figures.
        </p>
      </div>

      {/* Query Bar */}
      <Card className="p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(query);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. How much did I spend on groceries this month? Top 5 merchants?..."
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" isLoading={isAnswering} className="text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 mr-1.5" /> Ask Assistant
          </Button>
        </form>

        {/* Quick Sample Queries */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Try Asking:
          </span>
          {SAMPLE_QUERIES.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAsk(sample)}
              className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full transition-colors border border-slate-200/50 dark:border-slate-700 text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </Card>

      {/* Query Result Card */}
      {currentAnswer && (
        <Card className="p-5 border-l-4 border-l-blue-600 bg-blue-50/20 dark:bg-blue-950/10 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-blue-600 font-semibold mb-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Verified Analytical Result
            </span>
            <span className="text-slate-400 font-normal">
              Based on {currentAnswer.supportingTransactionsCount} supporting transactions ({currentAnswer.dateRange})
            </span>
          </div>

          <p className="text-base text-slate-900 dark:text-white font-medium">
            {currentAnswer.answer}
          </p>

          {/* Key Figures Breakdown */}
          {currentAnswer.figures && currentAnswer.figures.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {currentAnswer.figures.map((fig: any, i: number) => (
                <div key={i} className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] text-slate-400 truncate">{fig.label}</div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {fig.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Financial Health & Ratios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Score Gauge */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Financial Health Score
              </h2>
              <HeartPulse className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Calculated from savings rate & cash flow stability</p>

            <div className="mt-6 flex flex-col items-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                  {healthScore}
                </div>
                <div className="text-[10px] text-slate-400 absolute bottom-5">/ 100</div>
              </div>

              <Badge
                variant={healthScore >= 75 ? 'green' : healthScore >= 50 ? 'amber' : 'red'}
                className="mt-2"
              >
                {healthScore >= 75 ? 'Strong Financial Standing' : healthScore >= 50 ? 'Moderate Health' : 'Needs Optimization'}
              </Badge>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Savings Rate: <strong className="text-slate-800 dark:text-slate-200">{healthData?.savingsRate || 0}%</strong> of monthly income
          </div>
        </Card>

        {/* Essential vs Discretionary Ratio */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Essential vs Discretionary
              </h2>
              <PieIcon className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Needs vs wants spending ratio</p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Essential Needs</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {healthData?.essentialRatio || 50}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${healthData?.essentialRatio || 50}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Rent, groceries, utilities, healthcare</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Discretionary Spending</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {healthData?.discretionaryRatio || 50}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${healthData?.discretionaryRatio || 50}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Dining out, entertainment, shopping</p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            Recommended ratio: 50% Needs / 30% Wants / 20% Savings
          </div>
        </Card>

        {/* Anomaly Watch */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Significant Outflows
              </h2>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">High magnitude transactions this month</p>

            <div className="mt-4 space-y-2.5">
              {healthData?.anomalies && healthData.anomalies.length > 0 ? (
                healthData.anomalies.map((a: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{a.merchant}</p>
                      <p className="text-[10px] text-slate-400">{a.date} • {a.category}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      ₹{Number(a.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  No unusual spending spikes detected this period.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            Monitors transactions &gt; ₹15,000
          </div>
        </Card>
      </div>
    </div>
  );
}
