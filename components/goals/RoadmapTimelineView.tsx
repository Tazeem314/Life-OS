'use client';

import React, { useState } from 'react';
import { Goal, Milestone } from '@/lib/types';
import { getTodayKey, addDays } from '@/lib/date-utils';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  Flag,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface RoadmapTimelineViewProps {
  goals: Goal[];
  onSelectGoal: (goal: Goal) => void;
}

export function RoadmapTimelineView({ goals, onSelectGoal }: RoadmapTimelineViewProps) {
  const [filterHorizon, setFilterHorizon] = useState<string>('all');
  const todayKey = getTodayKey();

  // Filter goals
  const filteredGoals = goals.filter((g) => {
    if (filterHorizon !== 'all' && g.timeHorizon !== filterHorizon) return false;
    return true;
  });

  // Collect all milestones sorted by deadline
  const timelineMilestones: { goal: Goal; milestone: Milestone }[] = [];
  filteredGoals.forEach((goal) => {
    (goal.milestones || []).forEach((milestone) => {
      timelineMilestones.push({ goal, milestone });
    });
  });

  timelineMilestones.sort((a, b) => {
    const da = a.milestone.deadline || a.goal.targetDate || '';
    const db = b.milestone.deadline || b.goal.targetDate || '';
    return da.localeCompare(db);
  });

  // Group milestones by Month (YYYY-MM)
  const groupedByMonth: Record<string, typeof timelineMilestones> = {};
  timelineMilestones.forEach((item) => {
    const d = item.milestone.deadline || item.goal.targetDate || todayKey;
    const monthKey = d.substring(0, 7); // e.g. "2026-10"
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(item);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" />
            Visual Roadmap Timeline
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Interactive chronological roadmap of milestones, objectives, and upcoming target deadlines
          </p>
        </div>

        {/* Horizon Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Horizons' },
            { id: 'this_month', label: 'This Month' },
            { id: '3_months', label: 'Next 3M' },
            { id: '6_months', label: 'Next 6M' },
            { id: 'this_year', label: 'Yearly' },
            { id: 'long_term', label: 'Long Term' },
          ].map((h) => (
            <button
              key={h.id}
              onClick={() => setFilterHorizon(h.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 transition ${
                filterHorizon === h.id
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {sortedMonths.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Calendar className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No roadmap milestones found
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            Add milestones to your goals to plot an interactive visual roadmap across months.
          </p>
        </div>
      ) : (
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800 before:z-0">
          {sortedMonths.map((monthKey) => {
            const dateObj = new Date(`${monthKey}-01T00:00:00`);
            const monthLabel = dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
            const items = groupedByMonth[monthKey];
            const isCurrentMonth = monthKey === todayKey.substring(0, 7);

            return (
              <div key={monthKey} className="relative z-10 space-y-3">
                {/* Month Marker Banner */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                      isCurrentMonth
                        ? 'bg-sky-600 text-white ring-4 ring-sky-100 dark:ring-sky-950'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{monthLabel}</h3>
                    {isCurrentMonth && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-full">
                        Current Month
                      </span>
                    )}
                    <span className="text-xs font-mono text-zinc-400">
                      ({items.length} milestone{items.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>

                {/* Milestone Cards for this month */}
                <div className="pl-10 space-y-2.5">
                  {items.map(({ goal, milestone }, idx) => {
                    const isDone = milestone.status === 'completed' || milestone.progress >= 100;
                    const isOverdue = !isDone && milestone.deadline && milestone.deadline < todayKey;

                    return (
                      <div
                        key={`${goal.id}_${milestone.id}_${idx}`}
                        onClick={() => onSelectGoal(goal)}
                        className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isDone
                            ? 'bg-zinc-50/70 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/40 opacity-75'
                            : isOverdue
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-300'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isOverdue
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                                : 'bg-sky-100 dark:bg-sky-950 text-sky-600'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                {goal.title}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-700">·</span>
                              <span className="text-[10px] text-zinc-400">{goal.category}</span>
                            </div>
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate mt-0.5 ${
                                isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {milestone.title}
                            </h4>
                            {milestone.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Deadline Badge */}
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div>
                            <div className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">
                              {milestone.deadline}
                            </div>
                            <div className="text-[10px] font-semibold">
                              {isDone ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Completed</span>
                              ) : isOverdue ? (
                                <span className="text-rose-600 dark:text-rose-400">Overdue</span>
                              ) : (
                                <span className="text-sky-600 dark:text-sky-400">Upcoming</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
