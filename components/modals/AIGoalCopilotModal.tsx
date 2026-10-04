'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Sparkles,
  X,
  Target,
  Calendar,
  CheckSquare,
  BookOpen,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { AIPlanGeneratedResult } from '@/lib/types';

interface AIGoalCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdoptPlan: (plan: AIPlanGeneratedResult, createTasks: boolean, createHabits: boolean) => void;
}

const PRESET_EXAMPLES = [
  'I have six months to prepare for my exams. I want to finish the syllabus, revise twice, solve PYQs and complete 10 sample papers.',
  'Launch my SaaS MVP product in 3 months: design UI, build Next.js backend, onboard first 20 beta users.',
  'Run my first half-marathon in 16 weeks: build weekly mileage, do strength training twice a week, and eat clean.',
  'Save $5,000 for emergency fund in 6 months by cutting unnecessary subscriptions and freelancing 5 hrs/week.',
  'Learn conversational Spanish in 90 days: practice daily on flashcards, 2 tutor sessions/wk, and watch native podcasts.',
];

export function AIGoalCopilotModal({ isOpen, onClose, onAdoptPlan }: AIGoalCopilotModalProps) {
  const [prompt, setPrompt] = useState('');
  const [timeframe, setTimeframe] = useState('Auto-detect');
  const [isAcademic, setIsAcademic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedPlan, setGeneratedPlan] = useState<AIPlanGeneratedResult | null>(null);
  const [autoAddTasks, setAutoAddTasks] = useState(true);
  const [autoAddHabits, setAutoAddHabits] = useState(true);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedPlan(null);

    try {
      const res = await fetch('/api/goals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          timeframe: timeframe !== 'Auto-detect' ? timeframe : undefined,
          isAcademic,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate goal plan.');
      }

      setGeneratedPlan(data.plan);
    } catch (err: any) {
      console.error('AI Goal Copilot error:', err);
      setError(err.message || 'Something went wrong while formulating your plan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdopt = () => {
    if (!generatedPlan) return;
    onAdoptPlan(generatedPlan, autoAddTasks, autoAddHabits);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                AI Goal Copilot &amp; Roadmap Architect
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Describe your ambition in plain English — Copilot breaks it down into actionable milestones & habits
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

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!generatedPlan ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                  What do you want to accomplish? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. I have six months to prepare for my exams. I want to finish the syllabus, revise twice, solve PYQs and complete 10 sample papers..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 leading-relaxed"
                />
              </div>

              {/* Timeframe & Academic options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Target Timeframe
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="Auto-detect">AI Auto-detect based on goal</option>
                    <option value="today">Today</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month (30 Days)</option>
                    <option value="3_months">3 Months (Quarterly)</option>
                    <option value="6_months">6 Months (Semester / Mid-year)</option>
                    <option value="this_year">This Year (12 Months)</option>
                    <option value="long_term">Long Term (Multi-Year Vision)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAcademic}
                      onChange={(e) => setIsAcademic(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                    />
                    <span>Academic &amp; Exam Preparation Focus</span>
                  </label>
                </div>
              </div>

              {/* Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Try an example goal prompt
                </label>
                <div className="flex flex-col gap-1.5">
                  {PRESET_EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="text-left text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 transition line-clamp-2"
                    >
                      &quot;{ex}&quot;
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:from-sky-700 active:to-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing &amp; Formulating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Roadmap Plan
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Generated Plan Review */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Goal Overview Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50/70 to-indigo-50/70 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-600 text-white">
                        {generatedPlan.timeHorizon.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {generatedPlan.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-1">
                      {generatedPlan.title}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                      {generatedPlan.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-zinc-400">Target Deadline</div>
                    <div className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-sky-500" />
                      {generatedPlan.targetDate}
                    </div>
                  </div>
                </div>

                {generatedPlan.strategicAdvice && (
                  <div className="mt-3 p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-sky-100 dark:border-sky-900/40 text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-sky-700 dark:text-sky-300">Strategy: </span>
                    {generatedPlan.strategicAdvice}
                  </div>
                )}
              </div>

              {/* Milestones Roadmap */}
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-sky-500" />
                  Structured Milestones ({generatedPlan.milestones?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(generatedPlan.milestones || []).map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{m.title}</p>
                          {m.description && <p className="text-[11px] text-zinc-400 truncate">{m.description}</p>}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-zinc-500 shrink-0">
                        Deadline: {m.deadline}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Habits & Daily Tasks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Habits */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      Recurring Habits ({generatedPlan.suggestedHabits?.length || 0})
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAddHabits}
                        onChange={(e) => setAutoAddHabits(e.target.checked)}
                        className="rounded text-sky-600"
                      />
                      Add to Habits
                    </label>
                  </div>
                  <ul className="space-y-1">
                    {(generatedPlan.suggestedHabits || []).map((h, idx) => (
                      <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="truncate">{h.name}</span>
                        <span className="text-[10px] text-zinc-400">({h.frequency})</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Tasks */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                      Immediate Action Tasks ({generatedPlan.suggestedTasks?.length || 0})
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAddTasks}
                        onChange={(e) => setAutoAddTasks(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      Add to To-Dos
                    </label>
                  </div>
                  <ul className="space-y-1">
                    {(generatedPlan.suggestedTasks || []).map((t, idx) => (
                      <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span className="truncate">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Targets (Monthly / Weekly) */}
              {((generatedPlan.monthlyTargets && generatedPlan.monthlyTargets.length > 0) ||
                (generatedPlan.weeklyTargets && generatedPlan.weeklyTargets.length > 0)) && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-1.5">
                    Pacing Benchmarks
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {generatedPlan.monthlyTargets && generatedPlan.monthlyTargets.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Monthly Targets:</span>
                        <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 mt-1 space-y-0.5">
                          {generatedPlan.monthlyTargets.map((mt, i) => (
                            <li key={i} className="truncate">{mt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {generatedPlan.weeklyTargets && generatedPlan.weeklyTargets.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Weekly Targets:</span>
                        <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 mt-1 space-y-0.5">
                          {generatedPlan.weeklyTargets.map((wt, i) => (
                            <li key={i} className="truncate">{wt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setGeneratedPlan(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Regenerate / Adjust Prompt
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAdopt}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition"
                  >
                    <span>Adopt &amp; Create Roadmap</span>
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
