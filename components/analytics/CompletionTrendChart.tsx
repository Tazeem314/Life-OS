'use client';

import React, { useState } from 'react';
import { DailyMetric } from '@/lib/types';
import { motion } from 'motion/react';
import { TrendingUp, CheckCircle2, Sparkles, CheckSquare } from 'lucide-react';

interface CompletionTrendChartProps {
  dailyMetrics: DailyMetric[];
  title?: string;
  subtitle?: string;
}

export function CompletionTrendChart({
  dailyMetrics,
  title = 'Daily Completion Trend',
  subtitle = 'Completion rate across each day in the selected period',
}: CompletionTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (dailyMetrics.length === 0) {
    return (
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 text-center">
        <p className="text-sm text-zinc-500">No daily metrics recorded in this range.</p>
      </div>
    );
  }

  // Calculate average completion rate
  const activeDays = dailyMetrics.filter((d) => d.hasActivity);
  const avgCompletion =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.percentage, 0) / activeDays.length)
      : 0;

  const hoveredDay = hoveredIndex !== null ? dailyMetrics[hoveredIndex] : null;

  // Decide how many labels to display on X axis based on dataset size
  const totalDays = dailyMetrics.length;
  const labelInterval =
    totalDays <= 7 ? 1 : totalDays <= 14 ? 2 : totalDays <= 31 ? 4 : totalDays <= 90 ? 10 : 30;

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-500 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-500 dark:text-zinc-400">100% Perfect</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-zinc-500 dark:text-zinc-400">In Progress</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Avg: <span className="text-sky-600 dark:text-sky-400">{avgCompletion}%</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative pt-6 pb-2">
        {/* Floating Tooltip if hovering */}
        {hoveredDay && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-lg text-xs flex items-center gap-3 pointer-events-none transition-all duration-150">
            <span className="font-bold">{hoveredDay.shortDate} ({hoveredDay.dayName})</span>
            <span>•</span>
            <span className="font-bold text-emerald-400 dark:text-emerald-600">
              {hoveredDay.percentage}% Completed
            </span>
            <span>•</span>
            <span>
              Habits: {hoveredDay.completedHabits}/{hoveredDay.scheduledHabits}
            </span>
            <span>•</span>
            <span>
              To-Dos: {hoveredDay.completedTodos}/{hoveredDay.totalTodos}
            </span>
          </div>
        )}

        {/* Bar Graph Columns */}
        <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-4 border-b border-zinc-100 dark:border-zinc-800 relative">
          {dailyMetrics.map((day, idx) => {
            const isFull = day.isFullyCompleted;
            const hasItems = day.totalWorkload > 0;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={day.dateKey}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative"
              >
                <div
                  className={`w-full max-w-[32px] rounded-lg transition-all duration-200 ${
                    !hasItems
                      ? 'bg-zinc-100 dark:bg-zinc-800/60'
                      : isFull
                      ? isHovered
                        ? 'bg-emerald-400'
                        : 'bg-emerald-500'
                      : day.percentage > 0
                      ? isHovered
                        ? 'bg-sky-400'
                        : 'bg-gradient-to-t from-sky-600 to-indigo-500'
                      : 'bg-zinc-200 dark:bg-zinc-700/60'
                  }`}
                  style={{
                    height: hasItems ? `${Math.max(day.percentage, 8)}%` : '4%',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Date Labels */}
        <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 pt-2 px-1">
          {dailyMetrics.map((day, idx) => {
            const shouldShow =
              idx === 0 ||
              idx === dailyMetrics.length - 1 ||
              idx % labelInterval === 0;

            return (
              <span
                key={`lbl_${day.dateKey}`}
                className={`${shouldShow ? 'opacity-100 font-medium' : 'opacity-0'} truncate`}
              >
                {day.shortDate}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
