'use client';

import React, { useState } from 'react';
import {
  Menu,
  Plus,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import Link from 'next/link';

interface HeaderProps {
  onOpenMobileNav: () => void;
  onOpenNewTransaction: () => void;
  unreadCount?: number;
  userCurrency?: string;
  onSyncComplete?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileNav,
  onOpenNewTransaction,
  unreadCount = 0,
  onSyncComplete,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionCode: 'HDFC' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncStatus('success');
        setSyncMessage(`Synced ${data.transactionsIngested} new transactions`);
        if (onSyncComplete) onSyncComplete();
        setTimeout(() => setSyncStatus('idle'), 4000);
      } else {
        setSyncStatus('error');
        setSyncMessage(data.error || 'Sync failed');
        setTimeout(() => setSyncStatus('idle'), 4000);
      }
    } catch {
      setSyncStatus('error');
      setSyncMessage('Network sync error');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile Hamburger & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Smart Financial Platform
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Personal Portfolio
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Sync Status Pill */}
        <div className="flex items-center">
          {syncStatus === 'success' && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mr-2 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {syncMessage}
            </span>
          )}
          {syncStatus === 'error' && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mr-2 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-3.5 h-3.5" />
              {syncMessage}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync all connected accounts"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Bank'}</span>
          </button>
        </div>

        {/* Notifications Icon Link */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
          )}
        </Link>

        {/* Quick Transaction Action */}
        <Button
          onClick={onOpenNewTransaction}
          size="sm"
          className="shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>
    </header>
  );
};
