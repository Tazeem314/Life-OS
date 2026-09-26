'use client';

import React, { useState } from 'react';
import { Habit, HabitCompletion, HabitAnalytics } from '@/lib/types';
import { calculateAllHabitsAnalytics } from '@/lib/analytics';
import { HabitDetailAnalyticsModal } from '@/components/modals/HabitDetailAnalyticsModal';
import { HABIT_ICONS } from '@/components/modals/HabitModal';
import {
  Sparkles,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowRight,
} from 'lucide-react';

interface HabitAnalyticsSectionProps {
  habits: Habit[];
  startDate: string;
  endDate: string;
  completions: HabitCompletion[];
}

export function HabitAnalyticsSection({
  habits,
  startDate,
  endDate,
  completions,
}: HabitAnalyticsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectingHabit, setInspectingHabit] = useState<Habit | null>(null);

  const { all, consistent, needsAttention } = calculateAllHabitsAnalytics(
    habits,
    startDate,
    endDate,
    completions
  );

  // Extract unique categories
  const categories = Array.from(
    new Set(habits.map((h) => h.category || 'General'))
  ).filter(Boolean);

  const filteredHabits = all.filter((item) => {
    if (selectedCategory === 'all') return true;
    return (item.habit.category || 'General') === selectedCategory;
  });

  if (habits.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 text-center">
        <Sparkles className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          No Habits Created Yet
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Create habits in the Habits tab to start unlocking deep routine consistency analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Habit Highlights: Top Consistency & Focus Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consistent Anchor Habits */}
        <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Top Consistency Anchors
              </h3>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mb-3">
              Habits with steady &ge;75% completion in this period
            </p>

            {consistent.length > 0 ? (
              <div className="space-y-2">
                {consistent.slice(0, 3).map((item) => {
                  const IconComp =
                    HABIT_ICONS.find((i) => i.name === item.habit.icon)?.Icon || CheckCircle2;
                  return (
                    <button
                      key={item.habitId}
                      onClick={() => setInspectingHabit(item.habit)}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-emerald-200/50 dark:border-emerald-900/30 text-left hover:scale-[1.01] transition shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{ backgroundColor: item.habit.color || '#059669' }}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.habit.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {item.completionRate}%
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-2">
                Complete more scheduled occurrences to build high-consistency anchors.
              </p>
            )}
          </div>
        </div>

        {/* Habits Needing Focus / Opportunities */}
        <div className="p-5 rounded-3xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/40 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                Focus & Growth Areas
              </h3>
            </div>
            <p className="text-xs text-sky-700/80 dark:text-sky-400/80 mb-3">
              Routines with opportunity for higher cadence or cadence reset
            </p>

            {needsAttention.length > 0 ? (
              <div className="space-y-2">
                {needsAttention.slice(0, 3).map((item) => {
                  const IconComp =
                    HABIT_ICONS.find((i) => i.name === item.habit.icon)?.Icon || CheckCircle2;
                  return (
                    <button
                      key={item.habitId}
                      onClick={() => setInspectingHabit(item.habit)}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-sky-200/50 dark:border-sky-900/30 text-left hover:scale-[1.01] transition shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{ backgroundColor: item.habit.color || '#0284c7' }}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.habit.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                          {item.completionRate}%
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-sky-600 transition" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-2">
                All scheduled routines are performing above 60% adherence in this window.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Habit Analytics Table / Card Container */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        {/* Header & Category Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Habit Performance Breakdown
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              Click any habit to inspect its complete consistency history matrix and streaks
            </p>
          </div>

          {/* Category Pill Filters */}
          <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              All ({all.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Habit List Table */}
        <div className="space-y-2.5 pt-2">
          {filteredHabits.map((item) => {
            const IconComp =
              HABIT_ICONS.find((i) => i.name === item.habit.icon)?.Icon || CheckCircle2;

            return (
              <div
                key={item.habitId}
                onClick={() => setInspectingHabit(item.habit)}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-sky-300 dark:hover:border-sky-800 hover:shadow-xs transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left: Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.habit.color || '#0284c7' }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition truncate">
                        {item.habit.name}
                      </h4>
                      {item.habit.status === 'paused' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">
                        {item.habit.category || 'General'}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.habit.frequency}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Progress Bar */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 justify-between sm:justify-end">
                  {/* Progress Bar & Rate */}
                  <div className="flex flex-col items-start sm:items-end min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {item.completedOccurrences}/{item.scheduledOccurrences}
                      </span>
                      <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                        {item.completionRate}%
                      </span>
                    </div>
                    <div className="w-28 bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Streak & Trend */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl border border-orange-200/50 dark:border-orange-900/40">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{item.currentStreak}d</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {item.trend === 'improving' ? (
                        <span title="Improving">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </span>
                      ) : item.trend === 'declining' ? (
                        <span title="Declining">
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                        </span>
                      ) : item.trend === 'stable' ? (
                        <span title="Stable">
                          <Minus className="w-4 h-4 text-sky-500" />
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">·</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Habit Detailed Analytics Modal */}
      <HabitDetailAnalyticsModal
        isOpen={!!inspectingHabit}
        habit={inspectingHabit}
        onClose={() => setInspectingHabit(null)}
      />
    </div>
  );
}
