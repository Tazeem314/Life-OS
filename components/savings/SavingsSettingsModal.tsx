'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { CURRENCIES } from '@/lib/savings-service';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
} from 'lucide-react';

interface SavingsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SettingsFormProps {
  onClose: () => void;
}

function SettingsForm({ onClose }: SettingsFormProps) {
  const { savingsSettings, updateSavingsSettings } = useLifeOS();

  const [currency, setCurrency] = useState(savingsSettings.currency || '₹');
  const [monthlyTarget, setMonthlyTarget] = useState<string>((savingsSettings.monthlyTarget || 1000).toString());
  const [emergencyMonths, setEmergencyMonths] = useState<string>((savingsSettings.emergencyFundMonths || 3).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetNum = parseFloat(monthlyTarget) || 1000;
    const monthsNum = parseInt(emergencyMonths, 10) || 6;

    updateSavingsSettings({
      currency,
      monthlyTarget: targetNum,
      emergencyFundMonths: monthsNum,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Currency Selection */}
      <div>
        <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Preferred Currency Symbol
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CURRENCIES.map((c) => {
            const isSelected = currency === c.symbol;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setCurrency(c.symbol)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                }`}
              >
                <div className="text-base font-mono leading-none mb-1">
                  {c.symbol}
                </div>
                <div className="text-[10px] text-zinc-400 font-sans truncate">
                  {c.code}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Savings Target */}
      <div>
        <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Monthly Savings Target ({currency})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">
            {currency}
          </span>
          <input
            type="number"
            step="any"
            min="0"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
            placeholder="500"
            className="w-full pl-7 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
          />
        </div>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Your ideal capital retention target per calendar month.
        </p>
      </div>

      {/* Emergency Fund Months */}
      <div>
        <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Emergency Runway Benchmark (Months)
        </label>
        <select
          value={emergencyMonths}
          onChange={(e) => setEmergencyMonths(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-xs"
        >
          <option value="3">3 Months of Living Expenses</option>
          <option value="6">6 Months of Living Expenses (Standard)</option>
          <option value="9">9 Months of Living Expenses</option>
          <option value="12">12 Months of Living Expenses (Conservative)</option>
        </select>
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
          Save Preferences
        </button>
      </div>
    </form>
  );
}

export function SavingsSettingsModal({ isOpen, onClose }: SavingsSettingsModalProps) {
  const { savingsSettings } = useLifeOS();

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
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Savings Preferences
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Configure your currency and baseline financial targets
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

            <SettingsForm
              key={`${savingsSettings.currency || '₹'}-${savingsSettings.monthlyTarget || 1000}`}
              onClose={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
