'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatCurrency } from '@/lib/savings-service';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';

interface SavingsTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceGoalId?: string | null;
}

interface TransferFormProps {
  initialSourceGoalId?: string | null;
  onClose: () => void;
}

function TransferForm({ initialSourceGoalId, onClose }: TransferFormProps) {
  const {
    savingsGoals,
    savingsAnalytics,
    savingsSettings,
    transferSavings,
  } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  const defaultSource = initialSourceGoalId || 'general';
  const otherGoal = savingsGoals.find((g) => g.id !== defaultSource);
  const defaultDest = defaultSource === 'general' ? (otherGoal ? otherGoal.id : '') : 'general';

  const [sourceId, setSourceId] = useState<string>(defaultSource);
  const [destinationId, setDestinationId] = useState<string>(defaultDest);
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Source maximum available funds
  const sourceGoal = sourceId !== 'general' ? savingsGoals.find((g) => g.id === sourceId) : null;
  const maxAvailable = sourceGoal
    ? sourceGoal.currentAmount
    : Math.max(0, savingsAnalytics.generalSavings);

  const numAmount = parseFloat(amount) || 0;

  const handleMaxClick = () => {
    if (maxAvailable > 0) {
      setAmount(maxAvailable.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sourceId === destinationId) {
      setError('Source and Destination cannot be the same account or goal.');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive transfer amount.');
      return;
    }

    if (numAmount > maxAvailable) {
      setError(`Transfer amount cannot exceed available balance of ${formatCurrency(maxAvailable, cur)}.`);
      return;
    }

    if (!destinationId) {
      setError('Please select a valid destination for the transfer.');
      return;
    }

    const res = transferSavings(
      numAmount,
      sourceId === 'general' ? null : sourceId,
      destinationId === 'general' ? null : destinationId,
      notes.trim() || undefined
    );

    if (!res.success) {
      setError(res.error || 'Failed to record transfer transaction');
      return;
    }

    onClose();
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Source and Destination */}
        <div className="space-y-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                From (Source)
              </label>
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                Available: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(maxAvailable, cur)}</span>
              </span>
            </div>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
            >
              <option value="general">
                General Savings (Unallocated: {formatCurrency(savingsAnalytics.generalSavings, cur)})
              </option>
              {savingsGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  Goal: {g.name} ({formatCurrency(g.currentAmount, cur)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center -my-1">
            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center">
              <ArrowRightLeft className="w-3 h-3 rotate-90" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              To (Destination)
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
            >
              {sourceId !== 'general' && (
                <option value="general">
                  General Savings (Unallocated Reserve)
                </option>
              )}
              {savingsGoals
                .filter((g) => g.id !== sourceId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    Goal: {g.name} (Current: {formatCurrency(g.currentAmount, cur)})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-zinc-700 dark:text-zinc-300">
                Amount ({cur}) <span className="text-rose-500">*</span>
              </label>
              {maxAvailable > 0 && (
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline uppercase"
                >
                  Use Max
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">
                {cur}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                max={maxAvailable}
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100.00"
                className="w-full pl-7 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono font-semibold"
              />
            </div>
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
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Transfer Reason / Note (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Reallocating windfall into vacation fund..."
            className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-zinc-400 text-xs"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-xs transition-colors"
          >
            Confirm Transfer
          </button>
        </div>
      </form>
    </>
  );
}

export function SavingsTransferModal({
  isOpen,
  onClose,
  initialSourceGoalId = null,
}: SavingsTransferModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar z-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Transfer & Reallocate Savings
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Shift money between jars or from your loose Piggy Bank
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <TransferForm
              key={initialSourceGoalId || 'general'}
              initialSourceGoalId={initialSourceGoalId}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
