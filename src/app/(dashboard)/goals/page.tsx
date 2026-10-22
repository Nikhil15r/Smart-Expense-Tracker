'use client';

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  ShieldCheck,
  Plane,
  Home,
  Car,
  CheckCircle2,
  Calendar,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      if (res.ok) setGoals(data.goals || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || !targetDate) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetAmount,
          currentAmount: initialAmount || '0',
          targetDate: new Date(targetDate).toISOString(),
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setName('');
        setTargetAmount('');
        setTargetDate('');
        fetchGoals();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !contributionAmount || Number(contributionAmount) <= 0) return;
    setIsSubmitting(true);

    try {
      const newAmount = Number(selectedGoal.currentAmount) + Number(contributionAmount);
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedGoal.id,
          currentAmount: String(newAmount),
        }),
      });

      if (res.ok) {
        setIsContributionModalOpen(false);
        setSelectedGoal(null);
        setContributionAmount('');
        fetchGoals();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/goals/${goalToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setGoalToDelete(null);
        fetchGoals();
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
            Savings Goals & Future Planning
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track capital allocation toward emergency reserves, travel aspirations, and long-term milestones.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Create Goal
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const current = Number(g.currentAmount) || 0;
          const target = Number(g.targetAmount) || 1;
          const pct = Math.min(100, Math.round((current / target) * 100));
          const remaining = Math.max(0, target - current);
          const isDone = g.isCompleted || pct >= 100;

          return (
            <Card key={g.id} hoverEffect className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{g.name}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> Target: {g.targetDate?.slice(0, 10)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant={isDone ? 'green' : 'blue'}>
                      {isDone ? 'Completed' : `${pct}%`}
                    </Badge>
                    <button
                      onClick={() => setGoalToDelete(g)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(current)}
                    </span>
                    <span className="text-slate-400 font-mono">Target: {formatCurrency(target)}</span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Remaining to Save</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedGoal(g);
                    setIsContributionModalOpen(true);
                  }}
                  disabled={isDone}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Contribution
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Goal Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Savings Goal"
        description="Establish a savings target with an estimated completion date and monthly contribution tracker."
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, New Laptop, Vacation"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Already Saved (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0"
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Completion Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        title={`Add Funds to ${selectedGoal?.name || 'Goal'}`}
        description="Allocate surplus cash flow toward this savings milestone."
      >
        <form onSubmit={handleAddContribution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contribution Amount (₹)
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsContributionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Confirm Allocation
            </Button>
          </div>
        </form>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!goalToDelete}
        onClose={() => setGoalToDelete(null)}
        title="Delete Savings Goal"
        description="Are you sure you want to delete this savings goal?"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400">
            Goal: <strong>{goalToDelete?.name}</strong> (Target: {formatCurrency(goalToDelete?.targetAmount)}, Saved: {formatCurrency(goalToDelete?.currentAmount)})
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setGoalToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteGoal}
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
