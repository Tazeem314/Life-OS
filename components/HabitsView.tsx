'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Habit } from '@/lib/types';
import { getTodayKey, isHabitScheduledForDate, DAYS_SHORT } from '@/lib/date-utils';
import { HABIT_ICONS, CATEGORIES } from './modals/HabitModal';
import {
  Sparkles,
  Plus,
  Flame,
  Pause,
  Play,
  Edit2,
  Trash2,
  History,
  Clock,
  Calendar,
  Filter,
  CheckCircle2,
  Check,
  ListPlus,
  BarChart3,
} from 'lucide-react';

interface HabitsViewProps {
  onOpenNewHabit: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
  onViewHabitHistory: (habit: Habit) => void;
  onViewHabitAnalytics?: (habit: Habit) => void;
}

export function HabitsView({
  onOpenNewHabit,
  onEditHabit,
  onDeleteHabit,
  onViewHabitHistory,
  onViewHabitAnalytics,
}: HabitsViewProps) {
  const { habits, completions, togglePauseHabit, toggleHabitCompletion, convertHabitToTodo, getHabitStreakInfo } =
    useLifeOS();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const todayKey = getTodayKey();

  const filteredHabits = habits.filter((h) => {
    if (statusFilter !== 'all' && h.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && h.category !== categoryFilter) return false;
    return true;
  });

  const completionSet = new Set(
    completions.filter((c) => c.date === todayKey).map((c) => c.habitId)
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4 sm:pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Habit Management
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1">
            Build sustainable routines with scheduled recurring habits
          </p>
        </div>
        <button
          onClick={onOpenNewHabit}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] sm:min-h-[38px] bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition w-full sm:w-auto shrink-0 cursor-pointer touch-manipulation active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Filter Toolbar - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        {/* Status Segmented Control - Even 3-column grid on mobile */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-lg w-full sm:w-auto">
          {(['all', 'active', 'paused'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[30px] rounded-md text-xs font-medium capitalize text-center sm:whitespace-nowrap transition cursor-pointer touch-manipulation ${
                statusFilter === status
                  ? 'bg-sky-500 text-white dark:bg-sky-600 shadow-2xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400'
              }`}
            >
              {status} <span className="font-mono tabular-nums opacity-85 text-[11px]">({status === 'all' ? habits.length : habits.filter((h) => h.status === status).length})</span>
            </button>
          ))}
        </div>

        {/* Category Select - Touch-friendly height */}
        <div className="flex items-center gap-2 px-1 self-stretch sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 min-h-[38px] sm:min-h-[32px] text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Habits List / Grid */}
      {filteredHabits.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
          <Sparkles className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {habits.length === 0 ? 'No habits yet' : 'No matching habits found'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {habits.length === 0
              ? 'Create your first recurring habit to build discipline and keep your daily streak.'
              : 'Try changing your filter settings to see other habits.'}
          </p>
          {habits.length === 0 && (
            <button
              onClick={onOpenNewHabit}
              className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs transition"
            >
              + Create Your First Habit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <AnimatePresence initial={false}>
            {filteredHabits.map((habit) => {
              const streak = getHabitStreakInfo(habit);
              const isCompletedToday = completionSet.has(habit.id);
              const isScheduledToday = isHabitScheduledForDate(
                habit.frequency,
                habit.daysOfWeek,
                habit.startDate,
                todayKey
              );
              const isPaused = habit.status === 'paused';
              const IconComp = HABIT_ICONS.find((i) => i.name === habit.icon)?.Icon || Sparkles;

              return (
                <div
                  key={habit.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isPaused
                      ? 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-70'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 text-sm shadow-2xs"
                        style={{ backgroundColor: habit.color || '#0284c7' }}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                            {habit.name}
                          </h3>
                          {isPaused && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              (Paused)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                          <span className="truncate">{habit.category || 'General'}</span>
                          <span>·</span>
                          <span className="capitalize">{habit.frequency}</span>
                          {habit.reminderTime && <span>·</span>}
                          {habit.reminderTime && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {habit.reminderTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Streak Badge */}
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 text-xs font-mono tabular-nums shrink-0">
                      <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{streak.currentStreak}d</span>
                    </div>
                  </div>

                  {/* Description */}
                  {habit.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 line-clamp-2">
                      {habit.description}
                    </p>
                  )}

                  {/* Frequency Days Pills - Touch & Mobile Friendly */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {DAYS_SHORT.map((day, idx) => {
                      const isScheduled = habit.frequency === 'daily' || habit.daysOfWeek.includes(idx);
                      return (
                        <span
                          key={day}
                          title={`${day}: ${isScheduled ? 'Scheduled' : 'Rest day'}`}
                          className={`w-7 h-7 sm:w-6 sm:h-6 rounded-lg text-[11px] sm:text-[10px] font-mono font-medium flex items-center justify-center transition-colors ${
                            isScheduled
                              ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/90 dark:border-sky-800/70 font-semibold shadow-2xs'
                              : 'bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-600 border border-transparent'
                          }`}
                        >
                          {day[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions & Today's quick toggle - Responsive wrap on narrow screens */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                  {/* Today completion button if scheduled */}
                  {isScheduledToday && !isPaused ? (
                    <button
                      onClick={() => toggleHabitCompletion(habit.id, todayKey)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation active:scale-95 ${
                        isCompletedToday
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isCompletedToday ? 'text-white' : 'text-zinc-400'}`} />
                      <span>{isCompletedToday ? 'Done Today' : 'Mark Done'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-zinc-400 py-1">
                      {isPaused ? 'Paused' : 'Not scheduled today'}
                    </span>
                  )}

                  {/* Management Icon Buttons with touch-friendly hit areas */}
                  <div className="flex items-center gap-0.5 sm:gap-1 ml-auto sm:ml-0">
                    <button
                      onClick={() => convertHabitToTodo(habit.id)}
                      title="Add to today's To-Dos"
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onViewHabitAnalytics ? onViewHabitAnalytics(habit) : onViewHabitHistory(habit)}
                      title="Habit Analytics"
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onViewHabitHistory(habit)}
                      title="Streak History"
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => togglePauseHabit(habit.id)}
                      title={isPaused ? 'Resume habit' : 'Pause habit'}
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onEditHabit(habit)}
                      title="Edit habit"
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteHabit(habit)}
                      title="Delete habit"
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition cursor-pointer touch-manipulation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
