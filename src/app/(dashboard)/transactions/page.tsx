'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Tag,
  Edit2,
  Trash2,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [limit] = useState(25);
  const [page, setPage] = useState(0);

  // Bulk Actions
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Add Transaction Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addAccountId, setAddAccountId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDirection, setAddDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [addDescription, setAddDescription] = useState('');
  const [addCategory, setAddCategory] = useState('food-and-dining');
  const [addNotes, setAddNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Transaction Modal
  const [txToEdit, setTxToEdit] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDirection, setEditDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSaveAsRule, setEditSaveAsRule] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Transaction Modal
  const [txToDelete, setTxToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importTargetAccount, setImportTargetAccount] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedAccount) params.set('accountId', selectedAccount);
      if (selectedCategory) params.set('categoryId', selectedCategory);
      if (selectedDirection) params.set('direction', selectedDirection);
      if (selectedStatus) params.set('status', selectedStatus);
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) {
          setAccounts(d.accounts);
          if (d.accounts.length > 0 && !importTargetAccount) {
            setImportTargetAccount(d.accounts[0].id);
          }
          if (d.accounts.length > 0 && !addAccountId) {
            setAddAccountId(d.accounts[0].id);
          }
        }
      });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [search, selectedAccount, selectedCategory, selectedDirection, selectedStatus, page]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTxIds(transactions.map((t) => t.id));
    } else {
      setSelectedTxIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((i) => i !== id));
    } else {
      setSelectedTxIds([...selectedTxIds, id]);
    }
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory || selectedTxIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const res = await fetch('/api/transactions/bulk-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: selectedTxIds,
          categoryId: bulkCategory,
        }),
      });
      if (res.ok) {
        setSelectedTxIds([]);
        setBulkCategory('');
        fetchTransactions();
      }
    } catch {
      // ignore
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleOpenEdit = (tx: any) => {
    setTxToEdit(tx);
    setEditAmount(String(tx.amount));
    setEditDescription(tx.originalDescription || tx.normalizedMerchant || '');
    setEditDate(tx.date ? tx.date.slice(0, 10) : new Date().toISOString().split('T')[0]);
    setEditDirection(tx.direction || 'DEBIT');
    setEditCategory(tx.categoryId || 'other');
    setEditNotes(tx.notes || '');
    setEditSaveAsRule(false);
    setEditError('');
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToEdit) return;
    setIsSavingEdit(true);
    setEditError('');

    try {
      const res = await fetch(`/api/transactions/${txToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: editAmount,
          originalDescription: editDescription,
          date: editDate,
          direction: editDirection,
          categoryId: editCategory,
          notes: editNotes,
          saveAsRule: editSaveAsRule,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update transaction');

      setTxToEdit(null);
      fetchTransactions();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/transactions/${txToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTxToDelete(null);
        fetchTransactions();
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAccountId || !addAmount || !addDescription || !addDate) {
      setAddError('Please fill in all required fields.');
      return;
    }
    setIsAdding(true);
    setAddError('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: addAccountId,
          amount: addAmount,
          direction: addDirection,
          date: addDate,
          originalDescription: addDescription,
          categoryId: addCategory,
          notes: addNotes,
          status: 'COMPLETED',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add transaction');

      setIsAddModalOpen(false);
      setAddAmount('');
      setAddDescription('');
      setAddNotes('');
      fetchTransactions();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCsvImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim() || !importTargetAccount) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvData: csvContent,
          accountId: importTargetAccount,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        fetchTransactions();
      } else {
        setImportResult({ error: data.error || 'Import failed' });
      }
    } catch (err: any) {
      setImportResult({ error: err.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedAccount) params.set('accountId', selectedAccount);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    window.location.href = `/api/transactions/export?${params.toString()}`;
  };

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full audit log of incoming and outgoing monetary events with real-time categorizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Transaction
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Statement
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant, desc..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="food-and-dining">Food & Dining</option>
            <option value="groceries-and-household">Groceries & Household</option>
            <option value="transportation">Transportation</option>
            <option value="shopping">Shopping</option>
            <option value="home-and-utilities">Home & Utilities</option>
            <option value="financial">Financial</option>
            <option value="healthcare">Healthcare</option>
            <option value="other">Other / Subscriptions</option>
          </select>

          {/* Direction Filter */}
          <select
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Directions</option>
            <option value="DEBIT">Debit (Expense)</option>
            <option value="CREDIT">Credit (Income/Refund)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Bulk Action Bar (when rows selected) */}
        {selectedTxIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              {selectedTxIds.length} transactions selected
            </span>
            <div className="flex items-center gap-2">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-700 dark:text-slate-200"
              >
                <option value="">Choose Category to Apply...</option>
                <option value="food-and-dining">Food & Dining</option>
                <option value="groceries-and-household">Groceries & Household</option>
                <option value="transportation">Transportation</option>
                <option value="shopping">Shopping</option>
                <option value="home-and-utilities">Home & Utilities</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
              </select>
              <Button
                size="sm"
                onClick={handleBulkCategorize}
                disabled={!bulkCategory || isBulkUpdating}
                isLoading={isBulkUpdating}
                className="text-xs"
              >
                Apply Category
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Transactions Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedTxIds.length > 0 && selectedTxIds.length === transactions.length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Merchant / Narration</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isDebit = tx.direction === 'DEBIT';
                  const isPending = tx.status === 'PENDING';
                  const isFailed = tx.status === 'FAILED';
                  const isRefund = tx.type === 'REFUND';
                  const isTransfer = tx.isTransfer;

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        selectedTxIds.includes(tx.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedTxIds.includes(tx.id)}
                          onChange={() => handleToggleSelect(tx.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {tx.date.slice(0, 10)}
                      </td>

                      {/* Merchant & Original Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {tx.normalizedMerchant}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5" title={tx.originalDescription}>
                          {tx.originalDescription}
                        </div>
                        {tx.notes && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 italic mt-0.5">
                            Note: {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {accountMap[tx.accountId] || 'Connected Bank'}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              tx.categoryId === 'food-and-dining'
                                ? 'blue'
                                : tx.categoryId === 'groceries-and-household'
                                ? 'green'
                                : tx.categoryId === 'transportation'
                                ? 'amber'
                                : tx.categoryId === 'shopping'
                                ? 'purple'
                                : 'neutral'
                            }
                          >
                            {tx.categoryId?.replace(/-/g, ' ') || 'Uncategorized'}
                          </Badge>
                          {tx.aiConfidence && tx.aiConfidence < 0.7 && (
                            <span className="text-[10px] text-amber-500" title="Low AI confidence; verification recommended">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending ? (
                          <Badge variant="amber" size="sm">
                            <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="red" size="sm">
                            <AlertCircle className="w-2.5 h-2.5 mr-1" /> Failed
                          </Badge>
                        ) : isRefund ? (
                          <Badge variant="green" size="sm">
                            <RotateCcw className="w-2.5 h-2.5 mr-1" /> Refund
                          </Badge>
                        ) : isTransfer ? (
                          <Badge variant="neutral" size="sm">
                            Transfer
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-medium">Cleared</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold whitespace-nowrap">
                        <span
                          className={
                            isRefund
                              ? 'text-emerald-600'
                              : isDebit
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {isRefund ? '+' : isDebit ? '-' : '+'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTxToDelete(tx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {transactions.length} of {total} transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Manual Transaction"
        description="Record cash expenses, offline transfers, or unlinked incoming credits."
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account
              </label>
              <select
                value={addAccountId}
                onChange={(e) => setAddAccountId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Type
              </label>
              <select
                value={addDirection}
                onChange={(e) => setAddDirection(e.target.value as any)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="DEBIT">Debit (Expense)</option>
                <option value="CREDIT">Credit (Income)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Merchant / Narration
            </label>
            <input
              type="text"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
              placeholder="e.g. Swiggy, Uber, Local Market, Client Retainer"
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="food-and-dining">Food & Dining</option>
                <option value="groceries-and-household">Groceries & Household</option>
                <option value="transportation">Transportation</option>
                <option value="shopping">Shopping</option>
                <option value="home-and-utilities">Home & Utilities</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other / General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="Reference or project tag"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdding}>
              Save Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={!!txToEdit}
        onClose={() => setTxToEdit(null)}
        title="Edit Transaction Details"
        description="Update amount, classification, narration, or ledger category."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEditSubmit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-lg">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direction
              </label>
              <select
                value={editDirection}
                onChange={(e) => setEditDirection(e.target.value as any)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="DEBIT">Debit (Expense)</option>
                <option value="CREDIT">Credit (Income/Refund)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="food-and-dining">Food & Dining</option>
                <option value="groceries-and-household">Groceries & Household</option>
                <option value="transportation">Transportation</option>
                <option value="shopping">Shopping</option>
                <option value="home-and-utilities">Home & Utilities</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Merchant / Narration
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add user notes..."
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={editSaveAsRule}
              onChange={(e) => setEditSaveAsRule(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Always apply this category to future transactions from this merchant</span>
          </label>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setTxToEdit(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingEdit}>
              Update Transaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? The account balance will be automatically adjusted."
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-400">
            <p><strong>Merchant:</strong> {txToDelete?.normalizedMerchant || txToDelete?.originalDescription}</p>
            <p><strong>Amount:</strong> ₹{Number(txToDelete?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({txToDelete?.direction})</p>
            <p><strong>Date:</strong> {txToDelete?.date?.slice(0, 10)}</p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setTxToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteSubmit}
              isLoading={isDeleting}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResult(null);
        }}
        title="Import Bank Statement (CSV)"
        description="Upload or paste bank transaction statement rows to automatically parse, deduplicate, and categorize."
        maxWidth="lg"
      >
        <form onSubmit={handleCsvImportSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Destination Account
            </label>
            <select
              value={importTargetAccount}
              onChange={(e) => setImportTargetAccount(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Paste CSV Content or Sample Rows
            </label>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={`Date,Description,Amount,Type\n2026-10-18,Zomato Online Order,450.00,Debit\n2026-10-19,Blinkit Commerce,1250.00,Debit\n2026-10-20,Salary Credit TechCorp,165000.00,Credit`}
              className="w-full text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            ></textarea>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports standard bank statement formats with columns: Date, Description, Amount (or Debit/Credit).
            </p>
          </div>

          {importResult && (
            <div
              className={`p-3 rounded-lg text-xs ${
                importResult.error
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {importResult.error ? (
                <p>{importResult.error}</p>
              ) : (
                <p>
                  Successfully imported <strong>{importResult.importedCount}</strong> new transactions. (
                  {importResult.skippedDuplicates} duplicates safely skipped).
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportResult(null);
              }}
            >
              Close
            </Button>
            <Button type="submit" isLoading={isImporting}>
              Import Transactions
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}