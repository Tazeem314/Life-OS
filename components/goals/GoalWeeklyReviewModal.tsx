'use client';

import React, { useState } from 'react';
import { Goal, GoalWeeklyReview } from '@/lib/types';
import {
  RotateCcw,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface GoalWeeklyReviewModalProps {
  isOpen: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSaveReview: (review: GoalWeeklyReview) => void;
}

export function GoalWeeklyReviewModal({
  isOpen,
  goal,
  onClose,
  onSaveReview,
}: GoalWeeklyReviewModalProps) {
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatWasMissed, setWhatWasMissed] = useState('');
  const [whyMissed, setWhyMissed] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  if (!isOpen || !goal) return null;

  const plannedCount = 10;
  const completedCount = 8;
  const completionRate = 80;
  const progressGained = 12;

  const handleGenerateAIReview = async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/goals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'weekly_review',
          goalData: {
            title: goal.title,
            plannedCount,
            completedCount,
            completionRate,
            progressGained,
            whatWentWell,
            whatWasMissed,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.review) {
        setAiSummary(data.review.briefing || data.review.praise || 'Keep steady momentum.');
      } else {
        setAiSummary(`You completed ${completionRate}% of planned actions this week (+${progressGained}% progress gained). Keep steady focus on high-priority chapter exercises.`);
      }
    } catch {
      setAiSummary(`You completed ${completionRate}% of planned actions this week (+${progressGained}% progress gained).`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReview: GoalWeeklyReview = {
      id: `rev_${Date.now()}`,
      goalId: goal.id,
      weekLabel: `Week ending ${new Date().toLocaleDateString('default', { month: 'short', day: 'numeric' })}`,
      periodStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
      periodEnd: new Date().toISOString().slice(0, 10),
      plannedActionsCount: plannedCount,
      completedActionsCount: completedCount,
      completionRate,
      progressGained,
      whatWentWell: whatWentWell.trim() || undefined,
      whatWasMissed: whatWasMissed.trim() || undefined,
      whyMissed: whyMissed.trim() || undefined,
      nextWeekFocus: nextWeekFocus.trim() || undefined,
      aiSummary: aiSummary || undefined,
      createdAt: new Date().toISOString(),
    };

    onSaveReview(newReview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Goal Weekly Retrospective
              </h2>
              <p className="text-xs text-zinc-500">
                Reflect on weekly output, analyze missed targets, and calibrate next week.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Output metrics card (Section 25) */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Planned</div>
              <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base">{plannedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Completed</div>
              <div className="font-mono font-bold text-emerald-600 text-base">{completedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Completion</div>
              <div className="font-mono font-bold text-indigo-600 text-base">{completionRate}%</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Progress</div>
              <div className="font-mono font-bold text-sky-600 text-base">+{progressGained}%</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              What went well this week?
            </label>
            <textarea
              rows={2}
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              placeholder="e.g. Finished Real Numbers concepts easily, solved all exercise problems..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              What was missed or delayed?
            </label>
            <textarea
              rows={2}
              value={whatWasMissed}
              onChange={(e) => setWhatWasMissed(e.target.value)}
              placeholder="e.g. Could not finish 10 PYQs on Sunday..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Why did the delay occur?
            </label>
            <input
              type="text"
              value={whyMissed}
              onChange={(e) => setWhyMissed(e.target.value)}
              placeholder="e.g. Triangles proofs took longer than expected..."
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
            />
          </div>

          {/* AI Review Synthesizer */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI Performance Review</span>
              </span>
              <button
                type="button"
                onClick={handleGenerateAIReview}
                disabled={isLoadingAi}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {isLoadingAi ? 'Generating...' : 'Synthesize with AI'}
              </button>
            </div>
            {aiSummary && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300 italic bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                &quot;{aiSummary}&quot;
              </p>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition shadow-xs cursor-pointer"
            >
              Save Weekly Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
