'use client';

import React from 'react';
import { Habit, HabitCompletion, Todo } from '@/lib/types';
import { calculateStreakHistory, calculateHabitAnalytics } from '@/lib/analytics';
import { getTodayKey, parseDateKey } from '@/lib/date-utils';
import { HABIT_ICONS } from '@/components/modals/HabitModal';
import { Flame, Trophy, CheckCircle2, History, Award, Sparkles } from 'lucide-react';

interface StreakAnalyticsSectionProps {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
}

export function StreakAnalyticsSection({
  habits,
  completions,
  todos,
}: StreakAnalyticsSectionProps) {
  const streakIntervals = calculateStreakHistory(habits, completions, todos);
  const todayKey = getTodayKey();

  // Calculate habit streak leaderboards
  const habitStreaks = habits
    .map((h) => {
      const stats = calculateHabitAnalytics(h, h.startDate, todayKey, completions);
      return {
        habit: h,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        totalCompletions: stats.completedOccurrences,
      };
    })
    .sort((a, b) => b.currentStreak - a.currentStreak);

  return (
    <div className="space-y-6">
      {/* 1. Habit Streak Leaderboard */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Individual Habit Streaks Leaderboard
          </h2>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Ranked by current continuous consecutive execution run
        </p>

        {habitStreaks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {habitStreaks.map((item) => {
              const IconComp =
                HABIT_ICONS.find((i) => i.name === item.habit.icon)?.Icon || CheckCircle2;

              return (
                <div
                  key={item.habit.id}
                  className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 text-xs shadow-2xs"
                      style={{ backgroundColor: item.habit.color || '#0284c7' }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.habit.name}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Best: {item.bestStreak}d • {item.totalCompletions} checks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1.5 rounded-xl border border-orange-200/50 dark:border-orange-900/40 shrink-0">
                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                    <span>{item.currentStreak}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic py-2">No habits configured yet.</p>
        )}
      </div>

      {/* 2. Historical Daily Streaks Timeline */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Historical 100% Daily Streaks Timeline
          </h2>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Chronological record of all consecutive 100% perfect completion windows
        </p>

        {streakIntervals.length > 0 ? (
          <div className="space-y-2.5 pt-1">
            {streakIntervals.map((interval) => {
              const startFormatted = parseDateKey(interval.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const endFormatted = parseDateKey(interval.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={interval.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    interval.isCurrent
                      ? 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 shadow-2xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        interval.isCurrent
                          ? 'bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {startFormatted} &rarr; {endFormatted}
                        </span>
                        {interval.isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300">
                            Active Run
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {interval.lengthDays} consecutive days of full execution
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    {interval.lengthDays} Days
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic py-2">
            No continuous 100% daily streak records yet. Complete all scheduled items today to start your first streak!
          </p>
        )}
      </div>
    </div>
  );
}
