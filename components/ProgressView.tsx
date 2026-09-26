'use client';

import React, { useState, useMemo } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { TimeRangeOption, DateRange } from '@/lib/types';
import {
  getDateRangeFromOption,
  calculateDailyMetrics,
  calculateOverallAnalytics,
  calculateWeeklySummaries,
} from '@/lib/analytics';
import { getTodayKey, addDays } from '@/lib/date-utils';
import { TimeRangeSelector } from './analytics/TimeRangeSelector';
import { CompletionTrendChart } from './analytics/CompletionTrendChart';
import { ActivityHeatmap } from './analytics/ActivityHeatmap';
import { HabitAnalyticsSection } from './analytics/HabitAnalyticsSection';
import { TodoAnalyticsSection } from './analytics/TodoAnalyticsSection';
import { WeeklyComparisonSection } from './analytics/WeeklyComparisonSection';
import { MonthlyAnalyticsSection } from './analytics/MonthlyAnalyticsSection';
import { StreakAnalyticsSection } from './analytics/StreakAnalyticsSection';
import { ProductivityInsightsSection } from './analytics/ProductivityInsightsSection';
import {
  TrendingUp,
  CheckCircle2,
  Sparkles,
  CheckSquare,
  Flame,
  Calendar,
  Layers,
  Activity,
  Award,
  BarChart3,
} from 'lucide-react';

type AnalyticsSubTab = 'overview' | 'habits' | 'todos' | 'monthly' | 'heatmap' | 'streaks';

export function ProgressView() {
  const { habits, completions, todos } = useLifeOS();

  // Range and sub-tab states
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>('30d');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: addDays(getTodayKey(), -29),
    endDate: getTodayKey(),
  });
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');

  // Compute date range
  const dateRange = useMemo(() => {
    return getDateRangeFromOption(selectedRange, customRange);
  }, [selectedRange, customRange]);

  // Compute daily metrics & overall analytics for selected range
  const dailyMetrics = useMemo(() => {
    return calculateDailyMetrics(
      dateRange.startDate,
      dateRange.endDate,
      habits,
      completions,
      todos
    );
  }, [dateRange, habits, completions, todos]);

  const overall = useMemo(() => {
    return calculateOverallAnalytics(dailyMetrics);
  }, [dailyMetrics]);

  const weeklySummaries = useMemo(() => {
    return calculateWeeklySummaries(
      dateRange.startDate,
      dateRange.endDate,
      habits,
      completions,
      todos
    );
  }, [dateRange, habits, completions, todos]);

  const subTabs: { id: AnalyticsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'habits', label: 'Habits', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'todos', label: 'To-Dos', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'monthly', label: 'Monthly', icon: <Calendar className="w-4 h-4" /> },
    { id: 'heatmap', label: 'Heatmap', icon: <Activity className="w-4 h-4" /> },
    { id: 'streaks', label: 'Streaks', icon: <Flame className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Progress & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Data-grounded insights into your consistency, routines, and daily execution
          </p>
        </div>

        {/* Global Time Range Filter */}
        <TimeRangeSelector
          selectedRange={selectedRange}
          onSelectRange={setSelectedRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {/* 2. Primary KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Overall Completion Rate */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-sky-500/10 to-indigo-500/5 dark:from-sky-950/40 dark:to-indigo-950/20 border border-sky-200/60 dark:border-sky-900/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 truncate">
              Completion Rate
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {overall.completionRate}%
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
              {overall.totalCompleted} of {overall.totalScheduled} items
            </p>
          </div>
        </div>

        {/* 100% Perfect Days */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              Perfect Days
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {overall.fullyCompletedDays}
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
              100% across {overall.activeDays} days
            </p>
          </div>
        </div>

        {/* Habit Adherence */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
              Habits Done
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {overall.habitCompletionRate}%
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
              {overall.completedHabits}/{overall.scheduledHabits} checks
            </p>
          </div>
        </div>

        {/* Task Adherence */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 dark:from-indigo-950/40 dark:to-purple-950/20 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
              Tasks Done
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {overall.todoCompletionRate}%
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 truncate">
              {overall.completedTodos}/{overall.totalTodos} tasks
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/70 dark:border-zinc-700/60 overflow-x-auto no-scrollbar py-1">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs border border-zinc-200/80 dark:border-zinc-700'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Sub-Tab View Rendering */}
      <div className="space-y-6">
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            {/* Daily Trend Chart */}
            <CompletionTrendChart dailyMetrics={dailyMetrics} />

            {/* Habit Performance & Consistency Section */}
            <HabitAnalyticsSection
              habits={habits}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              completions={completions}
            />

            {/* Weekly Progression & Pacing */}
            <WeeklyComparisonSection
              habits={habits}
              completions={completions}
              todos={todos}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />

            {/* Activity Heatmap Preview */}
            <ActivityHeatmap habits={habits} completions={completions} todos={todos} />

            {/* Productivity Insights & All-Time Records */}
            <ProductivityInsightsSection
              habits={habits}
              completions={completions}
              todos={todos}
              dailyMetrics={dailyMetrics}
              weeklySummaries={weeklySummaries}
            />
          </div>
        )}

        {activeSubTab === 'habits' && (
          <HabitAnalyticsSection
            habits={habits}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            completions={completions}
          />
        )}

        {activeSubTab === 'todos' && (
          <TodoAnalyticsSection
            todos={todos}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}

        {activeSubTab === 'monthly' && (
          <MonthlyAnalyticsSection
            habits={habits}
            completions={completions}
            todos={todos}
          />
        )}

        {activeSubTab === 'heatmap' && (
          <ActivityHeatmap habits={habits} completions={completions} todos={todos} />
        )}

        {activeSubTab === 'streaks' && (
          <StreakAnalyticsSection
            habits={habits}
            completions={completions}
            todos={todos}
          />
        )}
      </div>
    </div>
  );
}
