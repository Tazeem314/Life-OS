'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { getTodayKey, formatFullHeaderDate, getGreeting, isHabitScheduledForDate } from '@/lib/date-utils';
import { Habit, Todo } from '@/lib/types';
import { HABIT_ICONS } from './modals/HabitModal';
import { DailyQuoteCard } from '@/components/DailyQuoteCard';
import {
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  CheckSquare,
  Clock,
  Flag,
  Calendar as CalendarIcon,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  HelpCircle,
  Check,
  ListPlus,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenNewHabit: () => void;
  onOpenNewTodo: () => void;
  onEditHabit: (habit: Habit) => void;
  onEditTodo: (todo: Todo) => void;
  onViewHabitHistory: (habit: Habit) => void;
}

export function DashboardView({
  onOpenNewHabit,
  onOpenNewTodo,
  onEditHabit,
  onEditTodo,
  onViewHabitHistory,
}: DashboardViewProps) {
  const {
    habits,
    completions,
    todos,
    settings,
    todayProgress,
    overallStreaks,
    toggleHabitCompletion,
    toggleTodoCompletion,
    convertHabitToTodo,
    getHabitStreakInfo,
  } = useLifeOS();

  const todayKey = getTodayKey();
  const greeting = getGreeting();

  // Filter scheduled habits for today
  const scheduledHabitsToday = habits.filter((h) => {
    if (h.status === 'paused') {
      return completions.some((c) => c.habitId === h.id && c.date === todayKey);
    }
    return isHabitScheduledForDate(h.frequency, h.daysOfWeek, h.startDate, todayKey);
  });

  // Filter todos for today
  const todosToday = todos
    .filter((t) => t.date === todayKey)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const prioOrder = { high: 0, medium: 1, low: 2 };
      return prioOrder[a.priority] - prioOrder[b.priority];
    });

  const completionSet = new Set(
    completions.filter((c) => c.date === todayKey).map((c) => c.habitId)
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header with Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4 sm:pb-5">
        <div>
          <h1
            suppressHydrationWarning
            className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            <span suppressHydrationWarning>{greeting}</span>, {settings.userName || 'Champion'}
          </h1>
          <p
            suppressHydrationWarning
            className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 flex items-center gap-1.5 font-medium"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span suppressHydrationWarning>{formatFullHeaderDate(todayKey)}</span>
          </p>
        </div>

        {/* Action button cluster - responsive grid on small mobile, flex row on tablet/desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenNewHabit}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[42px] sm:min-h-[36px] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/80 rounded-xl transition cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Add Habit</span>
          </button>
          <button
            onClick={onOpenNewTodo}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[42px] sm:min-h-[36px] text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-xs transition cursor-pointer touch-manipulation active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add To-Do</span>
          </button>
        </div>
      </div>

      {/* Daily Legendary Quote */}
      <DailyQuoteCard todayKey={todayKey} />

      {/* 2. Structured Metrics Grid - Touch & Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Overall Completion */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">Daily Completion</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
              {todayProgress.percentage}%
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-zinc-400 truncate">
              {todayProgress.completedItems}/{todayProgress.totalItems} done
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2.5 sm:mt-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                todayProgress.isFullyCompleted ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{ width: `${todayProgress.percentage}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Habits Scheduled */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">Habits Today</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
              {todayProgress.completedHabits}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-zinc-400">
              / {todayProgress.totalHabits}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-2.5 sm:mt-3 font-mono tabular-nums truncate">
            {todayProgress.totalHabits - todayProgress.completedHabits > 0
              ? `${todayProgress.totalHabits - todayProgress.completedHabits} remaining`
              : 'All done'}
          </div>
        </div>

        {/* Metric 3: To-Dos Today */}
        <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">To-Dos Today</span>
            <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
              {todayProgress.completedTodos}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-zinc-400">
              / {todayProgress.totalTodos}
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-2.5 sm:mt-3 font-mono tabular-nums truncate">
            {todayProgress.totalTodos - todayProgress.completedTodos > 0
              ? `${todayProgress.totalTodos - todayProgress.completedTodos} open`
              : 'Clear'}
          </div>
        </div>

        {/* Metric 4: Daily Streak */}
        <div suppressHydrationWarning className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">Daily Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5 sm:gap-2">
            <span suppressHydrationWarning className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
              {overallStreaks.currentDailyStreak}
            </span>
            <span className="text-[10px] sm:text-[11px] text-zinc-400 truncate">days active</span>
          </div>
          <div suppressHydrationWarning className="text-[10px] sm:text-[11px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-2.5 sm:mt-3 truncate">
            Best: {overallStreaks.bestDailyStreak}d
          </div>
        </div>
      </div>

      {/* 3. Main Split Section: Today's Habits & Today's To-Dos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Today's Habits Column */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                Today&apos;s Habits
              </h2>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                ({todayProgress.completedHabits}/{todayProgress.totalHabits})
              </span>
            </div>
            <button
              onClick={onOpenNewHabit}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {scheduledHabitsToday.length === 0 ? (
              <div className="py-10 text-center">
                <Sparkles className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  No habits scheduled for today
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Create a recurring routine to build momentum.
                </p>
                <button
                  onClick={onOpenNewHabit}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 rounded-lg hover:bg-sky-100 transition"
                >
                  Create Habit
                </button>
              </div>
            ) : (
              scheduledHabitsToday.map((habit) => {
                const isCompleted = completionSet.has(habit.id);
                const streak = getHabitStreakInfo(habit);
                const IconComp = HABIT_ICONS.find((i) => i.name === habit.icon)?.Icon || Sparkles;

                return (
                  <div
                    key={habit.id}
                    className={`group p-2.5 sm:p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-75'
                        : 'bg-white dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Left: Checkbox & Title */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleHabitCompletion(habit.id, todayKey)}
                        className={`w-7 h-7 sm:w-6 sm:h-6 min-w-[28px] min-h-[28px] rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 touch-manipulation ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'border border-zinc-300 dark:border-zinc-600 hover:border-sky-500 text-transparent active:scale-95'
                        }`}
                        aria-label={isCompleted ? `Mark ${habit.name} uncompleted` : `Mark ${habit.name} completed`}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[2.5] ${isCompleted ? 'opacity-100' : 'opacity-0'}`} />
                      </button>

                      <div
                        className="w-7 h-7 sm:w-6 sm:h-6 min-w-[28px] min-h-[28px] rounded-lg flex items-center justify-center text-white shrink-0 text-xs shadow-2xs"
                        style={{ backgroundColor: habit.color || '#0284c7' }}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate transition-colors ${
                            isCompleted
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {habit.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                          {habit.category && (
                            <span className="truncate">{habit.category}</span>
                          )}
                          {habit.category && habit.reminderTime && <span>·</span>}
                          {habit.reminderTime && (
                            <span className="flex items-center gap-0.5 shrink-0">
                              <Clock className="w-3 h-3" />
                              {habit.reminderTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Streak & Actions with touch-friendly hit areas */}
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      <button
                        onClick={() => convertHabitToTodo(habit.id)}
                        title="Add this habit to today's To-Dos"
                        className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onViewHabitHistory(habit)}
                        title="View Streak History"
                        className="flex items-center gap-1 px-1.5 min-h-[32px] sm:min-h-[28px] rounded-lg text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer touch-manipulation"
                      >
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>{streak.currentStreak}d</span>
                      </button>
                      <button
                        onClick={() => onEditHabit(habit)}
                        className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation"
                        title="Edit Habit"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Today's To-Dos Column */}
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                Today&apos;s To-Dos
              </h2>
              <span className="text-xs font-mono tabular-nums text-zinc-400">
                ({todayProgress.completedTodos}/{todayProgress.totalTodos})
              </span>
            </div>
            <button
              onClick={onOpenNewTodo}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="space-y-2">
            {todosToday.length === 0 ? (
              <div className="py-10 text-center">
                <CheckSquare className="w-6 h-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Nothing scheduled for today
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Plan your daily action items.
                </p>
                <button
                  onClick={onOpenNewTodo}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg hover:bg-indigo-100 transition"
                >
                  Add Task
                </button>
              </div>
            ) : (
              todosToday.map((todo) => {
                let prioDot = 'bg-zinc-400';
                if (todo.priority === 'high') {
                  prioDot = 'bg-rose-500';
                } else if (todo.priority === 'medium') {
                  prioDot = 'bg-amber-500';
                }

                return (
                  <div
                    key={todo.id}
                    className={`group p-2.5 sm:p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                      todo.completed
                        ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-75'
                        : 'bg-white dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {/* Left: Checkbox & Title */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleTodoCompletion(todo.id)}
                        className={`w-7 h-7 sm:w-6 sm:h-6 min-w-[28px] min-h-[28px] rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 touch-manipulation ${
                          todo.completed
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'border border-zinc-300 dark:border-zinc-600 hover:border-indigo-500 text-transparent active:scale-95'
                        }`}
                        aria-label={todo.completed ? `Mark ${todo.title} uncompleted` : `Mark ${todo.title} completed`}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[2.5] ${todo.completed ? 'opacity-100' : 'opacity-0'}`} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs font-semibold truncate transition-colors ${
                            todo.completed
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {todo.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">
                          <span className="flex items-center gap-1 capitalize">
                            <span className={`w-1.5 h-1.5 rounded-full ${prioDot}`} />
                            {todo.priority}
                          </span>
                          {todo.dueTime && <span>·</span>}
                          {todo.dueTime && (
                            <span className="flex items-center gap-0.5 shrink-0">
                              <Clock className="w-3 h-3" />
                              {todo.dueTime}
                            </span>
                          )}
                          {todo.notes && <span>·</span>}
                          {todo.notes && (
                            <span className="truncate max-w-[120px] sm:max-w-[140px]">
                              {todo.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Edit with touch hit target */}
                    <button
                      onClick={() => onEditTodo(todo)}
                      className="w-8 h-8 sm:w-7 sm:h-7 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition cursor-pointer touch-manipulation shrink-0"
                      title="Edit To-Do"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
