'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { getMonthDays, formatDisplayDate, formatFullHeaderDate, getTodayKey, isHabitScheduledForDate, DAYS_SHORT } from '@/lib/date-utils';
import { Habit, Todo } from '@/lib/types';
import { HABIT_ICONS } from './modals/HabitModal';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  CheckSquare,
  Flame,
  Check,
  Plus,
  Clock,
  Edit2,
  Trash2,
  History,
} from 'lucide-react';

interface CalendarViewProps {
  onOpenNewTodo: (date: string) => void;
  onOpenNewHabit: () => void;
  onEditTodo?: (todo: Todo) => void;
  onDeleteTodo?: (todo: Todo) => void;
  onEditHabit?: (habit: Habit) => void;
  onDeleteHabit?: (habit: Habit) => void;
  onViewHabitHistory?: (habit: Habit) => void;
}

export function CalendarView({
  onOpenNewTodo,
  onOpenNewHabit,
  onEditTodo,
  onDeleteTodo,
  onEditHabit,
  onDeleteHabit,
  onViewHabitHistory,
}: CalendarViewProps) {
  const {
    habits,
    completions,
    todos,
    selectedDate,
    setSelectedDate,
    getDayProgress,
    toggleHabitCompletion,
    toggleTodoCompletion,
  } = useLifeOS();

  const todayKey = getTodayKey();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthData = getMonthDays(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayKey);
  };

  // Day Inspector data for selectedDate
  const inspectedProgress = getDayProgress(selectedDate);
  const inspectedHabits = habits.filter((h) => {
    if (h.status === 'paused') {
      return completions.some((c) => c.habitId === h.id && c.date === selectedDate);
    }
    return isHabitScheduledForDate(h.frequency, h.daysOfWeek, h.startDate, selectedDate);
  });
  const inspectedTodos = todos.filter((t) => t.date === selectedDate);
  const completionSet = new Set(
    completions.filter((c) => c.date === selectedDate).map((c) => c.habitId)
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Calendar & History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track daily completion history and inspect any date
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial justify-between sm:justify-start">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition shrink-0"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 sm:px-3 py-1 font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 min-w-[110px] sm:min-w-[140px] text-center truncate">
              {monthData.monthName} {monthData.year}
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition shrink-0"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={goToCurrentMonth}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-xl transition shrink-0"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Calendar Grid (2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2 sm:pb-3 border-b border-zinc-100 dark:border-zinc-800">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="truncate">{d.slice(0, 2)}</div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2 sm:mt-3">
            {monthData.days.map((item) => {
              const dayProgress = getDayProgress(item.dateKey);
              const isSelected = selectedDate === item.dateKey;
              const isToday = todayKey === item.dateKey;
              const hasActivity = dayProgress.totalItems > 0;
              const isFull = dayProgress.isFullyCompleted;

              let cellBg = item.isCurrentMonth
                ? 'bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200'
                : 'bg-zinc-50/20 dark:bg-zinc-900/20 text-zinc-400 dark:text-zinc-600 opacity-40';

              if (isSelected) {
                cellBg = 'bg-sky-50 dark:bg-sky-950/60 border-2 border-sky-500 text-sky-950 dark:text-sky-100 shadow-xs';
              } else if (isFull) {
                cellBg = 'bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300/60 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200';
              }

              return (
                <button
                  key={item.dateKey}
                  onClick={() => setSelectedDate(item.dateKey)}
                  className={`min-h-[54px] sm:min-h-[82px] p-1 sm:p-2 rounded-xl sm:rounded-2xl flex flex-col justify-between text-left transition-all active:scale-95 ${cellBg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-sm font-bold ${
                        isToday
                          ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-sky-600 text-white flex items-center justify-center -ml-0.5 -mt-0.5'
                          : ''
                      }`}
                    >
                      {item.dayNumber}
                    </span>

                    {isFull && (
                      <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2 sm:w-2.5 h-2 sm:h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Activity dots & percentage */}
                  {hasActivity ? (
                    <div className="w-full space-y-0.5 sm:space-y-1 mt-0.5 sm:mt-1">
                      <div className="hidden sm:flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                        <span>
                          {dayProgress.completedItems}/{dayProgress.totalItems}
                        </span>
                        <span className="font-semibold">
                          {dayProgress.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1 sm:h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isFull ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${dayProgress.percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block text-[10px] text-zinc-400 dark:text-zinc-600 italic">
                      No tasks
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-xs text-zinc-500 dark:text-zinc-400 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600 inline-block" />
              <span>Empty</span>
            </div>
          </div>
        </div>

        {/* Day Inspector Panel (1 col on desktop) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            {/* Inspector Header */}
            <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Day Details</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {formatDisplayDate(selectedDate)}
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {formatFullHeaderDate(selectedDate)}
              </p>

              {/* Day Progress Summary */}
              <div className="mt-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Day Completion</span>
                  <span className="text-sky-600 dark:text-sky-400">
                    {inspectedProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className={`h-full rounded-full ${
                      inspectedProgress.isFullyCompleted ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${inspectedProgress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-400 mt-2">
                  <span>Habits: {inspectedProgress.completedHabits}/{inspectedProgress.totalHabits}</span>
                  <span>To-Dos: {inspectedProgress.completedTodos}/{inspectedProgress.totalTodos}</span>
                </div>
              </div>
            </div>

            {/* Habits for this date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  Scheduled Habits
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {inspectedProgress.completedHabits}/{inspectedProgress.totalHabits}
                </span>
              </div>

              {inspectedHabits.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2">No habits scheduled for this day.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectedHabits.map((habit) => {
                    const isDone = completionSet.has(habit.id);

                    return (
                      <div
                        key={habit.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                          <button
                            onClick={() => toggleHabitCompletion(habit.id, selectedDate)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 active:scale-90 ${
                              isDone
                                ? 'bg-emerald-500 text-white'
                                : 'border-2 border-zinc-300 dark:border-zinc-600'
                            }`}
                          >
                            {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <span
                            className={`truncate font-medium ${
                              isDone ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {habit.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onViewHabitHistory && (
                            <button
                              onClick={() => onViewHabitHistory(habit)}
                              className="p-1 rounded text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
                              title="View History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onEditHabit && (
                            <button
                              onClick={() => onEditHabit(habit)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                              title="Edit Habit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteHabit && (
                            <button
                              onClick={() => onDeleteHabit(habit)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                              title="Delete Habit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* To-Dos for this date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  To-Dos for Day
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {inspectedProgress.completedTodos}/{inspectedProgress.totalTodos}
                </span>
              </div>

              {inspectedTodos.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2">No To-Dos for this day.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {inspectedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                        <button
                          onClick={() => toggleTodoCompletion(todo.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 active:scale-90 ${
                            todo.completed
                              ? 'bg-indigo-600 text-white'
                              : 'border-2 border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span
                          className={`truncate font-medium ${
                            todo.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {todo.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {todo.dueTime && (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-0.5 mr-1">
                            <Clock className="w-3 h-3" />
                            {todo.dueTime}
                          </span>
                        )}
                        {onEditTodo && (
                          <button
                            onClick={() => onEditTodo(todo)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
                            title="Edit To-Do"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTodo && (
                          <button
                            onClick={() => onDeleteTodo(todo)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="Delete To-Do"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Add buttons for this selected date */}
          <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
            <button
              onClick={onOpenNewHabit}
              className="py-2.5 px-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-xl transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add Habit</span>
            </button>
            <button
              onClick={() => onOpenNewTodo(selectedDate)}
              className="py-2.5 px-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
