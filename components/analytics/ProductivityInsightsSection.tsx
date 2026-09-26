'use client';

import React from 'react';
import { Habit, HabitCompletion, Todo, DailyMetric, WeeklySummary } from '@/lib/types';
import { generateProductivityInsights, calculatePersonalRecords } from '@/lib/analytics';
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
  Lightbulb,
} from 'lucide-react';

interface ProductivityInsightsSectionProps {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  dailyMetrics: DailyMetric[];
  weeklySummaries: WeeklySummary[];
}

export function ProductivityInsightsSection({
  habits,
  completions,
  todos,
  dailyMetrics,
  weeklySummaries,
}: ProductivityInsightsSectionProps) {
  const insights = generateProductivityInsights(
    habits,
    completions,
    todos,
    dailyMetrics,
    weeklySummaries
  );
  const records = calculatePersonalRecords(habits, completions, todos);

  const getRecordIcon = (iconName: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'trophy':
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'zap':
        return <Zap className="w-5 h-5 text-indigo-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. All-Time Personal Records Grid */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Personal All-Time Milestones
          </h2>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Highest recorded consistency and productivity benchmarks
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  {rec.title}
                </span>
                <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-700">
                  {getRecordIcon(rec.icon)}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {rec.value}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{rec.subtext}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Intelligent Data Observations */}
      {insights.length > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-sky-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Productivity Observations & Patterns
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Pattern analysis grounded purely in your real execution logs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {insight.title}
                    </span>
                    {insight.tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                        {insight.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>

                {insight.metric && (
                  <div className="text-right">
                    <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                      {insight.metric}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
