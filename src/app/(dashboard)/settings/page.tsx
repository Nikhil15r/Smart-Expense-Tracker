'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Download,
  Trash2,
  AlertTriangle,
  Lock,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Profile Edit State
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const d = await res.json();
      if (d.user) {
        setUser(d.user);
        setName(d.user.name || '');
        setCurrency(d.user.currency || 'INR');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSavingProfile(true);
    setProfileFeedback(null);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, currency }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileFeedback({ type: 'success', message: 'Profile updated successfully!' });
      fetchUser();
    } catch (err: any) {
      setProfileFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordFeedback({ type: 'success', message: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = () => {
    window.location.href = '/api/settings/export';
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    setIsDeleting(true);

    try {
      const res = await fetch('/api/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmationText: deleteConfirmText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      router.push('/login');
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Account Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal profile, credentials, and DPDP statutory data privacy controls.
        </p>
      </div>

      {/* User Profile Form */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-blue-600" /> User Profile Information
        </h2>

        {profileFeedback && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              profileFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {profileFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{profileFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1">Primary identifier tied to secure sessions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Base Reporting Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" isLoading={isSavingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-amber-600" /> Change Password
        </h2>

        {passwordFeedback && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
              passwordFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {passwordFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" variant="secondary" isLoading={isChangingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Security & Multi-Tenant Isolation Status */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-600" /> Security & Tenant Isolation Status
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Multi-Tenant Cryptographic Isolation
              </p>
              <p className="text-[11px] text-slate-500">
                All database operations strictly enforce object-level authorization scoped to your unique UUID.
              </p>
            </div>
            <Badge variant="green">Enforced</Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                HttpOnly SameSite Cookie Sessions
              </p>
              <p className="text-[11px] text-slate-500">
                JWT session tokens are strictly isolated from client-side scripts to mitigate XSS attacks.
              </p>
            </div>
            <Badge variant="green">Active</Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                CSV Formula Injection Sanitization (CWE-1236)
              </p>
              <p className="text-[11px] text-slate-500">
                All ledger statement downloads automatically sanitize leading =, +, -, @ formula operators.
              </p>
            </div>
            <Badge variant="green">Protected</Badge>
          </div>
        </div>
      </Card>

      {/* DPDP Compliance & Data Portability */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <FileCode className="w-4 h-4 text-purple-600" /> Data Portability & Retention (DPDP)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Exercise your statutory right to full data access or permanent digital erasure.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export Full Financial History</h4>
            <p className="text-[11px] text-slate-500">
              Download complete structured JSON containing all accounts, transactions, budgets, and goals.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportData} className="w-full sm:w-auto">
            <Download className="w-3.5 h-3.5" /> Download JSON Archive
          </Button>
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="mt-6 pt-6 border-t border-rose-100 dark:border-rose-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Permanently Delete Account
              </h4>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                Immediately purges all accounts, bank connections, statements, and transaction histories. This action is irreversible.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full sm:w-auto text-xs shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account & Ledger Deletion"
        description="This will permanently destroy all records associated with your profile."
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          {deleteError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
              {deleteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Enter your password to confirm identity
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your current password"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Type <strong className="text-rose-600 font-mono">DELETE</strong> in capital letters to proceed
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={deleteConfirmText !== 'DELETE'}
              isLoading={isDeleting}
            >
              Permanently Purge Data
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}