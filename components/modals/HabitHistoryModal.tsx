'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Habit, TimeRangeOption } from '@/lib/types';
import { useLifeOS } from '@/context/LifeOSContext';
import { calculateHabitAnalytics, getDateRangeFromOption } from '@/lib/analytics';
import { parseDateKey, DAYS_SHORT } from '@/lib/date-utils';
import { X, Flame, Trophy, CheckCircle2, Calendar, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HABIT_ICONS } from './HabitModal';

interface HabitHistoryModalProps {
  isOpen: boolean;
  habit: Habit | null;
  onClose: () => void;
}

export function HabitHistoryModal({ isOpen, habit, onClose }: HabitHistoryModalProps) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto no-scrollbar"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                style={{ backgroundColor: habit.color || '#0284c7' }}
              >
                <IconComp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                  {habit.name}
                </h2>
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                    {habit.category || 'General'}
                  </span>
                  <span className="text-[11px] text-zinc-400 capitalize">
                    {habit.frequency}
                  </span>
                  {habit.status === 'paused' && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                      Paused
                    </span>
                  )}
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

          {/* Time range selector */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              History Window
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

          {/* Description if any */}
          {habit.description && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 italic bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              &ldquo;{habit.description}&rdquo;
            </p>
          )}

          {/* Streak Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50 text-center">
              <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-xs font-semibold">Streak</span>
              </div>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                {analytics.currentStreak}{' '}
                <span className="text-xs font-normal text-orange-600/80">days</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-semibold">Best</span>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {analytics.bestStreak}{' '}
                <span className="text-xs font-normal text-amber-600/80">days</span>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold">Rate</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {analytics.completionRate}%
              </p>
            </div>
          </div>

          {/* Consistency Matrix */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Daily Execution Matrix
              </h4>
              <span className="text-[11px] text-zinc-400">
                {analytics.completedOccurrences}/{analytics.scheduledOccurrences} completed
              </span>
            </div>

            <div className="max-h-44 overflow-y-auto p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl">
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                {analytics.history.map((day) => {
                  let cellStyle = 'bg-zinc-200/70 dark:bg-zinc-700/50 text-zinc-400 opacity-40';
                  let statusTitle = 'Not scheduled';

                  if (day.status === 'completed') {
                    cellStyle = 'bg-emerald-500 text-white font-bold shadow-2xs';
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

            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-200 dark:bg-rose-900 inline-block" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-zinc-200 dark:bg-zinc-700 opacity-40 inline-block" />
                <span>Rest day</span>
              </div>
            </div>
          </div>

          {/* Schedule Summary details */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Started:
              </span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{habit.startDate}</span>
            </div>
            {habit.reminderTime && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Daily Reminder:
                </span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{habit.reminderTime}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-2xl transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

