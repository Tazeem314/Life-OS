'use client';

import React, { useState, useMemo } from 'react';
import { Habit, HabitCompletion, Todo, HeatmapDay } from '@/lib/types';
import { generateHeatmapData } from '@/lib/analytics';
import { parseDateKey, DAYS_SHORT } from '@/lib/date-utils';
import { Activity, CheckCircle2, Sparkles, CheckSquare, Calendar as CalendarIcon, Info } from 'lucide-react';

interface ActivityHeatmapProps {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
}

export function ActivityHeatmap({ habits, completions, todos }: ActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Generate 36-52 weeks heatmap
  const heatmapData = useMemo(() => {
    return generateHeatmapData(habits, completions, todos, 36);
  }, [habits, completions, todos]);

  const activeDayToInspect = selectedDay || hoveredDay;

  // Level colors
  const getCellColor = (level: number, isToday: boolean, isFuture: boolean) => {
    if (isFuture) return 'bg-zinc-100/50 dark:bg-zinc-800/30 border-dashed border-zinc-200 dark:border-zinc-800 cursor-not-allowed';
    switch (level) {
      case 5:
        return 'bg-emerald-500 text-white font-bold hover:ring-2 hover:ring-emerald-400';
      case 4:
        return 'bg-sky-500 text-white hover:ring-2 hover:ring-sky-400';
      case 3:
        return 'bg-sky-400/80 text-white hover:ring-2 hover:ring-sky-300';
      case 2:
        return 'bg-sky-200 dark:bg-sky-900/60 hover:ring-2 hover:ring-sky-400';
      case 1:
        return 'bg-sky-100 dark:bg-sky-950/80 hover:ring-2 hover:ring-sky-300';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Activity & Consistency Heatmap
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Daily completion density over the past 36 weeks (Tap any box to inspect)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>Less</span>
          <span className="w-3 h-3 rounded-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700" title="0% No Activity" />
          <span className="w-3 h-3 rounded-xs bg-sky-100 dark:bg-sky-950/80" title="1-25% Low" />
          <span className="w-3 h-3 rounded-xs bg-sky-200 dark:bg-sky-900/60" title="26-50% Moderate" />
          <span className="w-3 h-3 rounded-xs bg-sky-400/80" title="51-75% High" />
          <span className="w-3 h-3 rounded-xs bg-sky-500" title="76-99% Very High" />
          <span className="w-3 h-3 rounded-xs bg-emerald-500" title="100% Perfect Completion" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="overflow-x-auto no-scrollbar pb-2 pt-1">
        <div className="inline-block min-w-full">
          {/* Month Header Row */}
          <div className="flex text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5 pl-7">
            {heatmapData.weeks.map((_, weekIdx) => {
              const monthLabel = heatmapData.months.find((m) => m.weekIndex === weekIdx);
              return (
                <div key={`m_${weekIdx}`} className="w-3.5 sm:w-4 shrink-0 text-left">
                  {monthLabel ? monthLabel.label : ''}
                </div>
              );
            })}
          </div>

          {/* 7 Rows (Sunday to Saturday) */}
          <div className="flex gap-1.5">
            {/* Day of week labels */}
            <div className="flex flex-col justify-between text-[9px] font-medium text-zinc-400 dark:text-zinc-500 pr-1 select-none h-[112px]">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks columns */}
            <div className="flex gap-1 sm:gap-1.5">
              {heatmapData.weeks.map((week, wIdx) => (
                <div key={`w_${wIdx}`} className="flex flex-col gap-1 sm:gap-1.5">
                  {week.map((day) => {
                    const isSelected = selectedDay?.dateKey === day.dateKey;
                    const cellColor = getCellColor(day.level, day.isToday, day.isFuture);

                    return (
                      <button
                        key={day.dateKey}
                        onClick={() => !day.isFuture && setSelectedDay(day)}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        disabled={day.isFuture}
                        aria-label={`${day.dateKey}: ${day.percentage}% completed (${day.completedItems}/${day.totalItems} items)`}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all relative ${cellColor} ${
                          isSelected ? 'ring-2 ring-sky-600 dark:ring-sky-400 scale-125 z-10' : ''
                        } ${day.isToday ? 'outline-1 outline-offset-1 outline-sky-500' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Day Inspector Box */}
      {activeDayToInspect && !activeDayToInspect.isFuture && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center font-bold">
              <span className="text-[10px] text-zinc-400">{DAYS_SHORT[activeDayToInspect.dayOfWeek]}</span>
              <span className="text-zinc-900 dark:text-zinc-100">{activeDayToInspect.dayNumber}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {parseDateKey(activeDayToInspect.dateKey).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {activeDayToInspect.isFullyCompleted && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                    100% Complete
                  </span>
                )}
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                {activeDayToInspect.totalItems > 0
                  ? `${activeDayToInspect.completedItems} of ${activeDayToInspect.totalItems} total items finished (${activeDayToInspect.percentage}%)`
                  : 'No scheduled habits or to-dos on this day'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>
                Habits: {activeDayToInspect.completedHabits}/{activeDayToInspect.scheduledHabits}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                To-Dos: {activeDayToInspect.completedTodos}/{activeDayToInspect.totalTodos}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
