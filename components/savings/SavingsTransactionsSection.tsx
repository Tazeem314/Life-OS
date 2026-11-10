'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { SavingsTransaction } from '@/lib/types';
import { formatCurrency, TRANSACTION_CATEGORIES } from '@/lib/savings-service';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Download,
  Trash2,
  Receipt,
  FileSpreadsheet,
  FileCode,
  Plus,
} from 'lucide-react';

interface SavingsTransactionsSectionProps {
  onOpenDeposit: () => void;
  onOpenWithdrawal: () => void;
  onOpenTransfer: () => void;
  onDeleteTransaction: (tx: SavingsTransaction) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

export function SavingsTransactionsSection({
  onOpenDeposit,
  onOpenWithdrawal,
  onOpenTransfer,
  onDeleteTransaction,
  onExportCsv,
  onExportJson,
}: SavingsTransactionsSectionProps) {
  const { savingsTransactions, savingsGoals, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'transfer'>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Goal name lookup
  const goalMap = useMemo(() => {
    const map = new Map<string, string>();
    (savingsGoals || []).forEach((g) => {
      map.set(g.id, g.name);
    });
    return map;
  }, [savingsGoals]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return (savingsTransactions || []).filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Goal filter
      if (goalFilter !== 'all') {
        if (goalFilter === 'general' && tx.goalId) return false;
        if (goalFilter !== 'general' && tx.goalId !== goalFilter && tx.destinationGoalId !== goalFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const goalName = tx.goalId ? goalMap.get(tx.goalId)?.toLowerCase() || '' : 'piggy bank';
        const destGoalName = tx.destinationGoalId ? goalMap.get(tx.destinationGoalId)?.toLowerCase() || '' : '';
        const notes = (tx.notes || '').toLowerCase();
        const category = (tx.category || '').toLowerCase();
        const amountStr = tx.amount.toString();
        const dateStr = tx.date;

        return (
          goalName.includes(q) ||
          destGoalName.includes(q) ||
          notes.includes(q) ||
          category.includes(q) ||
          amountStr.includes(q) ||
          dateStr.includes(q)
        );
      }

      return true;
    });
  }, [savingsTransactions, typeFilter, goalFilter, searchQuery, goalMap]);

  return (
    <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 p-4 sm:p-5 shadow-2xs">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Savings History & Records</span>
            <span className="text-xs font-normal text-zinc-400 font-mono">
              ({filteredTransactions.length})
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            All your saved pocket money, spent amounts, and jar transfers
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs touch-manipulation cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-50 animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Download CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportJson();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                  >
                    <FileCode className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onOpenDeposit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs transition-colors touch-manipulation cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Save</span>
          </button>

          <button
            onClick={onOpenWithdrawal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-2xs transition-colors touch-manipulation cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
            <span>− Spent</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-4">
        {/* Search */}
        <div className="relative sm:col-span-6 lg:col-span-5">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, snacks, pocket money..."
            className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400"
          />
        </div>

        {/* Type Filter */}
        <div className="sm:col-span-3 lg:col-span-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="all">All Transactions</option>
            <option value="deposit">Saved Money (+)</option>
            <option value="withdrawal">Spent / Withdrawn (−)</option>
            <option value="transfer">Moved Between Jars (⇄)</option>
          </select>
        </div>

        {/* Goal Filter */}
        <div className="sm:col-span-3 lg:col-span-3">
          <select
            value={goalFilter}
            onChange={(e) => setGoalFilter(e.target.value)}
            className="w-full px-3 py-2 min-h-[40px] rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="all">All Jars & Piggy Bank</option>
            <option value="general">Loose Piggy Bank Only</option>
            {(savingsGoals || []).map((g) => (
              <option key={g.id} value={g.id}>
                Jar: {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {savingsTransactions.length === 0
              ? 'No savings logged yet'
              : 'No records match your search'}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
            {savingsTransactions.length === 0
              ? 'Tap "+ Save" whenever you get pocket money from parents, cash gifts, or want to put away loose coins.'
              : 'Try clearing the search query or switching your filters.'}
          </p>
          {savingsTransactions.length === 0 ? (
            <button
              onClick={onOpenDeposit}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer touch-manipulation"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log First Pocket Money</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setGoalFilter('all');
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE FEED (Clean, comfortable card feed for sm:hidden) */}
          <div className="space-y-2 sm:hidden">
            <AnimatePresence initial={false}>
              {filteredTransactions.map((tx) => {
                const isDeposit = tx.type === 'deposit';
                const isWithdrawal = tx.type === 'withdrawal';
                const isTransfer = tx.type === 'transfer';

                const sourceGoalName = tx.goalId ? goalMap.get(tx.goalId) || 'Wish Jar' : 'Piggy Bank';
                const destGoalName = tx.destinationGoalId ? goalMap.get(tx.destinationGoalId) || 'Wish Jar' : 'Piggy Bank';

                const categoryConfig = TRANSACTION_CATEGORIES.find((c) => c.id === tx.category);

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 flex items-center justify-between gap-3"
                  >
                    {/* Left: Icon & Details */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isDeposit
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                            : isWithdrawal
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {isDeposit && <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />}
                        {isWithdrawal && <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />}
                        {isTransfer && <ArrowRightLeft className="w-4 h-4" />}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {categoryConfig?.name || tx.category || (isDeposit ? 'Saved Money' : 'Spent')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="truncate">
                            {isTransfer ? `${sourceGoalName} → ${destGoalName}` : sourceGoalName}
                          </span>
                        </div>
                        {tx.notes && (
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic truncate mt-0.5">
                            {tx.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Amount & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono tabular-nums font-bold text-sm ${
                          isDeposit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isWithdrawal
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {isDeposit ? '+' : isWithdrawal ? '−' : ''}
                        {formatCurrency(tx.amount, cur)}
                      </span>

                      <button
                        onClick={() => onDeleteTransaction(tx)}
                        title="Delete record"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* DESKTOP TABLE VIEW (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800/80 text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-500 dark:text-zinc-400 font-medium">
                    <tr>
                      <th scope="col" className="px-3.5 py-2.5">Date</th>
                      <th scope="col" className="px-3.5 py-2.5">Type & Jar</th>
                      <th scope="col" className="px-3.5 py-2.5">Category & Note</th>
                      <th scope="col" className="px-3.5 py-2.5 text-right">Amount</th>
                      <th scope="col" className="px-3 py-2.5 text-right w-12">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 bg-white dark:bg-zinc-900/60 font-sans">
                    <AnimatePresence initial={false}>
                      {filteredTransactions.map((tx) => {
                        const isDeposit = tx.type === 'deposit';
                        const isWithdrawal = tx.type === 'withdrawal';
                        const isTransfer = tx.type === 'transfer';

                        const sourceGoalName = tx.goalId ? goalMap.get(tx.goalId) || 'Wish Jar' : 'Piggy Bank';
                        const destGoalName = tx.destinationGoalId ? goalMap.get(tx.destinationGoalId) || 'Wish Jar' : 'Piggy Bank';

                        const categoryConfig = TRANSACTION_CATEGORIES.find((c) => c.id === tx.category);

                        return (
                          <motion.tr
                            key={tx.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            {/* Date */}
                            <td className="px-3.5 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                              {tx.date}
                            </td>

                            {/* Type & Jar */}
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                    isDeposit
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                      : isWithdrawal
                                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                                  }`}
                                >
                                  {isDeposit && <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />}
                                  {isWithdrawal && <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />}
                                  {isTransfer && <ArrowRightLeft className="w-3.5 h-3.5" />}
                                </span>

                                <div className="min-w-0">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                                    {isTransfer ? (
                                      <span className="flex items-center gap-1">
                                        <span className="truncate">{sourceGoalName}</span>
                                        <span className="text-zinc-400">→</span>
                                        <span className="truncate">{destGoalName}</span>
                                      </span>
                                    ) : (
                                      <span>{sourceGoalName}</span>
                                    )}
                                  </span>
                                  <div className="text-[10px] text-zinc-400 capitalize">
                                    {isDeposit ? 'Saved' : isWithdrawal ? 'Spent' : 'Transfer'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category & Note */}
                            <td className="px-3.5 py-3">
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{categoryConfig?.name || tx.category || 'General'}</span>
                                </span>
                                {tx.notes && (
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md">
                                    {tx.notes}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono tabular-nums font-semibold text-xs">
                              <span
                                className={
                                  isDeposit
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isWithdrawal
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-sky-600 dark:text-sky-400'
                                }
                              >
                                {isDeposit ? '+' : isWithdrawal ? '−' : ''}
                                {formatCurrency(tx.amount, cur)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => onDeleteTransaction(tx)}
                                title="Delete record"
                                className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
