'use client';

import React, { useState } from 'react';
import { Goal, GoalStatus } from '@/lib/types';
import { generateLocalReplanProposal } from '@/lib/goal-service';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface GoalAIModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onApplyPlanChanges: (goalId: string, changes: any) => void;
}

export function GoalAIModal({
  isOpen,
  goal,
  onClose,
  onApplyPlanChanges,
}: GoalAIModalProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposal, setProposal] = useState<{
    pacingSummary: string;
    revisedStatus: GoalStatus;
    workloadRedistribution: string;
    proposedChanges: {
      id: string;
      type: string;
      description: string;
      impact: string;
    }[];
    scheduleAdjustmentAdvice: string;
  } | null>(null);

  if (!isOpen || !goal) return null;

  const handleRequestAIReplan = async (customText?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/goals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replan_recovery',
          goalData: {
            title: goal.title,
            progress: goal.progress,
            plannedProgress: goal.plannedProgress,
            deadline: goal.deadline || goal.targetDate,
            chapters: goal.chapters,
          },
          userPrompt: customText || userPrompt || 'Suggest a recovery plan to get back on track',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.replan) {
        setProposal(data.replan);
      } else {
        // Fallback to local intelligent replan proposal
        const local = generateLocalReplanProposal(goal, userPrompt);
        setProposal(local as any);
      }
    } catch {
      const local = generateLocalReplanProposal(goal, userPrompt);
      setProposal(local as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!proposal) return;
    onApplyPlanChanges(goal.id, proposal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                AI Goal Copilot &amp; Recovery Planner
              </h2>
              <p className="text-xs text-zinc-500">
                Natural-language planning, risk recovery, and schedule redistribution.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs space-y-1">
            <span className="font-bold text-sky-950 dark:text-sky-200 block">
              Goal: {goal.title} ({goal.progress}% Completed)
            </span>
            <span className="text-sky-800 dark:text-sky-300 block">
              Deadline: {goal.deadline || goal.targetDate} · Status: {goal.status}
            </span>
          </div>

          {/* Prompt input or quick prompts */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              What do you want to adjust or inquire?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g. I am falling behind this week, suggest a recovery plan..."
                className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              />
              <button
                onClick={() => handleRequestAIReplan()}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Thinking...' : 'Analyze'}
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                onClick={() => {
                  setUserPrompt("I'm falling behind this week. Give me a recovery plan.");
                  handleRequestAIReplan("I'm falling behind this week. Give me a recovery plan.");
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                ⚡ &quot;I&apos;m falling behind this week&quot;
              </button>
              <button
                onClick={() => {
                  setUserPrompt("Replan remaining syllabus to finish safely before deadline.");
                  handleRequestAIReplan("Replan remaining syllabus to finish safely before deadline.");
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                🔄 &quot;Replan remaining syllabus&quot;
              </button>
            </div>
          </div>

          {/* AI Proposal Section (Section 24: AI MUST NOT DESTROY THE USER'S PLAN) */}
          {proposal && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3 pt-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-zinc-50">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Proposed Recovery Plan (Review before applying)</span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {proposal.pacingSummary}
              </p>

              {/* Proposed changes list */}
              <div className="space-y-2">
                {proposal.proposedChanges.map((change, idx) => (
                  <div
                    key={change.id || idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-0.5"
                  >
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{change.description}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 pl-5.5">
                      Impact: {change.impact}
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply / Reject Actions (Section 24) */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                >
                  Reject Changes
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Apply Proposed Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
