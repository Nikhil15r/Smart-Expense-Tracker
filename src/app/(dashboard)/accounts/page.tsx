'use client';

import React, { useState, useEffect } from 'react';
import {
  Landmark,
  CreditCard,
  Plus,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Clock,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConnectBankWizard } from '@/components/accounts/ConnectBankWizard';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isConnectWizardOpen, setIsConnectWizardOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Manual Form
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('SAVINGS');
  const [manualBalance, setManualBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (res.ok) setAccounts(data.accounts || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAccount = async (instCode: string = 'HDFC') => {
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionCode: instCode }),
      });
      const data = await res.json();

      if (res.ok) {
        setSyncFeedback({
          type: 'success',
          message: `Successfully synchronized ${instCode}. Ingested ${data.transactionsIngested} new transactions.`,
        });
        fetchAccounts();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.error || 'Bank synchronization failed.',
        });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err.message || 'Network error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateManualAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualName,
          type: manualType,
          initialBalance: manualBalance || '0',
        }),
      });

      if (res.ok) {
        setIsManualModalOpen(false);
        setManualName('');
        setManualBalance('');
        fetchAccounts();
      }
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAccountToDelete(null);
        fetchAccounts();
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(val) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Connected Bank Accounts & Ledgers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your synchronized banking accounts, credit card balances, and offline cash ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setIsManualModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Manual Account
          </Button>
          <Button size="sm" onClick={() => setIsConnectWizardOpen(true)}>
            <Landmark className="w-3.5 h-3.5" />
            Connect Bank Account
          </Button>
        </div>
      </div>

      {/* Security & AA Network Status */}
      <Card className="p-4 bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                RBI Account Aggregator Network Active
              </p>
              <p className="text-[11px] text-slate-500">
                End-to-end 256-bit encryption • Zero storage of bank passwords or PINs • Read-only consent
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleSyncAccount('HDFC')}
              disabled={isSyncing}
              isLoading={isSyncing}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync All Accounts
            </Button>
          </div>
        </div>

        {syncFeedback && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
            }`}
          >
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        )}
      </Card>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isCard = acc.type === 'CREDIT_CARD';
          const isCash = acc.type === 'CASH';

          return (
            <Card key={acc.id} hoverEffect className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {isCard ? (
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      ) : isCash ? (
                        <Wallet className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Landmark className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                        {acc.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {acc.accountNumberMasked || acc.officialName || acc.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant={acc.isActive ? 'green' : 'neutral'} size="sm">
                      {acc.isActive ? 'Active' : 'Disconnected'}
                    </Badge>
                    <button
                      onClick={() => setAccountToDelete(acc)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Disconnect / Delete Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balances Display */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    {isCard ? 'Current Outstanding' : 'Current Balance'}
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono mt-1 ${
                      isCard ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatCurrency(acc.currentBalance)}
                  </div>

                  {acc.availableBalance && (
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span>Available Balance</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(acc.availableBalance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Auto-sync enabled
                </span>
                <button
                  onClick={() => handleSyncAccount(acc.name.includes('ICICI') ? 'ICICI' : 'HDFC')}
                  disabled={isSyncing}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connect Bank Wizard Modal */}
      <ConnectBankWizard
        isOpen={isConnectWizardOpen}
        onClose={() => setIsConnectWizardOpen(false)}
        onSuccess={() => {
          fetchAccounts();
          setSyncFeedback({
            type: 'success',
            message: 'Bank account successfully linked and reconciled!',
          });
        }}
      />

      {/* Manual Account Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Create Manual Account"
        description="Track physical cash in hand, petty cash registers, or unlinked offline assets."
      >
        <form onSubmit={handleCreateManualAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Office Petty Cash, Home Cash Locker"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Type
              </label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="CASH">Cash in Hand</option>
                <option value="SAVINGS">Savings Account</option>
                <option value="CHECKING">Checking Account</option>
                <option value="INVESTMENT">Investment Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Balance (₹)
              </label>
              <input
                type="number"
                step="any"
                value={manualBalance}
                onChange={(e) => setManualBalance(e.target.value)}
                placeholder="0.00"
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        title="Disconnect & Delete Account"
        description="Are you sure you want to disconnect this account? All associated transaction histories and balance calculations will be permanently deleted."
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400">
            Account: <strong>{accountToDelete?.name}</strong> ({accountToDelete?.accountNumberMasked || accountToDelete?.type})
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setAccountToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
            >
              Confirm Disconnect & Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
