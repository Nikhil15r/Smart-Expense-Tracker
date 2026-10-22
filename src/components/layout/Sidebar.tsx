'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PiggyBank,
  Sparkles,
  CalendarClock,
  Target,
  FileText,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  Wallet,
} from 'lucide-react';

interface SidebarProps {
  user?: { name: string; email: string };
  unreadNotifications?: number;
  onLogout?: () => void;
}

export const NAV_ITEMS = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Accounts', href: '/accounts', icon: Landmark },
  { name: 'Budgets', href: '/budgets', icon: PiggyBank },
  { name: 'Insights', href: '/insights', icon: Sparkles, badge: 'AI' },
  { name: 'Recurring Payments', href: '/recurring', icon: CalendarClock },
  { name: 'Savings Goals', href: '/goals', icon: Target },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  unreadNotifications = 0,
  onLogout,
}) => {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 select-none z-30">
      {/* Platform Branding */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight block">
            SmartFinance
          </span>
          <span className="text-[10px] text-blue-600 font-medium tracking-wide uppercase block -mt-0.5">
            Intelligence Platform
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Finance Core
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/overview' && pathname?.startsWith(item.href));
          const hasBadge = item.name === 'Notifications' && unreadNotifications > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
              {hasBadge && (
                <span className="text-[11px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full min-w-5 text-center">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Security Indicator & User Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="truncate">Bank-grade 256-bit isolation</span>
        </div>

        {user && (
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
