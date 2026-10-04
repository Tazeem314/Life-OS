'use client';

import React from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Goal, Milestone, GoalTracker } from '@/lib/types';
import {
  X,
  Target,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  BookOpen,
  Edit2,
  Trash2,
  RotateCcw,
  Plus,
  Minus,
  CheckSquare,
  AlertTriangle,
  Flame,
  Layers,
} from 'lucide-react';
import { getTodayKey } from '@/lib/date-utils';

interface GoalDetailModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onOpenReplan: (goal: Goal) => void;
}

export function GoalDetailModal({
  isOpen,
  goal,
  onClose,
  onEdit,
  onDelete,
  onOpenReplan,
}: GoalDetailModalProps) {
  const {
    habits,
    todos,
    goals,
    updateMilestone,
    adjustGoalTracker,
    logGoalProgressIncrement,
  } = useLifeOS();

  if (!isOpen || !goal) return null;

  const todayKey = getTodayKey();
  const parentGoal = goal.parentGoalId ? goals.find((g) => g.id === goal.parentGoalId) : null;
  const childGoals = goals.filter((g) => g.parentGoalId === goal.id);

  // Status styling
  let statusBadge = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
  if (goal.status === 'completed') {
    statusBadge = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
  } else if (goal.status === 'on_track') {
    statusBadge = 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300';
  } else if (goal.status === 'at_risk') {
    statusBadge = 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
  } else if (goal.status === 'delayed') {
    statusBadge = 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300';
  }

  // Linked items
  const linkedHabitObjects = habits.filter((h) => (goal.relatedHabits || []).includes(h.id));
  const linkedTodoObjects = todos.filter((t) => (goal.relatedTasks || []).includes(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge}`}>
                  {goal.status.replace('_', ' ')}
                </span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {goal.timeHorizon.replace('_', ' ')}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{goal.category}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                {goal.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Hierarchy Breadcrumb if applicable */}
          {parentGoal && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Part of Parent Objective:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {parentGoal.title} ({parentGoal.timeHorizon})
              </span>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {goal.description}
            </p>
          )}

          {/* Progress Bar & Numerical Target */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-zinc-50">
                  {goal.progress}%
                </span>
                <span className="text-xs text-zinc-400 ml-2">completed</span>
              </div>
              <div className="text-right text-xs font-mono text-zinc-500">
                {goal.measurementType !== 'checkbox' && (
                  <span>
                    {goal.currentValue} / {goal.targetValue} {goal.unit || ''}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden">
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

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span>Started: {goal.startDate}</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-500" />
                Deadline: {goal.targetDate}
              </span>
            </div>
          </div>

          {/* Quick Progress Adjusters for Number / Counter Goals */}
          {(goal.measurementType === 'counter' || goal.measurementType === 'number') && (
            <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-900/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Log Progress ({goal.unit || 'units'}):
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => logGoalProgressIncrement(goal.id, -1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                  title="Minus 1"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => logGoalProgressIncrement(goal.id, 1)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500"
                >
                  +1
                </button>
                <button
                  onClick={() => logGoalProgressIncrement(goal.id, 5)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500"
                >
                  +5
                </button>
                <button
                  onClick={() => logGoalProgressIncrement(goal.id, 10)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500"
                >
                  +10
                </button>
              </div>
            </div>
          )}

          {/* Trackers Section (Study / Academic / Workout / Savings) */}
          {goal.relatedTrackers && goal.relatedTrackers.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                Active Trackers &amp; Benchmarks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {goal.relatedTrackers.map((tr) => {
                  const pct = tr.target > 0 ? Math.min(100, Math.round((tr.current / tr.target) * 100)) : 0;
                  return (
                    <div
                      key={tr.id}
                      className="p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{tr.name}</span>
                        <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                          {tr.current} / {tr.target} {tr.unit}
                        </span>
                      </div>

                      <div className="w-full bg-zinc-100 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-zinc-400">{pct}% reached</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustGoalTracker(goal.id, tr.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => adjustGoalTracker(goal.id, tr.id, 1)}
                            className="px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold"
                          >
                            +1
                          </button>
                          {tr.unit === 'questions' && (
                            <button
                              onClick={() => adjustGoalTracker(goal.id, tr.id, 10)}
                              className="px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold"
                            >
                              +10
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones Breakdown */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
                Milestones ({goal.milestones?.length || 0})
              </h3>
              <span className="text-[11px] text-zinc-400">
                {goal.milestones?.filter((m) => m.status === 'completed' || m.progress >= 100).length} of{' '}
                {goal.milestones?.length || 0} completed
              </span>
            </div>

            {(!goal.milestones || goal.milestones.length === 0) ? (
              <p className="text-xs text-zinc-400 italic py-2">No milestones defined for this goal.</p>
            ) : (
              <div className="space-y-2">
                {goal.milestones.map((m, idx) => {
                  const isDone = m.status === 'completed' || m.progress >= 100;
                  return (
                    <div
                      key={m.id || idx}
                      className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/40 opacity-80'
                          : 'bg-white dark:bg-zinc-850 border-zinc-200 dark:border-zinc-700/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() =>
                            updateMilestone(goal.id, m.id, {
                              status: isDone ? 'in_progress' : 'completed',
                              progress: isDone ? 0 : 100,
                            })
                          }
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'border border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 text-transparent'
                          }`}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-semibold ${
                              isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {m.title}
                          </p>
                          {m.description && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {m.deadline && (
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0 self-center">
                          {m.deadline}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked Habits & Tasks Preview */}
          {(linkedHabitObjects.length > 0 || linkedTodoObjects.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              {linkedHabitObjects.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    Linked Habits ({linkedHabitObjects.length})
                  </span>
                  <ul className="space-y-1">
                    {linkedHabitObjects.map((h) => (
                      <li key={h.id} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{h.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {linkedTodoObjects.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Linked Tasks ({linkedTodoObjects.length})
                  </span>
                  <ul className="space-y-1">
                    {linkedTodoObjects.map((t) => (
                      <li key={t.id} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        <span className={`truncate ${t.completed ? 'line-through text-zinc-400' : ''}`}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {goal.notes && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Strategy &amp; Roadmap Notes:
              </span>
              <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{goal.notes}</p>
            </div>
          )}

          {/* Child Goals if any */}
          {childGoals.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-500" />
                Sub-Objectives ({childGoals.length})
              </span>
              <div className="space-y-1.5">
                {childGoals.map((cg) => (
                  <div
                    key={cg.id}
                    className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{cg.title}</span>
                    <span className="font-mono text-zinc-500">{cg.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                onClose();
                onOpenReplan(goal);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Replan with AI
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onDelete(goal);
                }}
                className="p-2 text-zinc-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Delete Goal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(goal);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Goal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
