'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Check,
  X,
  CreditCard,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecurring = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/recurring');
      const data = await res.json();
      if (res.ok) setRecurring(data.recurring || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'CONFIRMED' | 'DISMISSED' | 'DETECTED') => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) fetchRecurring();
    } catch {
      // ignore
    }
  };

  const activeSubscriptions = recurring.filter((r) => r.status !== 'DISMISSED');
  const monthlyTotal = activeSubscriptions.reduce((sum, r) => sum + Number(r.amount), 0);

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Recurring Payments & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automatically detected repeating obligations based on interval history and amount frequency.
          </p>
        </div>

        <Card className="py-2.5 px-4 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <div className="text-[11px] text-purple-700 dark:text-purple-300 uppercase font-semibold">
            Projected Monthly Commitments
          </div>
          <div className="text-xl font-bold font-mono text-purple-800 dark:text-purple-200">
            {formatCurrency(monthlyTotal)}
          </div>
        </Card>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {recurring.map((item) => {
          const isConfirmed = item.status === 'CONFIRMED';
          const isDismissed = item.status === 'DISMISSED';

          return (
            <Card key={item.id} hoverEffect className={`flex flex-col justify-between ${isDismissed ? 'opacity-50' : ''}`}>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.merchantName}
                      </h3>
                      <p className="text-[11px] text-slate-400 uppercase font-medium">
                        {item.frequency}
                      </p>
                    </div>
                  </div>

                  <Badge variant={isConfirmed ? 'green' : isDismissed ? 'neutral' : 'amber'}>
                    {item.status}
                  </Badge>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase">Expected Amount</div>
                  <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(item.amount)}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Next Due:
                    </span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {item.nextExpectedDate?.slice(0, 10) || 'Upcoming'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                {!isDismissed ? (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'CONFIRMED')}
                      disabled={isConfirmed}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'DISMISSED')}
                      className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1 font-medium"
                    >
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'DETECTED')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Restore Subscription
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
