'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Habit, TimeRangeOption } from '@/lib/types';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  calculateHabitAnalytics,
  getDateRangeFromOption,
} from '@/lib/analytics';
import { parseDateKey, DAYS_SHORT } from '@/lib/date-utils';
import {
  X,
  Flame,
  Trophy,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { HABIT_ICONS } from './HabitModal';

interface HabitDetailAnalyticsModalProps {
  isOpen: boolean;
  habit: Habit | null;
  onClose: () => void;
}

export function HabitDetailAnalyticsModal({
  isOpen,
  habit,
  onClose,
}: HabitDetailAnalyticsModalProps) {
  const { completions } = useLifeOS();
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>('30d');

  if (!isOpen || !habit) return null;

  const dateRange = getDateRangeFromOption(selectedRange);
  const analytics = calculateHabitAnalytics(
    habit,
    dateRange.startDate,
    dateRange.endDate,
    completions
  );

  const IconComp = HABIT_ICONS.find((i) => i.name === habit.icon)?.Icon || CheckCircle2;

  const rangeOptions: { id: TimeRangeOption; label: string }[] = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '3m', label: '3M' },
    { id: '6m', label: '6M' },
    { id: '1y', label: '1Y' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3.5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                style={{ backgroundColor: habit.color || '#0284c7' }}
              >
                <IconComp className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {habit.name}
                  </h2>
                  {habit.status === 'paused' && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                      Paused
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                    {habit.category || 'General'}
                  </span>
                  <span className="text-xs text-zinc-400 capitalize">
                    {habit.frequency === 'daily'
                      ? 'Every Day'
                      : habit.frequency === 'weekdays'
                      ? 'Weekdays (Mon-Fri)'
                      : 'Weekly Schedule'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Time Range Pill Filter */}
          <div className="flex items-center justify-between mt-5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Analysis Period
            </span>
            <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedRange(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedRange === opt.id
                      ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {/* Completion Rate */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Rate
              </span>
              <p className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1">
                {analytics.completionRate}%
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {analytics.completedOccurrences}/{analytics.scheduledOccurrences} done
              </p>
            </div>

            {/* Current Streak */}
            <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Streak
                </span>
                <Flame className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-orange-700 dark:text-orange-300 mt-1">
                {analytics.currentStreak}{' '}
                <span className="text-xs font-normal text-zinc-500">Days</span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Current run</p>
            </div>

            {/* Best Streak */}
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Best
                </span>
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
                {analytics.bestStreak}{' '}
                <span className="text-xs font-normal text-zinc-500">Days</span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">All-time record</p>
            </div>

            {/* Trend */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pacing
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                {analytics.trend === 'improving' ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Improving
                    </span>
                  </>
                ) : analytics.trend === 'declining' ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                    <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      Declining
                    </span>
                  </>
                ) : analytics.trend === 'stable' ? (
                  <>
                    <Minus className="w-5 h-5 text-sky-500" />
                    <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                      Stable
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-zinc-400">Tracking...</span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Period momentum</p>
            </div>
          </div>

          {/* Consistency Matrix Grid */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Daily Consistency History
              </h4>
              <span className="text-[11px] text-zinc-400">
                {analytics.history.length} days displayed
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl">
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                {analytics.history.map((day) => {
                  let cellStyle = 'bg-zinc-200/70 dark:bg-zinc-700/50 text-zinc-400 opacity-40';
                  let statusTitle = 'Not Scheduled';

                  if (day.status === 'completed') {
                    cellStyle = 'bg-emerald-500 text-white font-bold shadow-xs';
                    statusTitle = 'Completed';
                  } else if (day.status === 'missed') {
                    cellStyle = 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900';
                    statusTitle = 'Missed';
                  } else if (day.status === 'future') {
                    cellStyle = 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-300 dark:text-zinc-600 border-dashed border border-zinc-200 dark:border-zinc-700';
                    statusTitle = 'Upcoming';
                  }

                  if (day.isToday) {
                    cellStyle += ' ring-2 ring-sky-500';
                  }

                  const dayObj = parseDateKey(day.dateKey);
                  const dayNum = dayObj.getDate();

                  return (
                    <div
                      key={day.dateKey}
                      title={`${day.dateKey}: ${statusTitle}`}
                      className={`h-7 rounded-lg flex items-center justify-center text-[11px] transition cursor-default ${cellStyle}`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Matrix Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 px-1 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                <span>Completed ({analytics.completedOccurrences})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-200 dark:bg-rose-900 inline-block" />
                <span>Missed ({analytics.missedOccurrences})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-zinc-200 dark:bg-zinc-700 opacity-40 inline-block" />
                <span>Off Schedule</span>
              </div>
            </div>
          </div>

          {/* Schedule Metadata details */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" /> Tracking Started:
              </span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {habit.startDate}
              </span>
            </div>
            {analytics.lastCompletedDate && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Last Completed:
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {analytics.lastCompletedDate}
                </span>
              </div>
            )}
            {habit.reminderTime && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500" /> Daily Reminder:
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {habit.reminderTime}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition shadow-2xs"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
