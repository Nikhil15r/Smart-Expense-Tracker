'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { NewTransactionModal } from '@/components/transactions/NewTransactionModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; currency: string } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserAndNotifications = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }
      setUser(authData.user);

      const notifRes = await fetch('/api/notifications');
      const notifData = await notifRes.json();
      if (notifRes.ok) {
        setUnreadNotifications(notifData.unreadCount || 0);
      }
    } catch {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndNotifications();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading SmartFinance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Desktop Persistent Sidebar */}
      <Sidebar
        user={user || undefined}
        unreadNotifications={unreadNotifications}
        onLogout={handleLogout}
      />

      {/* Mobile Slide-out Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user || undefined}
        unreadCount={unreadNotifications}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
          unreadCount={unreadNotifications}
          userCurrency={user?.currency}
          onSyncComplete={() => {
            fetchUserAndNotifications();
            // Dispatch custom event to notify active view to reload data
            window.dispatchEvent(new CustomEvent('finance:synced'));
          }}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global New Transaction Modal */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        onSuccess={() => {
          fetchUserAndNotifications();
          window.dispatchEvent(new CustomEvent('finance:synced'));
        }}
      />
    </div>
  );
}
