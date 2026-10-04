'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Goal, GoalTimeHorizon, GoalStatus } from '@/lib/types';
import { TIME_HORIZONS, GOAL_CATEGORIES } from '@/lib/goal-service';
import { RoadmapTimelineView } from '@/components/goals/RoadmapTimelineView';
import { GoalHierarchyView } from '@/components/goals/GoalHierarchyView';
import { GoalAnalyticsView } from '@/components/goals/GoalAnalyticsView';
import {
  Target,
  Sparkles,
  Plus,
  Calendar,
  Layers,
  BarChart2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react';

interface GoalsViewProps {
  onOpenNewGoal: () => void;
  onOpenAICopilot: () => void;
  onOpenAIReview: () => void;
  onSelectGoal: (goal: Goal) => void;
}

type GoalSubView = 'dashboard' | 'timeline' | 'hierarchy' | 'analytics';

export function GoalsView({
  onOpenNewGoal,
  onOpenAICopilot,
  onOpenAIReview,
  onSelectGoal,
}: GoalsViewProps) {
  const {
    goals,
    dailyContributions,
    goalAnalytics,
    logGoalProgressIncrement,
    adjustGoalTracker,
  } = useLifeOS();

  const [currentView, setCurrentView] = useState<GoalSubView>('dashboard');
  const [selectedHorizon, setSelectedHorizon] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter goals for dashboard view
  const filteredGoals = goals.filter((g) => {
    if (selectedHorizon !== 'all' && g.timeHorizon !== selectedHorizon) return false;
    if (selectedCategory !== 'all' && g.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2.5">
              <span>Goals &amp; Roadmap</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
              {goals.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Transform high-level aspirations into actionable milestones, daily tasks, and measurable momentum.
          </p>
        </div>

        {/* Action Buttons Cluster */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAIReview}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 rounded-xl transition"
            title="Strategic Executive Review"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">AI Review</span>
          </button>

          <button
            onClick={onOpenAICopilot}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 rounded-xl shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={onOpenNewGoal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-Navigation View Modes */}
      <div className="flex items-center gap-1 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-x-auto pb-1">
        {[
          { id: 'dashboard', label: 'Goal Dashboard', icon: Target },
          { id: 'timeline', label: 'Roadmap Timeline', icon: Calendar },
          { id: 'hierarchy', label: 'Hierarchy & Cascade', icon: Layers },
          { id: 'analytics', label: 'Analytics & Success Rate', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as GoalSubView)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Conditional Sub-Views */}
      {currentView === 'timeline' && (
        <RoadmapTimelineView goals={goals} onSelectGoal={onSelectGoal} />
      )}

      {currentView === 'hierarchy' && (
        <GoalHierarchyView goals={goals} onSelectGoal={onSelectGoal} />
      )}

      {currentView === 'analytics' && (
        <GoalAnalyticsView onSelectGoal={onSelectGoal} />
      )}

      {currentView === 'dashboard' && (
        <div className="space-y-6">
          {/* Daily Goal Contributions Banner */}
          {dailyContributions.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Today&apos;s Goal Contributions ({dailyContributions.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {dailyContributions.map((dc) => (
                  <div
                    key={dc.goalId}
                    className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/20 text-xs flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                        {dc.goalTitle}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {dc.contribution}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                      +{dc.progressDelta}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <span className="text-[11px] text-zinc-400">Total Objectives</span>
              <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1">
                {goalAnalytics.totalGoals}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {goalAnalytics.activeGoals} active
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <span className="text-[11px] text-zinc-400">On Track</span>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                {goalAnalytics.onTrackGoals}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                Meeting pacing targets
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <span className="text-[11px] text-zinc-400">At Risk / Delayed</span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                {goalAnalytics.atRiskGoals + goalAnalytics.delayedGoals}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">
                {goalAnalytics.delayedGoals} overdue
              </div>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
              <span className="text-[11px] text-zinc-400">Accomplished</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {goalAnalytics.completedGoals}
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                {goalAnalytics.overallCompletionRate}% completion rate
              </div>
            </div>
          </div>

          {/* Time Horizon Filter Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedHorizon('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition ${
                  selectedHorizon === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                All Horizons ({goals.length})
              </button>
              {TIME_HORIZONS.map((h) => {
                const count = goals.filter((g) => g.timeHorizon === h.id).length;
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHorizon(h.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition flex items-center gap-1.5 ${
                      selectedHorizon === h.id
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{h.label}</span>
                    {count > 0 && <span className="text-[10px] font-mono opacity-80">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Category & Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-zinc-400 mr-1">Category:</span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                  selectedCategory === 'all'
                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                All
              </button>
              {GOAL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 text-[11px] rounded-md transition ${
                    selectedCategory === cat
                      ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}

              <span className="text-zinc-300 dark:text-zinc-700 mx-1.5">|</span>
              <span className="text-[11px] text-zinc-400 mr-1">Status:</span>
              {(['all', 'active', 'on_track', 'at_risk', 'delayed', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2 py-0.5 text-[11px] rounded-md capitalize transition ${
                    selectedStatus === st
                      ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Cards Grid */}
          {filteredGoals.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
              <Target className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {goals.length === 0 ? 'No goals established yet' : 'No goals match the active filter'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {goals.length === 0
                  ? 'Define your first objective or use the AI Goal Copilot to break down your vision into milestones.'
                  : 'Try selecting "All Horizons" or resetting status and category filters.'}
              </p>
              {goals.length === 0 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={onOpenAICopilot}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 rounded-xl shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Goal Copilot
                  </button>
                  <button
                    onClick={onOpenNewGoal}
                    className="px-4 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                  >
                    + Create Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal) => {
                let statusBadgeStyle = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
                if (goal.status === 'completed') {
                  statusBadgeStyle = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
                } else if (goal.status === 'on_track') {
                  statusBadgeStyle = 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
                } else if (goal.status === 'at_risk') {
                  statusBadgeStyle = 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
                } else if (goal.status === 'delayed') {
                  statusBadgeStyle = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
                }

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {goal.timeHorizon.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadgeStyle}`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Title & Category */}
                      <div className="mt-2.5">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          {goal.category}
                        </span>
                        <h3
                          onClick={() => onSelectGoal(goal)}
                          className="text-sm font-bold text-zinc-950 dark:text-zinc-50 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer mt-0.5 truncate"
                        >
                          {goal.title}
                        </h3>
                        {goal.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Trackers if applicable (e.g. Study chapters/questions) */}
                    {goal.relatedTrackers && goal.relatedTrackers.length > 0 && (
                      <div className="space-y-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        {goal.relatedTrackers.slice(0, 2).map((tr) => (
                          <div key={tr.id} className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]">
                              {tr.name}
                            </span>
                            <div className="flex items-center gap-1 font-mono">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px]">
                                {tr.current}/{tr.target}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  adjustGoalTracker(goal.id, tr.id, 1);
                                }}
                                className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-[10px] font-bold hover:bg-sky-200"
                                title="Add 1"
                              >
                                +1
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar & Milestone Count */}
                    <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50 text-base">
                          {goal.progress}%
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {goal.milestones?.filter((m) => m.status === 'completed' || m.progress >= 100).length || 0}/
                          {goal.milestones?.length || 0} milestones
                        </span>
                      </div>

                      <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            goal.progress >= 100
                              ? 'bg-emerald-500'
                              : goal.status === 'at_risk' || goal.status === 'delayed'
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${Math.min(100, goal.progress)}%` }}
                        />
                      </div>

                      {/* Footer Info & Details Button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {goal.targetDate}
                        </span>

                        <button
                          onClick={() => onSelectGoal(goal)}
                          className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
