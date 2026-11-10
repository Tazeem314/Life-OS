'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { SavingsGoal } from '@/lib/types';
import { formatCurrency, GOAL_COLORS } from '@/lib/savings-service';
import {
  PiggyBank,
  Plus,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  TrendingUp,
  Sparkles,
  Target,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PiggyBank,
  Shield,
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  TrendingUp,
  Sparkles,
  Target,
};

interface SavingsGoalsSectionProps {
  onOpenNewGoal: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goal: SavingsGoal) => void;
  onAddFundsToGoal: (goal: SavingsGoal) => void;
  onTransfer: (sourceGoalId?: string) => void;
  onDepositGeneral: () => void;
}

export function SavingsGoalsSection({
  onOpenNewGoal,
  onEditGoal,
  onDeleteGoal,
  onAddFundsToGoal,
  onTransfer,
  onDepositGeneral,
}: SavingsGoalsSectionProps) {
  const { savingsGoals, savingsAnalytics, savingsSettings } = useLifeOS();
  const cur = savingsSettings.currency || '₹';

  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const filteredGoals = (savingsGoals || []).filter((g) => {
    const isCompleted = g.status === 'completed' || (g.targetAmount > 0 && g.currentAmount >= g.targetAmount);
    if (filter === 'active') return !isCompleted && g.status !== 'archived';
    if (filter === 'completed') return isCompleted;
    return true;
  });

  const getDaysLeft = (dateString?: string) => {
    if (!dateString) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateString);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Savings Jars & Wishlists</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {savingsGoals.length} total
            </span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Keep your money separated into jars for what you want to buy or save for
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Status Filter */}
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800/80 p-0.5 text-xs font-medium">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg transition touch-manipulation cursor-pointer ${
                filter === 'active'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Active ({savingsGoals.filter((g) => g.currentAmount < g.targetAmount).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg transition touch-manipulation cursor-pointer ${
                filter === 'completed'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Reached ({savingsGoals.filter((g) => g.currentAmount >= g.targetAmount).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg transition touch-manipulation cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All
            </button>
          </div>

          <button
            onClick={onOpenNewGoal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-2xs transition cursor-pointer touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Jar</span>
          </button>
        </div>
      </div>

      {/* Grid of Buckets: General Savings Card first, then custom goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* General Savings / Piggy Bank Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                    Loose Piggy Bank
                  </h3>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Free / Unallocated Pocket Cash
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Piggy Bank
              </span>
            </div>

            <div className="my-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Available Balance</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
                {formatCurrency(savingsAnalytics.generalSavings, cur)}
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                Pocket money not locked into any specific jar yet. Free to spend or move into a wishlist jar.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2">
            <button
              onClick={onDepositGeneral}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition cursor-pointer touch-manipulation border border-emerald-200 dark:border-emerald-800/80 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Cash</span>
            </button>
            <button
              onClick={() => onTransfer('general')}
              disabled={savingsAnalytics.generalSavings <= 0 || savingsGoals.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer touch-manipulation active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Move to Jar</span>
            </button>
          </div>
        </motion.div>

        {/* User-defined Savings Goals / Jars */}
        <AnimatePresence>
          {filteredGoals.map((goal) => {
            const percentage = goal.targetAmount > 0
              ? Math.min(100, Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100))
              : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const daysLeft = getDaysLeft(goal.targetDate);
            const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

            const colorConfig = GOAL_COLORS.find((c) => c.id === goal.color) || GOAL_COLORS[0];
            const IconComponent = ICON_MAP[goal.icon] || Target;

            return (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ y: -2 }}
                className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 p-4 sm:p-5 shadow-2xs flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Top Accent Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${colorConfig.bg}`} />

                <div>
                  {/* Header with Title and Direct Edit / Delete */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl ${colorConfig.lightBg} ${colorConfig.text} flex items-center justify-center shrink-0 border ${colorConfig.border}`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                          {goal.name}
                        </h3>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize block truncate">
                          {goal.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Accessible Touch Actions: Edit & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditGoal(goal)}
                        title="Edit this jar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal)}
                        title="Delete this jar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Numbers */}
                  <div className="mt-3 mb-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
                        {formatCurrency(goal.currentAmount || 0, cur)}
                      </span>
                      <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500 tabular-nums">
                        of {formatCurrency(goal.targetAmount, cur)}
                      </span>
                    </div>

                    {/* Progress Bar with Motion */}
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.65, ease: 'easeOut' }}
                        className={`h-full ${colorConfig.bg} rounded-full`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 font-mono tabular-nums">
                      <span>{percentage}% saved</span>
                    {isCompleted ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Target Reached!
                      </span>
                    ) : (
                      <span>{formatCurrency(remainingAmount, cur)} left</span>
                    )}
                  </div>
                </div>

                {/* Deadline & Note */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 py-1.5 border-t border-zinc-100 dark:border-zinc-800/60 font-sans">
                  {goal.targetDate ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{goal.targetDate}</span>
                      {daysLeft !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            daysLeft < 0
                              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold'
                              : daysLeft <= 14
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-[10px]">No fixed date</span>
                  )}

                  {goal.priority && (
                    <span className="text-[10px] uppercase font-semibold text-zinc-400">
                      {goal.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Touch Actions: Big comfortable buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2">
                <button
                  onClick={() => onAddFundsToGoal(goal)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl ${colorConfig.lightBg} ${colorConfig.text} hover:opacity-90 text-xs font-bold transition cursor-pointer touch-manipulation border ${colorConfig.border}`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Add Money</span>
                </button>
                <button
                  onClick={() => onTransfer(goal.id)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer touch-manipulation"
                  title="Move money in or out of this jar"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Move</span>
                </button>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>

        {/* Empty state placeholder when no goals created yet */}
        {savingsGoals.length === 0 && (
          <div
            onClick={onOpenNewGoal}
            className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center text-center hover:border-sky-400 dark:hover:border-sky-600 transition cursor-pointer group min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
              Create Your First Wish Jar
            </h4>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[220px] mt-1">
              New earbuds, a trip with friends, clothes, books, or an emergency stash.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
