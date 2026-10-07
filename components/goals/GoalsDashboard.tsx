'use client';

import React, { useState, useMemo } from 'react';
import { Goal, GoalStatus, GoalPriority } from '@/lib/types';
import {
  calculatePlannedVsActual,
  GOAL_STATUS_META,
  PRIORITY_META,
  BUILT_IN_CATEGORIES,
  calculateGoalAnalytics,
  GOAL_TEMPLATES,
} from '@/lib/goal-service';
import {
  Target,
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  SlidersHorizontal,
  Flame,
  ArrowUpRight,
} from 'lucide-react';

interface GoalsDashboardProps {
  goals: Goal[];
  onOpenCreateGoal: (templateId?: string) => void;
  onSelectGoal: (goal: Goal) => void;
  onOpenAICopilot: (goal?: Goal) => void;
}

export function GoalsDashboard({
  goals,
  onOpenCreateGoal,
  onSelectGoal,
  onOpenAICopilot,
}: GoalsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [viewFilter, setViewFilter] = useState<'active' | 'completed' | 'all'>('active');

  const analytics = useMemo(() => calculateGoalAnalytics(goals), [goals]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // View filter
      if (viewFilter === 'active' && (g.status === 'completed' || g.status === 'archived')) return false;
      if (viewFilter === 'completed' && g.status !== 'completed') return false;

      // Category filter
      if (selectedCategory !== 'All' && g.category.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'All' && g.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== 'All' && g.priority !== selectedPriority) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = g.title.toLowerCase().includes(query);
        const descMatch = (g.description || '').toLowerCase().includes(query);
        const whyMatch = (g.why || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !whyMatch) return false;
      }

      return true;
    });
  }, [goals, viewFilter, selectedCategory, selectedStatus, selectedPriority, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header with Stats & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                Goals &amp; Planning Engine
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Turn big objectives into realistic roadmaps, chapter-by-chapter effort, and daily execution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenAICopilot()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-xl transition border border-sky-200 dark:border-sky-800/60 shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>AI Goal Copilot</span>
          </button>
          <button
            onClick={() => onOpenCreateGoal()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Create Goal</span>
          </button>
        </div>
      </div>

      {/* 2. Top Intelligence Metrics Strip (Section 6, 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Metric 1: Active Goals */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Active Goals</div>
          <div className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {analytics.activeGoals}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{analytics.totalGoals} total registered</div>
        </div>

        {/* Metric 2: On Track */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">On Track</div>
          <div className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-300 mt-1">
            {analytics.onTrackGoals}
          </div>
          <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Meeting pacing</div>
        </div>

        {/* Metric 3: At Risk / Behind */}
        <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">At Risk / Lagging</div>
          <div className="text-xl font-mono font-bold text-amber-600 dark:text-amber-300 mt-1">
            {analytics.atRiskGoals + analytics.behindGoals}
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Need attention</div>
        </div>

        {/* Metric 4: Completed */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Completed</div>
          <div className="text-xl font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">
            {analytics.completedGoals}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{analytics.overallCompletionRate}% avg progress</div>
        </div>

        {/* Metric 5: Milestones Finished */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Milestone Rate</div>
          <div className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {analytics.milestoneCompletionRate}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Checkpoints cleared</div>
        </div>

        {/* Metric 6: Planned vs Actual Diff */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Planned vs Actual</div>
          <div className={`text-xl font-mono font-bold mt-1 ${analytics.plannedVsActualDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {analytics.plannedVsActualDiff >= 0 ? `+${analytics.plannedVsActualDiff}%` : `${analytics.plannedVsActualDiff}%`}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Average pace variance</div>
        </div>
      </div>

      {/* 3. Starter Templates Strip (Section 42 & 43) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-200/70 dark:border-sky-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5 text-sky-600" />
            <span>Quick Goal Templates (1-Click Setup)</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Pre-configured with realistic chapter days, non-equal duration weighting, and revision buffers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {GOAL_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onOpenCreateGoal(tmpl.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:border-sky-400 hover:text-sky-600 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{tmpl.title}</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-400" />
            </button>
          ))}
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals by title or why..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
            <button
              onClick={() => setViewFilter('active')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewFilter === 'active'
                  ? 'bg-sky-500 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewFilter('completed')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewFilter === 'completed'
                  ? 'bg-emerald-500 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setViewFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                viewFilter === 'all'
                  ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Dropdown filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl px-2.5 py-1.5 font-medium focus:outline-hidden"
          >
            <option value="All">All Categories</option>
            {BUILT_IN_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl px-2.5 py-1.5 font-medium focus:outline-hidden"
          >
            <option value="All">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* 5. Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-2xs">
            <Target className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              {searchQuery ? 'No matching goals found' : 'No Goals Scheduled Yet'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create a long-term goal with custom chapter effort, or launch the Class 10 Maths syllabus template
              to experience realistic non-equal day allocation.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenCreateGoal('class_10_maths_curriculum')}
              className="px-4 py-2 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-300 dark:border-sky-800 rounded-xl hover:bg-sky-100 transition cursor-pointer"
            >
              Load Class 10 Maths Template
            </button>
            <button
              onClick={() => onOpenCreateGoal()}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition shadow-xs cursor-pointer"
            >
              + Create Custom Goal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => {
            const analysis = calculatePlannedVsActual(goal);
            const statusMeta = analysis.statusMeta;
            const priorityMeta = PRIORITY_META[goal.priority || 'medium'];
            const chapters = goal.chapters || [];
            const completedChapters = chapters.filter((c) => c.completed).length;

            return (
              <div
                key={goal.id}
                onClick={() => onSelectGoal(goal)}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-600 transition cursor-pointer shadow-2xs flex flex-col justify-between gap-4 group"
              >
                {/* Top Row: Category, Status & Priority */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusMeta.bg} ${statusMeta.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                        {statusMeta.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityMeta.badgeClass}`}>
                        {priorityMeta.label}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {goal.category}
                    </span>
                  </div>

                  {/* Title and Why */}
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                      {goal.title}
                    </h3>
                    {goal.why && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 italic">
                        &quot;{goal.why}&quot;
                      </p>
                    )}
                  </div>

                  {/* Planned vs Actual Badge (Section 20) */}
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 grid grid-cols-3 gap-1 text-center text-xs">
                    <div>
                      <div className="text-[9px] uppercase font-bold text-zinc-400">Actual</div>
                      <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {analysis.actualProgress}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-zinc-400">Planned</div>
                      <div className="font-mono font-bold text-zinc-600 dark:text-zinc-300">
                        {analysis.plannedProgress}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase font-bold text-zinc-400">Variance</div>
                      <div
                        className={`font-mono font-bold ${
                          analysis.difference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {analysis.difference >= 0 ? `+${analysis.difference}%` : `${analysis.difference}%`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Footer */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-semibold text-zinc-500">
                        {chapters.length > 0
                          ? `${completedChapters} / ${chapters.length} Chapters`
                          : goal.measurementType === 'quantity'
                          ? `${goal.currentValue} / ${goal.targetValue} ${goal.unit || ''}`
                          : `${(goal.milestones || []).length} Milestones`}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {analysis.actualProgress}%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          analysis.actualProgress >= 100
                            ? 'bg-emerald-500'
                            : analysis.status === 'at_risk' || analysis.status === 'behind'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${analysis.actualProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {analysis.daysRemaining} days left
                    </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                      Open Roadmap <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
