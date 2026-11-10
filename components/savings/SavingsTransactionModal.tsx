'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  TRANSACTION_CATEGORIES,
  formatCurrency,
} from '@/lib/savings-service';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';

interface SavingsTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'deposit' | 'withdrawal';
  initialGoalId?: string | null;
}

interface TransactionFormProps {
  defaultType: 'deposit' | 'withdrawal';
  initialGoalId?: string | null;
  onClose: () => void;
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

function TransactionForm({
  defaultType,
  initialGoalId,
  onClose,
}: TransactionFormProps) {
  const {
    savingsGoals,
    savingsAnalytics,
    savingsSettings,
    addSavingsTransaction,
  } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  const [type, setType] = useState<'deposit' | 'withdrawal'>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [goalId, setGoalId] = useState<string>(initialGoalId || 'general');
  const [category, setCategory] = useState<string>(defaultType === 'deposit' ? 'pocket_money' : 'snacks');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Selected goal
  const selectedGoal = goalId !== 'general' ? savingsGoals.find((g) => g.id === goalId) : null;
  const numAmount = parseFloat(amount) || 0;

  // Projection feedback
  let projectedAmount: number | null = null;
  let projectedPercentage: number | null = null;

  if (selectedGoal && numAmount > 0) {
    if (type === 'deposit') {
      projectedAmount = selectedGoal.currentAmount + numAmount;
    } else {
      projectedAmount = Math.max(0, selectedGoal.currentAmount - numAmount);
    }
    projectedPercentage = selectedGoal.targetAmount > 0
      ? Math.round((projectedAmount / selectedGoal.targetAmount) * 100)
      : 0;
  }

  const handleQuickAdd = (chipAmount: number) => {
    const current = parseFloat(amount) || 0;
    const next = current > 0 ? current + chipAmount : chipAmount;
    setAmount(next.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    // Safety checks for withdrawal
    if (type === 'withdrawal') {
      if (selectedGoal && numAmount > selectedGoal.currentAmount) {
        setError(`Cannot withdraw ${formatCurrency(numAmount, cur)}: this jar only has ${formatCurrency(selectedGoal.currentAmount, cur)}.`);
        return;
      }
      if (!selectedGoal && numAmount > savingsAnalytics.generalSavings && savingsAnalytics.generalSavings >= 0) {
        setError(`Cannot spend ${formatCurrency(numAmount, cur)}: loose Piggy Bank only has ${formatCurrency(savingsAnalytics.generalSavings, cur)}.`);
        return;
      }
    }

    const res = addSavingsTransaction({
      type,
      amount: numAmount,
      date,
      goalId: goalId === 'general' ? undefined : goalId,
      category,
      notes: notes.trim() || undefined,
    });

    if (!res.success) {
      setError(res.error || 'Failed to record transaction');
      return;
    }

    onClose();
  };

  return (
    <>
      {/* Type Toggle - Big Touch Targets */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl mb-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setType('deposit');
            setCategory('pocket_money');
          }}
          className={`py-2.5 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
            type === 'deposit'
              ? 'bg-emerald-600 text-white shadow-xs font-bold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Save Money (+)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setType('withdrawal');
            setCategory('snacks');
          }}
          className={`py-2.5 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 transition-all touch-manipulation cursor-pointer ${
            type === 'withdrawal'
              ? 'bg-rose-600 text-white shadow-xs font-bold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          <span>Spent / Used (−)</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300">
              Amount ({cur}) <span className="text-rose-500">*</span>
            </label>
            {amount && (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-base font-bold">
              {cur}
            </span>
            <input
              type="number"
              step="any"
              min="0"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 100"
              className="w-full pl-9 pr-3 py-3 min-h-[48px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-bold"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-zinc-400 mr-1 font-medium">Quick:</span>
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAdd(val)}
                className="px-2.5 py-1.5 min-h-[32px] rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-semibold transition active:scale-95 touch-manipulation cursor-pointer"
              >
                +{cur}{val}
              </button>
            ))}
          </div>
        </div>

        {/* Date & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {type === 'deposit' ? 'Put Money In' : 'Take Money From'}
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              <option value="general">Loose Piggy Bank ({formatCurrency(savingsAnalytics.generalSavings, cur)})</option>
              {(savingsGoals || []).map((g) => (
                <option key={g.id} value={g.id}>
                  Jar: {g.name} ({formatCurrency(g.currentAmount, cur)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Goal Projection Feedback */}
        {selectedGoal && projectedAmount !== null && (
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
              <span>Jar Progress: {selectedGoal.name}</span>
              <span className="font-mono tabular-nums font-bold">
                {projectedPercentage}% of target
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
              {formatCurrency(selectedGoal.currentAmount, cur)} →{' '}
              <span className="font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(projectedAmount, cur)}
              </span>{' '}
              of {formatCurrency(selectedGoal.targetAmount, cur)} target
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Category / Reason
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all capitalize"
          >
            {TRANSACTION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Short Note / Detail (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Given by mom, tea & samosa, festival gift..."
            className="w-full px-3 py-2.5 min-h-[42px] rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400 text-xs"
          />
        </div>

        {/* Actions - Big, Easy to tap */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold transition-colors touch-manipulation cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`flex-1 sm:flex-initial px-6 py-2.5 min-h-[44px] rounded-xl text-white font-bold shadow-xs transition-colors touch-manipulation cursor-pointer ${
              type === 'deposit'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {type === 'deposit' ? 'Save Money' : 'Record Spent'}
          </button>
        </div>
      </form>
    </>
  );
}

export function SavingsTransactionModal({
  isOpen,
  onClose,
  defaultType = 'deposit',
  initialGoalId = null,
}: SavingsTransactionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Framer Motion Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Framer Motion Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 340 }}
            className="relative w-full max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] overflow-y-auto no-scrollbar z-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    defaultType === 'deposit'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {defaultType === 'deposit' ? (
                    <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {defaultType === 'deposit' ? 'Save Pocket Money' : 'Record Spent Money'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {defaultType === 'deposit'
                      ? 'Add cash into your Piggy Bank or a Wish Jar'
                      : 'Log money you spent on snacks, recharge, or treats'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <TransactionForm
              key={`${defaultType}-${initialGoalId || 'all'}`}
              defaultType={defaultType}
              initialGoalId={initialGoalId}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
