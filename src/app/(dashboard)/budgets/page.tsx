'use client';

import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form
  const [categoryId, setCategoryId] = useState('food-and-dining');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets');
      const data = await res.json();
      if (res.ok) setBudgets(data.budgets || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: String(amount),
          rollover: false,
          alertThresholds: [50, 75, 90, 100],
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setAmount('');
        fetchBudgets();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/budgets/${budgetToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBudgetToDelete(null);
        fetchBudgets();
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Budgets & Spending Thresholds
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Set category limits with automated threshold alerts at 50%, 75%, 90%, and 100%.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Create Budget
        </Button>
      </div>

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {budgets.map((b) => {
          const pct = Math.min(100, b.utilizationPercentage || 0);
          const isOver = b.isExceeded;
          const isWarning = pct >= 90;

          return (
            <Card key={b.id} hoverEffect className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {b.categoryId.replace(/-/g, ' ')}
                      </h3>
                      <p className="text-[11px] text-slate-400 uppercase">Monthly Allowance</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant={isOver ? 'red' : isWarning ? 'amber' : 'green'}>
                      {pct}% used
                    </Badge>
                    <button
                      onClick={() => setBudgetToDelete(b)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-500">
                      Spent: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(b.spent)}</strong>
                    </span>
                    <span className="text-slate-400">Limit: {formatCurrency(b.amount)}</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Remaining Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Remaining Budget</span>
                  <span
                    className={`font-mono font-bold ${
                      isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isOver ? `-${formatCurrency(Math.abs(Number(b.remaining)))} (Over)` : formatCurrency(b.remaining)}
                  </span>
                </div>
              </div>

              {/* Threshold Status */}
              <div className="mt-4 pt-2.5 text-[11px] flex items-center gap-1.5 text-slate-400">
                {isOver ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Budget limit exceeded
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Within spending target
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Budget Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Set Monthly Category Budget"
        description="Receive proactive in-app alerts as your expenses approach 50%, 75%, 90%, and 100%."
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="food-and-dining">Food & Dining</option>
              <option value="groceries-and-household">Groceries & Household</option>
              <option value="transportation">Transportation</option>
              <option value="shopping">Shopping</option>
              <option value="home-and-utilities">Home & Utilities</option>
              <option value="financial">Financial</option>
              <option value="healthcare">Healthcare</option>
              <option value="other">Other / Subscriptions</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Limit Amount (₹)
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
              required
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500">
            Alert notifications will automatically fire when spending crosses 50%, 75%, 90%, and 100% of this limit.
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Budget
            </Button>
          </div>
        </form>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        title="Delete Category Budget"
        description="Are you sure you want to remove this budget threshold?"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400 capitalize">
            Category: <strong>{budgetToDelete?.categoryId?.replace(/-/g, ' ')}</strong> (Limit: {formatCurrency(budgetToDelete?.amount)})
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setBudgetToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteBudget}
              isLoading={isDeleting}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
