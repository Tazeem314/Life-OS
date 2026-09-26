'use client';

import React, { useState } from 'react';
import { Habit, HabitCompletion, Todo } from '@/lib/types';
import { calculateMonthlyAnalytics, calculateAllHabitsAnalytics } from '@/lib/analytics';
import { HABIT_ICONS } from '@/components/modals/HabitModal';
import { HabitDetailAnalyticsModal } from '@/components/modals/HabitDetailAnalyticsModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface MonthlyAnalyticsSectionProps {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
}

export function MonthlyAnalyticsSection({
  habits,
  completions,
  todos,
}: MonthlyAnalyticsSectionProps) {
  const currentDate = new Date();
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth());
  const [inspectingHabit, setInspectingHabit] = useState<Habit | null>(null);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setCurrentYear(currentDate.getFullYear());
    setCurrentMonth(currentDate.getMonth());
  };

  const monthly = calculateMonthlyAnalytics(currentYear, currentMonth, habits, completions, todos);

  // First and last day of selected month for habit stats
  const firstDayKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const lastDayKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const habitStats = calculateAllHabitsAnalytics(habits, firstDayKey, lastDayKey, completions);

  return (
    <div className="space-y-6">
      {/* Month Navigator Header */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {monthly.monthName} {monthly.year}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Full monthly audit, habit execution cadence, and daily consistency records
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            Current Month
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {monthly.isFuture ? (
        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
          <CalendarIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Future Month
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            This month is upcoming. Analytics will generate automatically as tasks and habits are scheduled.
          </p>
        </div>
      ) : !monthly.hasData ? (
        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center">
          <Clock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No Activity Recorded in {monthly.monthName} {monthly.year}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Navigate to a month with recorded habits or tasks to view historical performance.
          </p>
        </div>
      ) : (
        <>
          {/* Monthly Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Monthly Rate */}
            <div className="p-5 rounded-3xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/40 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Monthly Rate
              </span>
              <p className="text-3xl font-black text-sky-700 dark:text-sky-300 mt-2">
                {monthly.completionRate}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {monthly.totalCompleted} of {monthly.totalScheduled} items completed
              </p>
            </div>

            {/* Perfect Days */}
            <div className="p-5 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                100% Perfect Days
              </span>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
                {monthly.fullyCompletedDays}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Zero missed scheduled items</p>
            </div>

            {/* Habit Adherence */}
            <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                <span>Habit Adherence</span>
              </div>
              <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-2">
                {monthly.habitCompletionRate}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">Across active habit routines</p>
            </div>

            {/* Task Adherence */}
            <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Task Adherence</span>
              </div>
              <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mt-2">
                {monthly.todoCompletionRate}%
              </p>
              <p className="text-xs text-zinc-500 mt-1">Across all {monthly.totalTodos} tasks</p>
            </div>
          </div>

          {/* Daily Bar Progression for the Month */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Daily Completion Matrix ({monthly.monthName})
            </h3>

            <div className="h-40 flex items-end gap-1 pt-4 pb-1 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
              {monthly.dailyMetrics.map((day) => {
                const dayNum = day.dateObj.getDate();
                const isFull = day.isFullyCompleted;

                return (
                  <div
                    key={day.dateKey}
                    title={`${day.dateKey}: ${day.percentage}% (${day.completedWorkload}/${day.totalWorkload})`}
                    className="flex-1 min-w-[14px] h-full flex flex-col items-center justify-end group cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-sm transition-all ${
                        !day.hasActivity
                          ? 'bg-zinc-100 dark:bg-zinc-800'
                          : isFull
                          ? 'bg-emerald-500'
                          : day.percentage > 0
                          ? 'bg-sky-500'
                          : 'bg-zinc-200 dark:bg-zinc-700'
                      }`}
                      style={{
                        height: day.hasActivity ? `${Math.max(day.percentage, 10)}%` : '4%',
                      }}
                    />
                    <span className="text-[9px] text-zinc-400 mt-1">{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Habits Breakdown */}
          {habitStats.all.length > 0 && (
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Habit Execution in {monthly.monthName}
              </h3>

              <div className="space-y-2.5">
                {habitStats.all.map((item) => {
                  const IconComp =
                    HABIT_ICONS.find((i) => i.name === item.habit.icon)?.Icon || CheckCircle2;

                  return (
                    <div
                      key={item.habitId}
                      onClick={() => setInspectingHabit(item.habit)}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-sky-300 dark:hover:border-sky-800 transition cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 text-xs"
                          style={{ backgroundColor: item.habit.color || '#0284c7' }}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-sky-600 transition">
                          {item.habit.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-zinc-500">
                          {item.completedOccurrences}/{item.scheduledOccurrences} done
                        </span>
                        <span className="text-xs font-black text-sky-600 dark:text-sky-400 min-w-[36px] text-right">
                          {item.completionRate}%
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-sky-600 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Habit Detailed Analytics Modal */}
      <HabitDetailAnalyticsModal
        isOpen={!!inspectingHabit}
        habit={inspectingHabit}
        onClose={() => setInspectingHabit(null)}
      />
    </div>
  );
}
