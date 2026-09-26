'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Todo, Priority } from '@/lib/types';
import {
  formatDisplayDate,
  formatFullHeaderDate,
  getTodayKey,
  addDays,
} from '@/lib/date-utils';
import {
  CheckSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Calendar,
  Check,
  AlignLeft,
} from 'lucide-react';

interface TodoViewProps {
  onOpenNewTodo: (date?: string) => void;
  onEditTodo: (todo: Todo) => void;
  onDeleteTodo: (todo: Todo) => void;
}

export function TodoView({ onOpenNewTodo, onEditTodo, onDeleteTodo }: TodoViewProps) {
  const {
    todos,
    selectedDate,
    setSelectedDate,
    goToToday,
    goToPrevDay,
    goToNextDay,
    toggleTodoCompletion,
    reorderTodos,
    getDayProgress,
  } = useLifeOS();

  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  const todayKey = getTodayKey();
  const dateProgress = getDayProgress(selectedDate);

  // Get todos for selected date
  const dateTodos = todos
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const filteredTodos = dateTodos.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (!showCompleted && t.completed) return false;
    return true;
  });

  const moveTodo = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dateTodos.length) return;
    reorderTodos(selectedDate, index, targetIndex);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Daily To-Dos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage date-specific tasks, assignments, and priorities
          </p>
        </div>
        <button
          onClick={() => onOpenNewTodo(selectedDate)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition self-stretch sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add To-Do</span>
        </button>
      </div>

      {/* Date Navigation Bar */}
      <div className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Day stepping buttons */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <button
              onClick={goToPrevDay}
              className="p-2 sm:p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition shrink-0"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center px-2 flex-1 sm:flex-initial">
              <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 block">
                {formatDisplayDate(selectedDate)}
              </span>
              <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 truncate">
                {formatFullHeaderDate(selectedDate)}
              </p>
            </div>
            <button
              onClick={goToNextDay}
              className="p-2 sm:p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 transition shrink-0"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Shortcuts & Date Picker */}
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2">
            <button
              onClick={() => setSelectedDate(addDays(todayKey, -1))}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedDate === addDays(todayKey, -1)
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={goToToday}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedDate === todayKey
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(addDays(todayKey, 1))}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedDate === addDays(todayKey, 1)
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              Tomorrow
            </button>

            {/* Native Date Picker */}
            <div className="relative flex items-center flex-1 sm:flex-initial">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="w-full sm:w-auto px-2.5 py-1 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Date completion bar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Tasks for this date: <strong>{dateProgress.completedTodos}</strong> /{' '}
            {dateProgress.totalTodos} done
          </span>
          {dateProgress.totalTodos > 0 && (
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.round(
                (dateProgress.completedTodos / (dateProgress.totalTodos || 1)) * 100
              )}
              % completed
            </span>
          )}
        </div>
      </div>

      {/* Priority Filters & Completed Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['all', 'high', 'medium', 'low'] as const).map((prio) => (
            <button
              key={prio}
              onClick={() => setPriorityFilter(prio)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                priorityFilter === prio
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              {prio} Priority
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium self-start sm:self-auto py-1"
        >
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </button>
      </div>

      {/* To-Do List */}
      {filteredTodos.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl">
          <CheckSquare className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {dateTodos.length === 0
              ? `No To-Dos scheduled for ${formatDisplayDate(selectedDate)}`
              : 'No matching tasks for current filters'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {dateTodos.length === 0
              ? 'Add tasks specifically for this day. Each day has its own independent list.'
              : 'Try clearing the priority filter or toggle show completed.'}
          </p>
          {dateTodos.length === 0 && (
            <button
              onClick={() => onOpenNewTodo(selectedDate)}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              + Add Task for {formatDisplayDate(selectedDate)}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filteredTodos.map((todo, idx) => {
              let prioColor = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
              let dotColor = 'bg-blue-500';

              if (todo.priority === 'high') {
                prioColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300';
                dotColor = 'bg-rose-500';
              } else if (todo.priority === 'medium') {
                prioColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';
                dotColor = 'bg-amber-500';
              }

              return (
                <motion.div
                  key={todo.id}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    todo.completed
                      ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
                  }`}
                >
                {/* Left Checkbox & Details */}
                <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTodoCompletion(todo.id)}
                    className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition-transform active:scale-90 shrink-0 ${
                      todo.completed
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-indigo-500 text-transparent'
                    }`}
                    aria-label={todo.completed ? `Mark ${todo.title} uncompleted` : `Mark ${todo.title} completed`}
                  >
                    <Check className={`w-4 h-4 stroke-[3] ${todo.completed ? 'opacity-100' : 'opacity-0'}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        todo.completed
                          ? 'line-through text-zinc-400 dark:text-zinc-500'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {todo.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      <span className={`flex items-center gap-1 px-1.5 py-0.2 rounded font-semibold text-[11px] capitalize shrink-0 ${prioColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {todo.priority}
                      </span>

                      {todo.dueTime && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {todo.dueTime}
                        </span>
                      )}

                      {todo.notes && (
                        <span className="flex items-center gap-1 italic text-zinc-500 dark:text-zinc-400 truncate max-w-[140px] sm:max-w-xs">
                          <AlignLeft className="w-3 h-3 shrink-0" />
                          <span className="truncate">{todo.notes}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Reorder & Actions */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {/* Reordering buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveTodo(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveTodo(idx, 'down')}
                      disabled={idx === filteredTodos.length - 1}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onEditTodo(todo)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    title="Edit To-Do"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteTodo(todo)}
                    className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                    title="Delete To-Do"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
