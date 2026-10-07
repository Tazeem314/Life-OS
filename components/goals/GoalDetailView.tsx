'use client';

import React, { useState, useMemo } from 'react';
import {
  Goal,
  GoalStatus,
  ChapterItem,
  ChapterTask,
  Milestone,
  GoalTask,
  SubtopicItem,
  GoalWeeklyReview,
} from '@/lib/types';
import {
  calculatePlannedVsActual,
  GOAL_STATUS_META,
  PRIORITY_META,
  detectGoalHealthRisks,
  calculateGoalProgress,
  generateChaptersPlan,
} from '@/lib/goal-service';
import { getTodayKey, addDays } from '@/lib/date-utils';
import {
  Target,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Layers,
  CalendarDays,
  CalendarRange,
  ListTodo,
  TrendingUp,
  RotateCcw,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Play,
  Pause,
  Edit2,
  ShieldAlert,
  Flame,
  Check,
} from 'lucide-react';

interface GoalDetailViewProps {
  goal: Goal;
  onBack: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onOpenAICopilot: (goal: Goal) => void;
  onOpenWeeklyReview: (goal: Goal) => void;
  onAddLinkedTodo?: (title: string, dueDate: string, goalId: string) => void;
}

type GoalTab =
  | 'overview'
  | 'roadmap'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'chapters'
  | 'tasks'
  | 'analytics'
  | 'reviews'
  | 'settings';

export function GoalDetailView({
  goal,
  onBack,
  onUpdateGoal,
  onDeleteGoal,
  onOpenAICopilot,
  onOpenWeeklyReview,
  onAddLinkedTodo,
}: GoalDetailViewProps) {
  const todayKey = getTodayKey();
  const [activeTab, setActiveTab] = useState<GoalTab>('overview');

  // Expanded Roadmap Tree sections (Section 27)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'milestones_all': true,
    'month_1': true,
  });

  // Task creation input
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedChapterForTask, setSelectedChapterForTask] = useState<string>('');

  // Settings tab states
  const [editDeadline, setEditDeadline] = useState(goal.deadline || goal.targetDate || '');

  // Live Planned vs Actual Analytics (Sections 7, 8, 20, 21)
  const analysis = useMemo(() => {
    return calculatePlannedVsActual(goal, todayKey);
  }, [goal, todayKey]);

  const risks = useMemo(() => {
    return detectGoalHealthRisks(goal, todayKey);
  }, [goal, todayKey]);

  const schedulePlan = useMemo(() => {
    return generateChaptersPlan(goal.chapters || [], goal.startDate, goal.bufferDays || 0);
  }, [goal.chapters, goal.startDate, goal.bufferDays]);

  const chapters = goal.chapters || [];
  const completedChapters = chapters.filter((c) => c.completed).length;

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Chapter completion toggle (Section 8, 9)
  const handleToggleChapter = (chapterId: string) => {
    const updatedChapters = chapters.map((ch) => {
      if (ch.id === chapterId) {
        const completed = !ch.completed;
        return {
          ...ch,
          completed,
          status: completed ? ('completed' as const) : ('in_progress' as const),
          progress: completed ? 100 : 0,
          tasks: (ch.tasks || []).map((t) => ({ ...t, completed })),
        };
      }
      return ch;
    });

    const newPlan = generateChaptersPlan(updatedChapters, goal.startDate, goal.bufferDays || 0);
    const updatedGoal: Goal = {
      ...goal,
      chapters: newPlan.chapters,
      milestones: newPlan.milestones,
      progress: calculateGoalProgress({ ...goal, chapters: newPlan.chapters }),
      updatedAt: new Date().toISOString(),
    };
    onUpdateGoal(updatedGoal);
  };

  // Chapter days modification (Section 34)
  const handleModifyChapterDays = (chapterId: string, newDays: number) => {
    const safeDays = Math.max(1, Math.min(30, newDays));
    const updatedChapters = chapters.map((ch) => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          assignedDays: safeDays,
          difficulty:
            safeDays <= 3 ? ('easy' as const) : safeDays <= 5 ? ('medium' as const) : safeDays <= 7 ? ('hard' as const) : ('very_hard' as const),
        };
      }
      return ch;
    });

    const newPlan = generateChaptersPlan(updatedChapters, goal.startDate, goal.bufferDays || 0);
    const updatedGoal: Goal = {
      ...goal,
      chapters: newPlan.chapters,
      milestones: newPlan.milestones,
      deadline: newPlan.targetDate,
      targetDate: newPlan.targetDate,
      progress: calculateGoalProgress({ ...goal, chapters: newPlan.chapters }),
      updatedAt: new Date().toISOString(),
    };
    onUpdateGoal(updatedGoal);
  };

  // Fixed item toggle (Section 29)
  const handleToggleFixedChapter = (chapterId: string) => {
    const updatedChapters = chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, isFixed: !ch.isFixed } : ch
    );
    onUpdateGoal({ ...goal, chapters: updatedChapters, updatedAt: new Date().toISOString() });
  };

  // Toggle chapter task
  const handleToggleChapterTask = (chapterId: string, taskId: string) => {
    const updatedChapters = chapters.map((ch) => {
      if (ch.id === chapterId) {
        const tasks = (ch.tasks || []).map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
        const doneCount = tasks.filter((t) => t.completed).length;
        return {
          ...ch,
          tasks,
          completed: allDone,
          status: allDone ? ('completed' as const) : doneCount > 0 ? ('in_progress' as const) : ('not_started' as const),
          progress: tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0,
        };
      }
      return ch;
    });

    const newPlan = generateChaptersPlan(updatedChapters, goal.startDate, goal.bufferDays || 0);
    const updatedGoal: Goal = {
      ...goal,
      chapters: newPlan.chapters,
      milestones: newPlan.milestones,
      progress: calculateGoalProgress({ ...goal, chapters: newPlan.chapters }),
      updatedAt: new Date().toISOString(),
    };
    onUpdateGoal(updatedGoal);
  };

  // Pause / Resume Goal (Section 32)
  const handleTogglePause = () => {
    const newStatus: GoalStatus = goal.status === 'paused' ? 'on_track' : 'paused';
    onUpdateGoal({
      ...goal,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  // Change Deadline (Section 33)
  const handleApplyDeadlineChange = () => {
    if (!editDeadline) return;
    onUpdateGoal({
      ...goal,
      deadline: editDeadline,
      targetDate: editDeadline,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add linked task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (onAddLinkedTodo) {
      onAddLinkedTodo(newTaskTitle.trim(), todayKey, goal.id);
    }

    // Also add to active chapter if available
    if (selectedChapterForTask) {
      const updatedChapters = chapters.map((ch) => {
        if (ch.id === selectedChapterForTask) {
          const newTask: ChapterTask = {
            id: `task_${Date.now()}`,
            title: newTaskTitle.trim(),
            completed: false,
          };
          return {
            ...ch,
            tasks: [...(ch.tasks || []), newTask],
          };
        }
        return ch;
      });
      onUpdateGoal({ ...goal, chapters: updatedChapters, updatedAt: new Date().toISOString() });
    }

    setNewTaskTitle('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Top Bar: Back navigation & quick actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition py-1.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Goals Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAICopilot(goal)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-xl hover:bg-sky-100 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>AI Copilot</span>
          </button>
          <button
            onClick={() => onOpenWeeklyReview(goal)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Weekly Review</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Card (Section 26) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${analysis.statusMeta.bg} ${analysis.statusMeta.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${analysis.statusMeta.dot}`} />
                {analysis.statusMeta.label}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${PRIORITY_META[goal.priority || 'medium'].badgeClass}`}>
                {PRIORITY_META[goal.priority || 'medium'].label} Priority
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {goal.category}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Due {goal.deadline || goal.targetDate}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {goal.title}
            </h1>
            {goal.why && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                Purpose: &quot;{goal.why}&quot;
              </p>
            )}
          </div>

          {/* Quick Metrics Cluster */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-center min-w-24">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Days Left</div>
              <div className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {analysis.daysRemaining}d
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-center min-w-24">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Variance</div>
              <div className={`text-lg font-mono font-bold ${analysis.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {analysis.difference >= 0 ? `+${analysis.difference}%` : `${analysis.difference}%`}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-center min-w-24">
              <div className="text-[10px] uppercase font-bold text-sky-700 dark:text-sky-300">Progress</div>
              <div className="text-lg font-mono font-bold text-sky-600 dark:text-sky-400">
                {analysis.actualProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar with Planned vs Actual Marker */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-zinc-500">
              {chapters.length > 0
                ? `${completedChapters} of ${chapters.length} Chapters Finished (${schedulePlan.totalStudyDays} Study Days)`
                : `${(goal.milestones || []).length} Milestones Scheduled`}
            </span>
            <span className="text-zinc-500">
              Planned Expected by Today: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{analysis.plannedProgress}%</span>
            </span>
          </div>

          <div className="relative w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
            {/* Actual progress bar */}
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

        {/* Risk Alerts Strip (Section 22) */}
        {risks.length > 0 && (
          <div className="pt-2 flex flex-col gap-2">
            {risks.map((risk) => (
              <div
                key={risk.id}
                className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">
                    {risk.title}
                  </span>
                  <span className="text-amber-800 dark:text-amber-300 block">
                    {risk.description} · <span className="underline font-semibold">{risk.suggestedAction}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. 10-Tab Navigation Strip (Section 26) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800 select-none">
        {[
          { id: 'overview', label: '1. Overview', icon: Target },
          { id: 'roadmap', label: '2. Roadmap Tree', icon: Layers },
          { id: 'monthly', label: '3. Monthly Plan', icon: CalendarRange },
          { id: 'weekly', label: '4. Weekly Schedule', icon: CalendarDays },
          { id: 'daily', label: '5. Daily Actions', icon: CheckCircle2 },
          { id: 'chapters', label: `6. Chapters (${chapters.length})`, icon: BookOpen },
          { id: 'tasks', label: '7. Linked Tasks', icon: ListTodo },
          { id: 'analytics', label: '8. Analytics', icon: TrendingUp },
          { id: 'reviews', label: '9. Reviews', icon: RotateCcw },
          { id: 'settings', label: '10. Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as GoalTab)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* This Week Target */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                Current Week Target
              </span>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {schedulePlan.weeklySchedules[0]?.summary || 'Maintain steady progress'}
              </h3>
              <p className="text-xs text-zinc-500">
                Week 1 covers: {schedulePlan.weeklySchedules[0]?.chapters.map((c) => c.chapter.title).join(', ')}
              </p>
            </div>

            {/* Buffer Health */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 block">
                Buffer Safeguard
              </span>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {goal.bufferDays || 3} Buffer Days Configured
              </h3>
              <p className="text-xs text-zinc-500">
                Safeguards against missed days, difficult topics, and unexpected revisions.
              </p>
            </div>

            {/* Pacing Velocity */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                Velocity &amp; Projection
              </span>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                {analysis.velocity}% / week
              </h3>
              <p className="text-xs text-zinc-500">
                Projected completion: {analysis.projectedEndDate}
              </p>
            </div>
          </div>

          {/* Active Chapter Focus */}
          {chapters.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-200 dark:border-sky-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                    🎯 Currently Active Chapter
                  </span>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-1">
                    {chapters.find((c) => !c.completed)?.title || 'All Chapters Completed 🎉'}
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 block">
                    {chapters.find((c) => !c.completed)?.assignedDays || 0} Days Assigned
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Difficulty: {chapters.find((c) => !c.completed)?.difficulty || 'standard'}
                  </span>
                </div>
              </div>

              {/* Subtopics of Active Chapter */}
              {chapters.find((c) => !c.completed)?.subtopics && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  {(chapters.find((c) => !c.completed)?.subtopics || []).map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold truncate">{st.title}</span>
                      <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                        {st.assignedDays}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ROADMAP TREE (Section 27) */}
      {/* ============================================================== */}
      {activeTab === 'roadmap' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              <span>Hierarchical Roadmap Tree</span>
            </h3>
            <span className="text-xs text-zinc-500">Click headers to expand or collapse</span>
          </div>

          <div className="font-mono text-xs space-y-3 pl-2 border-l-2 border-sky-400/40">
            {/* Goal Root */}
            <div className="font-bold text-sm text-sky-600 dark:text-sky-400">
              {goal.title} ({analysis.daysRemaining} days remaining)
            </div>

            {/* Months */}
            {schedulePlan.monthlySchedules.map((ms, mIdx) => (
              <div key={ms.monthKey} className="pl-4 space-y-2 border-l border-zinc-200 dark:border-zinc-800">
                <div
                  onClick={() => toggleNode(`m_${mIdx}`)}
                  className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 cursor-pointer hover:text-sky-600"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedNodes[`m_${mIdx}`] === false ? '-rotate-90' : ''}`} />
                  <span>├── {ms.monthLabel} ({ms.chapters.length} Chapters · {ms.totalDays} Study Days)</span>
                </div>

                {expandedNodes[`m_${mIdx}`] !== false && (
                  <div className="pl-6 space-y-1 text-zinc-600 dark:text-zinc-400">
                    {ms.chapters.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between py-0.5">
                        <span className={ch.completed ? 'line-through text-zinc-400' : ''}>
                          │   ├── {ch.title} ({ch.assignedDays}d · {ch.difficulty})
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {ch.completed ? '✓ Done' : ch.status === 'in_progress' ? 'Active' : 'Scheduled'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MONTHLY PLAN (Section 13) */}
      {/* ============================================================== */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedulePlan.monthlySchedules.map((ms) => (
              <div
                key={ms.monthKey}
                className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {ms.monthLabel}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500">{ms.totalDays} Days</span>
                </div>

                <div className="space-y-1.5">
                  {ms.chapters.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => handleToggleChapter(ch.id)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition ${
                        ch.completed
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 text-zinc-400 line-through'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {ch.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="font-semibold truncate">{ch.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400">{ch.assignedDays}d</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: WEEKLY SCHEDULE (Section 14) */}
      {/* ============================================================== */}
      {activeTab === 'weekly' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {schedulePlan.weeklySchedules.map((ws) => (
              <div
                key={ws.weekNumber}
                className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                      {ws.weekLabel}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {ws.summary}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 font-bold">
                    {ws.totalDaysInWeek} Days ({ws.startDate} to {ws.endDate})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  {ws.chapters.map(({ chapter, daysInWeek, isFullChapter }) => (
                    <div
                      key={chapter.id}
                      onClick={() => handleToggleChapter(chapter.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition ${
                        chapter.completed
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 text-zinc-400 line-through'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {chapter.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-400" />
                        )}
                        <span className="font-semibold">{chapter.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {daysInWeek}d {isFullChapter ? '(Full)' : '(Partial)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: DAILY ACTIONS (Section 15) */}
      {/* ============================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                  🎯 Focus For Today ({todayKey})
                </span>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-1">
                  Active Chapter: {chapters.find((c) => !c.completed)?.title || 'All Completed'}
                </h3>
              </div>
            </div>

            {/* Today Tasks */}
            <div className="space-y-2 pt-2">
              {(chapters.find((c) => !c.completed)?.tasks || []).map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleToggleChapterTask(chapters.find((c) => !c.completed)!.id, t.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                    t.completed
                      ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 line-through border-zinc-200 dark:border-zinc-800'
                      : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 shadow-2xs hover:border-emerald-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {t.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-400" />
                    )}
                    <span className="font-semibold">{t.title}</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    🎯 Due Today
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: CHAPTERS & EFFORT ENGINE (Sections 8, 9, 10, 28, 29, 34) */}
      {/* ============================================================== */}
      {activeTab === 'chapters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
                Custom Effort per Chapter &amp; Subtopics
              </h3>
              <p className="text-xs text-zinc-500">
                Adjust days on the fly with -/+ steppers. Dependent dates recalculate automatically.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className={`p-4 rounded-xl border space-y-3 transition ${
                  ch.completed
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleChapter(ch.id)}
                      className="text-zinc-400 hover:text-emerald-500 transition cursor-pointer"
                    >
                      {ch.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-400">
                          Ch {idx + 1}
                        </span>
                        <span className={`text-sm font-bold ${ch.completed ? 'line-through text-zinc-400' : 'text-zinc-950 dark:text-zinc-50'}`}>
                          {ch.title}
                        </span>
                        {ch.isFixed && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            Fixed Date
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span>Start: {ch.startDate}</span>
                        <span>•</span>
                        <span>End: {ch.endDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stepper & Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <button
                        onClick={() => handleModifyChapterDays(ch.id, ch.assignedDays - 1)}
                        className="text-zinc-500 hover:text-zinc-900 font-bold px-1"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs min-w-8 text-center">
                        {ch.assignedDays}d
                      </span>
                      <button
                        onClick={() => handleModifyChapterDays(ch.id, ch.assignedDays + 1)}
                        className="text-zinc-500 hover:text-zinc-900 font-bold px-1"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleFixedChapter(ch.id)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                        ch.isFixed
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {ch.isFixed ? 'Locked' : 'Flexible'}
                    </button>
                  </div>
                </div>

                {/* Subtasks inside Chapter */}
                {(ch.tasks || []).length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1 pl-8">
                    {ch.tasks!.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleToggleChapterTask(ch.id, t.id)}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer ${
                          t.completed ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {t.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-zinc-300" />
                          )}
                          <span>{t.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: TASKS (Section 16 - Reusing Existing Life OS Tasks) */}
      {/* ============================================================== */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Create a task linked to this goal (e.g. Solve Exercise 1.1 Q1–10)..."
              className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
            />
            {chapters.length > 0 && (
              <select
                value={selectedChapterForTask}
                onChange={(e) => setSelectedChapterForTask(e.target.value)}
                className="px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              >
                <option value="">Attach to chapter...</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Ch {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition disabled:opacity-40"
            >
              + Add Linked Task
            </button>
          </form>

          <p className="text-xs text-zinc-500">
            Completing tasks here or in the main To-Do view automatically advances this goal&apos;s progress.
          </p>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 8: ANALYTICS (Section 21) */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 uppercase font-bold">Velocity</span>
              <div className="text-2xl font-mono font-bold text-sky-600 mt-1">{analysis.velocity}% / week</div>
              <span className="text-[11px] text-zinc-500">Average weekly completion rate</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 uppercase font-bold">Planned vs Actual</span>
              <div className={`text-2xl font-mono font-bold mt-1 ${analysis.difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {analysis.difference >= 0 ? `+${analysis.difference}%` : `${analysis.difference}%`}
              </div>
              <span className="text-[11px] text-zinc-500">Expected: {analysis.plannedProgress}% · Actual: {analysis.actualProgress}%</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-xs text-zinc-400 uppercase font-bold">Projected Finish</span>
              <div className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100 mt-1">{analysis.projectedEndDate}</div>
              <span className="text-[11px] text-zinc-500">Official deadline: {goal.deadline}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 9: REVIEWS (Section 25) */}
      {/* ============================================================== */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
              Weekly Reviews &amp; Retrospectives
            </h3>
            <button
              onClick={() => onOpenWeeklyReview(goal)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer"
            >
              + Log Weekly Review
            </button>
          </div>

          {(goal.reviews || []).length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              No weekly reviews logged yet. Conduct a weekly review at the end of each week to synthesize what went well and what was missed.
            </div>
          ) : (
            <div className="space-y-3">
              {(goal.reviews || []).map((rev) => (
                <div key={rev.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{rev.weekLabel}</span>
                    <span className="font-mono text-zinc-400">{rev.createdAt.slice(0, 10)}</span>
                  </div>
                  {rev.aiSummary && <p className="text-zinc-600 dark:text-zinc-300 italic">&quot;{rev.aiSummary}&quot;</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 10: SETTINGS (Sections 32, 33, 30) */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-6 max-w-xl">
          {/* Pause / Resume Goal (Section 32) */}
          <div className="space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Pause or Resume Goal Schedule
            </h4>
            <p className="text-xs text-zinc-500">
              When paused, elapsed days do not count towards delays or risk score. Existing progress is preserved.
            </p>
            <button
              onClick={handleTogglePause}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer ${
                goal.status === 'paused'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200'
              }`}
            >
              {goal.status === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span>{goal.status === 'paused' ? 'Resume Goal Schedule' : 'Pause Goal'}</span>
            </button>
          </div>

          {/* Change Deadline (Section 33) */}
          <div className="space-y-2 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Change Deadline
            </h4>
            <div className="flex gap-2">
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              />
              <button
                onClick={handleApplyDeadlineChange}
                className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition"
              >
                Update Deadline
              </button>
            </div>
          </div>

          {/* Delete Goal */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wide">
              Danger Zone
            </h4>
            <button
              onClick={() => onDeleteGoal(goal)}
              className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 transition cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete This Goal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
