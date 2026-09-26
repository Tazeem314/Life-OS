'use client';

import React from 'react';
import { Habit, HabitCompletion, Todo } from '@/lib/types';
import { calculateWeeklySummaries } from '@/lib/analytics';
import { Calendar, TrendingUp, TrendingDown, Minus, CheckCircle2, Sparkles, CheckSquare } from 'lucide-react';

interface WeeklyComparisonSectionProps {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  startDate: string;
  endDate: string;
}

export function WeeklyComparisonSection({
  habits,
  completions,
  todos,
  startDate,
  endDate,
}: WeeklyComparisonSectionProps) {
  const summaries = calculateWeeklySummaries(startDate, endDate, habits, completions, todos);

  if (summaries.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 text-center">
        <Calendar className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          No Weekly Data Available
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Select a broader time range (such as 30 Days or 3 Months) to compare weekly pacing.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Weekly Progression & Pacing
          </h2>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
          Track week-by-week adherence across habits and daily to-dos
        </p>
      </div>

      <div className="space-y-3">
        {summaries.map((week, idx) => {
          const prevWeek = idx > 0 ? summaries[idx - 1] : null;
          const delta =
            prevWeek && prevWeek.totalScheduled > 0
              ? week.completionRate - prevWeek.completionRate
              : null;

          return (
            <div
              key={week.weekKey}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Week Info */}
              <div className="min-w-[160px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Week {week.weekIndex}
                  </span>
                  {delta !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        delta > 0
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : delta < 0
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : delta < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      {delta > 0 ? `+${delta}%` : `${delta}%`}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  {week.label}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {week.fullyCompletedDays} 100% perfect days
                </p>
              </div>

              {/* Middle: Breakdown badges */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Habits: {week.habitCompletionRate}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tasks: {week.todoCompletionRate}%</span>
                </div>
              </div>

              {/* Right: Overall Progress Bar */}
              <div className="flex items-center gap-4 min-w-[140px] justify-between md:justify-end">
                <div className="w-28 bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      week.completionRate >= 80
                        ? 'bg-emerald-500'
                        : week.completionRate >= 50
                        ? 'bg-sky-500'
                        : 'bg-zinc-400'
                    }`}
                    style={{ width: `${week.completionRate}%` }}
                  />
                </div>
                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 min-w-[36px] text-right">
                  {week.completionRate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
