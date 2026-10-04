'use client';

import React, { useState } from 'react';
import { Goal, AIReplanGeneratedResult, Milestone } from '@/lib/types';
import { getTodayKey } from '@/lib/date-utils';
import {
  Sparkles,
  X,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface AIReplanModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onApplyReplan: (goalId: string, replanResult: AIReplanGeneratedResult) => void;
}

export function AIReplanModal({ isOpen, goal, onClose, onApplyReplan }: AIReplanModalProps) {
  const [reason, setReason] = useState('Fell behind schedule, need to calibrate pacing and redistribute milestones');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replanResult, setReplanResult] = useState<AIReplanGeneratedResult | null>(null);

  if (!isOpen || !goal) return null;

  const todayKey = getTodayKey();
  const targetDate = goal.targetDate || todayKey;
  const daysRemaining = Math.max(
    0,
    Math.round((new Date(targetDate).getTime() - new Date(todayKey).getTime()) / (1000 * 60 * 60 * 24))
  );

  const handleGenerateReplan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setReplanResult(null);

    try {
      const res = await fetch('/api/goals/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          reason,
          daysRemaining,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate replanned roadmap.');
      }

      setReplanResult(data.replan);
    } catch (err: any) {
      console.error('Replanning error:', err);
      setError(err.message || 'Error formulating adjustment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmApply = () => {
    if (!replanResult) return;
    onApplyReplan(goal.id, replanResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                Adaptive AI Replanner
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Calibrate workload &amp; milestones without losing past progress
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Current Status Banner */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{goal.title}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                {goal.status.replace('_', ' ')}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-400">Progress</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{goal.progress}%</div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-400">Target Date</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{goal.targetDate}</div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-400">Days Left</div>
                <div className="font-bold text-zinc-900 dark:text-zinc-100">{daysRemaining}d</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
              {error}
            </div>
          )}

          {!replanResult ? (
            <form onSubmit={handleGenerateReplan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  Reason for Replanning &amp; Current Constraint
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Fell sick for 10 days, need to redistribute remaining 4 chapters and 200 questions across the next 4 weeks..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    Safe Calibration Principle:
                  </span>{' '}
                  The AI replanner will analyze remaining time and redistribute milestones without deleting any completed work. You will review and confirm all changes before they apply.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Pacing &amp; Recalibrating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Adaptive Replan
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Replanning Summary */}
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sky-900 dark:text-sky-200">Replanning Proposal</span>
                  <span className="px-2 py-0.5 rounded-md font-semibold bg-sky-200 dark:bg-sky-800 text-sky-800 dark:text-sky-200">
                    Revised: {replanResult.revisedStatus.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  {replanResult.pacingSummary}
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {replanResult.workloadRedistribution}
                </p>
              </div>

              {/* Adjusted Milestones */}
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  Proposed Milestone Schedule Adjustments
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {replanResult.adjustedMilestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{m.title}</span>
                      </div>
                      <span className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold shrink-0">
                        {m.deadline}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Priorities */}
              {replanResult.recommendedPriorities && replanResult.recommendedPriorities.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Immediate Catch-Up Priorities
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    {replanResult.recommendedPriorities.map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirm Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReplanResult(null)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Adjust Parameters
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Reject Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>Confirm &amp; Apply Schedule</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
