'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatCurrency } from '@/lib/savings-service';
import {
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export function SavingsSummaryCards() {
  const { savingsAnalytics, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* 1. Total Piggy Bank Balance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.04 }}
        whileHover={{ y: -2 }}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total Saved
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
            {formatCurrency(savingsAnalytics.totalSavings, cur)}
          </h3>
        </div>
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
          <span className="text-[11px] font-sans">In Wish Jars</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {formatCurrency(savingsAnalytics.allocatedSavings, cur)}
          </span>
        </div>
      </motion.div>

      {/* 2. Saved This Month */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08 }}
        whileHover={{ y: -2 }}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Saved This Month
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            +{formatCurrency(savingsAnalytics.thisMonthDeposits, cur)}
          </h3>
        </div>
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px]">Pocket money & gifts</span>
          <span className="text-[11px] text-zinc-400">
            {savingsAnalytics.activeGoalsCount} wish jar{savingsAnalytics.activeGoalsCount === 1 ? '' : 's'} active
          </span>
        </div>
      </motion.div>

      {/* 3. Spent This Month */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12 }}
        whileHover={{ y: -2 }}
        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Spent This Month
          </span>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            −{formatCurrency(savingsAnalytics.thisMonthWithdrawals, cur)}
          </h3>
        </div>
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-[11px]">Food, recharges, treats</span>
          <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 font-mono tabular-nums">
            Net: {formatCurrency(savingsAnalytics.thisMonthNet, cur)}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
