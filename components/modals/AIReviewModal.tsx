'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Sparkles,
  X,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Loader2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { AIReviewReport } from '@/lib/types';

interface AIReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'Daily AI Briefing' | 'Daily Review' | 'Weekly Review' | 'Monthly Review';
}

export function AIReviewModal({ isOpen, onClose, defaultType = 'Daily AI Briefing' }: AIReviewModalProps) {
  const { goals, habits, completions, todos, settings } = useLifeOS();

  const [reviewType, setReviewType] = useState(defaultType);
  const [report, setReport] = useState<AIReviewReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateReview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewType,
          goals,
          recentCompletionsCount: completions.length,
          userName: settings.userName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate review.');
      }
      setReport(data.report);
    } catch (err: any) {
      console.error('AI Review error:', err);
      setError(err.message || 'Failed to formulate review.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                AI Strategic Executive Review
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cross-horizon performance synthesis, risks, and priority directives
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
          {/* Review Type Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            {(['Daily AI Briefing', 'Daily Review', 'Weekly Review', 'Monthly Review'] as const).map((type) => {
              const isActive = reviewType === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    setReviewType(type);
                    setReport(null);
                  }}
                  className={`flex-1 min-w-[120px] py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl">
              {error}
            </div>
          )}

          {!report ? (
            <div className="py-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-sky-500 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Ready to synthesize {goals.length} goals &amp; recent activities
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                AI will evaluate goal progress, identify bottlenecks, review deadlines, and recommend top priorities.
              </p>
              <button
                onClick={handleGenerateReview}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Executive Review...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {reviewType}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Executive Briefing Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50/60 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  {reviewType} Summary
                </span>
                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed font-medium">
                  {report.briefing}
                </p>
              </div>

              {/* Progressing Well vs At Risk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Goals Progressing Well ({report.onTrackGoals.length})
                  </h4>
                  {report.onTrackGoals.length === 0 ? (
                    <p className="text-[11px] text-zinc-500">None on record.</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                      {report.onTrackGoals.map((g, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Goals Falling Behind / At-Risk ({report.atRiskGoals.length})
                  </h4>
                  {report.atRiskGoals.length === 0 ? (
                    <p className="text-[11px] text-zinc-500">All active goals are on track!</p>
                  ) : (
                    <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                      {report.atRiskGoals.map((g, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Imminent Deadlines */}
              {report.upcomingDeadlines && report.upcomingDeadlines.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    Upcoming Target Deadlines
                  </h4>
                  <div className="space-y-1.5">
                    {report.upcomingDeadlines.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{d.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-zinc-400">{d.deadline}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              d.daysLeft <= 3
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            }`}
                          >
                            {d.daysLeft <= 0 ? 'Due Today / Overdue' : `${d.daysLeft}d remaining`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Priorities */}
              {report.recommendedPriorities && report.recommendedPriorities.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1.5 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    Recommended Priorities &amp; Next Actions
                  </h4>
                  <ul className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    {report.recommendedPriorities.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable calibration tips */}
              {report.actionableTips && report.actionableTips.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 text-xs space-y-1">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">Coach Directives:</span>
                  <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
                    {report.actionableTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
