'use client';

import React from 'react';
import { Goal, GoalTimeHorizon } from '@/lib/types';
import {
  Layers,
  ChevronRight,
  Target,
  ArrowDown,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface GoalHierarchyViewProps {
  goals: Goal[];
  onSelectGoal: (goal: Goal) => void;
}

const HIERARCHY_LEVELS: { id: GoalTimeHorizon; label: string; desc: string }[] = [
  { id: 'long_term', label: 'Long-Term Vision', desc: 'Multi-year direction & master aspirations' },
  { id: 'this_year', label: 'Yearly Goals', desc: 'Annual strategic milestones' },
  { id: '6_months', label: '6-Month Mid-Term', desc: 'Semester / mid-year focus objectives' },
  { id: '3_months', label: 'Quarterly Objectives', desc: '12-week focused execution sprints' },
  { id: 'this_month', label: 'Monthly Targets', desc: 'Month-at-a-glance deliverables' },
  { id: 'this_week', label: 'Weekly Execution', desc: 'This week’s actionable commitments' },
  { id: 'today', label: 'Daily Actions & Tasks', desc: 'Immediate execution today' },
];

export function GoalHierarchyView({ goals, onSelectGoal }: GoalHierarchyViewProps) {
  // Group goals by level
  const goalsByLevel: Record<string, Goal[]> = {};
  HIERARCHY_LEVELS.forEach((level) => {
    goalsByLevel[level.id] = goals.filter((g) => g.timeHorizon === level.id);
  });

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-sky-50/70 dark:from-indigo-950/40 dark:to-sky-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
            Goal Hierarchy: Vision to Daily Action
          </h2>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl leading-relaxed">
          Connect macro aspirations to micro execution. Long-term goals cascade into yearly benchmarks, 6-month &amp; monthly milestones, and daily tasks.
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Target className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            No goals established yet
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Create goals across horizons to see your hierarchical execution tree.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {HIERARCHY_LEVELS.map((level, levelIdx) => {
            const levelGoals = goalsByLevel[level.id] || [];

            return (
              <div key={level.id} className="space-y-3">
                {/* Level Header */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">
                      {levelIdx + 1}
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-zinc-50">
                        {level.label}
                      </h3>
                      <span className="text-[11px] text-zinc-400 hidden sm:inline">{level.desc}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-medium text-zinc-400">
                    {levelGoals.length} goal{levelGoals.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Level Goals Grid */}
                {levelGoals.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                    No {level.label.toLowerCase()} defined yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {levelGoals.map((goal) => (
                      <div
                        key={goal.id}
                        onClick={() => onSelectGoal(goal)}
                        className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-600 shadow-2xs transition cursor-pointer flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-full">
                              {goal.category}
                            </span>
                            <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                              {goal.progress}%
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-1.5 truncate">
                            {goal.title}
                          </h4>
                          {goal.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                              {goal.description}
                            </p>
                          )}
                        </div>

                        {/* Progress line */}
                        <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-500 rounded-full"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>{goal.milestones?.length || 0} milestones</span>
                            <span>Due: {goal.targetDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Connector Arrow to Next Level */}
                {levelIdx < HIERARCHY_LEVELS.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
