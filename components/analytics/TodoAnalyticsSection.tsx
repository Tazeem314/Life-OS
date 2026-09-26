'use client';

import React from 'react';
import { Todo } from '@/lib/types';
import { calculateTodoAnalytics } from '@/lib/analytics';
import { CheckSquare, AlertCircle, CheckCircle2, Clock, BarChart2, Layers } from 'lucide-react';

interface TodoAnalyticsSectionProps {
  todos: Todo[];
  startDate: string;
  endDate: string;
}

export function TodoAnalyticsSection({
  todos,
  startDate,
  endDate,
}: TodoAnalyticsSectionProps) {
  const analytics = calculateTodoAnalytics(todos, startDate, endDate);

  if (analytics.totalTodos === 0) {
    return (
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 text-center">
        <CheckSquare className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          No Tasks Scheduled In This Period
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Add daily tasks in the To-Do tab to track priority breakdown and completion rates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Core Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Task Completion Rate */}
        <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Task Adherence
            </span>
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.completionRate}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {analytics.completedTodos} of {analytics.totalTodos} tasks completed
            </p>
          </div>
        </div>

        {/* Pending Backlog */}
        <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Pending Tasks
            </span>
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.pendingTodos}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Unfinished in selected period</p>
          </div>
        </div>

        {/* Daily Task Volume */}
        <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Daily Volume
            </span>
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {analytics.avgDailyTodos}{' '}
              <span className="text-xs font-semibold text-zinc-400">avg/day</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Across {analytics.activeDaysWithTodos} active task days
            </p>
          </div>
        </div>
      </div>

      {/* 2. Priority Breakdown Cards */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Priority-Based Execution Rate
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Compare completion rates across High, Medium, and Low urgency tasks
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* High Priority */}
          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> High Priority
              </span>
              <span className="text-sm font-black text-rose-700 dark:text-rose-300">
                {analytics.highPriority.rate}%
              </span>
            </div>
            <div className="w-full bg-rose-100 dark:bg-rose-950 h-2 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${analytics.highPriority.rate}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {analytics.highPriority.completed} of {analytics.highPriority.total} urgent tasks resolved
            </p>
          </div>

          {/* Medium Priority */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium Priority
              </span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-300">
                {analytics.mediumPriority.rate}%
              </span>
            </div>
            <div className="w-full bg-amber-100 dark:bg-amber-950 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${analytics.mediumPriority.rate}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {analytics.mediumPriority.completed} of {analytics.mediumPriority.total} tasks resolved
            </p>
          </div>

          {/* Low Priority */}
          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Low Priority
              </span>
              <span className="text-sm font-black text-sky-700 dark:text-sky-300">
                {analytics.lowPriority.rate}%
              </span>
            </div>
            <div className="w-full bg-sky-100 dark:bg-sky-950 h-2 rounded-full overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${analytics.lowPriority.rate}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {analytics.lowPriority.completed} of {analytics.lowPriority.total} low urgency tasks resolved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
