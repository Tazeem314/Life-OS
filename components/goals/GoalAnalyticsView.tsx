'use client';

import React from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Goal } from '@/lib/types';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Target,
  BarChart2,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface GoalAnalyticsViewProps {
  onSelectGoal: (goal: Goal) => void;
}

export function GoalAnalyticsView({ onSelectGoal }: GoalAnalyticsViewProps) {
  const { goals, goalAnalytics } = useLifeOS();

  const categories = Object.keys(goalAnalytics.byCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-500" />
          Goal Analytics &amp; Success Rates
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Measure completion efficiency, category performance, and milestone fulfillment across all horizons
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Completion Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Overall Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {goalAnalytics.overallCompletionRate}%
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            {goalAnalytics.completedGoals} of {goalAnalytics.totalGoals} goals accomplished
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${goalAnalytics.overallCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Milestone Completion Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Milestone Completion</span>
            <Target className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {goalAnalytics.milestoneCompletionRate}%
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            Key milestone delivery rate
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-sky-500 rounded-full"
              style={{ width: `${goalAnalytics.milestoneCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Active & On Track */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>On Track</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {goalAnalytics.onTrackGoals}
            </span>
            <span className="text-xs text-zinc-400">of {goalAnalytics.activeGoals} active</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            Maintaining projected velocity
          </div>
        </div>

        {/* At-Risk / Delayed */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>At Risk / Delayed</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
              {goalAnalytics.atRiskGoals + goalAnalytics.delayedGoals}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              ({goalAnalytics.delayedGoals} overdue)
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 font-mono">
            Require AI replanning / focus
          </div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-sky-500" />
          Category Performance &amp; Completion Breakdown
        </h3>

        {categories.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">No category data recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const data = goalAnalytics.byCategory[cat];
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{cat}</span>
                    <span className="font-mono text-zinc-500">
                      {data.completed}/{data.total} completed ({data.rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Imminent Deadlines Alert List */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-500" />
          Upcoming &amp; Critical Target Deadlines
        </h3>

        {goalAnalytics.upcomingDeadlines.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">No active deadlines pending.</p>
        ) : (
          <div className="space-y-2">
            {goalAnalytics.upcomingDeadlines.map((dl) => {
              const matchedGoal = goals.find((g) => g.id === dl.goalId);
              return (
                <div
                  key={dl.goalId}
                  onClick={() => matchedGoal && onSelectGoal(matchedGoal)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                    dl.isOverdue
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                      : dl.daysLeft <= 7
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
                      : 'bg-zinc-50/50 dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700 hover:border-sky-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        dl.isOverdue ? 'bg-rose-500' : dl.daysLeft <= 7 ? 'bg-amber-500' : 'bg-sky-500'
                      }`}
                    />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {dl.goalTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-zinc-400">{dl.deadline}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dl.isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : dl.daysLeft <= 7
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {dl.isOverdue ? `${Math.abs(dl.daysLeft)}d overdue` : `${dl.daysLeft}d remaining`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
