'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Clock,
  Zap,
  CheckCircle2,
  ChevronRight,
  Brain,
} from 'lucide-react';
import { SleepLog, SleepSettings, AISleepInsight } from '@/lib/types';

interface AISleepCoachCardProps {
  logs: SleepLog[];
  settings: SleepSettings;
  habitCompletionRate: number;
}

export function AISleepCoachCard({
  logs,
  settings,
  habitCompletionRate,
}: AISleepCoachCardProps) {
  const [insight, setInsight] = useState<AISleepInsight | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIInsight = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sleep/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: logs.slice(0, 10),
          settings,
          habitRate: habitCompletionRate,
        }),
      });
      const data = await res.json();
      if (data.success && data.insight) {
        setInsight(data.insight);
      } else {
        setError(data.error || 'Failed to retrieve AI sleep analysis.');
      }
    } catch (err: any) {
      console.error('Error fetching AI sleep insight:', err);
      setError('Network error reaching AI sleep service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/60">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>AI Circadian & Sleep Coach</span>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-sm font-mono font-medium">
                Gemini
              </span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Personalized recovery science calibrated to your routine
            </p>
          </div>
        </div>

        <button
          onClick={fetchAIInsight}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-500' : ''}`} />
          <span>{insight ? 'Update Insights' : 'Analyze Sleep'}</span>
        </button>
      </div>

      {isLoading && (
        <div className="py-8 text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Synthesizing sleep architecture, circadian variance, and habit velocity...
          </p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!insight && !isLoading && !error && (
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 text-center">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Tap &ldquo;Analyze Sleep&rdquo; to have AI evaluate your logged sleep duration, consistency, and negative/positive factors to suggest your optimal bedtime window and habit performance boosts.
          </p>
        </div>
      )}

      {insight && !isLoading && (
        <div className="space-y-4 pt-1">
          {/* Header Summary */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
            <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
              {insight.title}
            </h4>
            <p className="text-xs text-purple-800 dark:text-purple-300 mt-1 leading-relaxed">
              {insight.summary}
            </p>
          </div>

          {/* Recommended Circadian Window */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-500">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400">Ideal Bedtime</span>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {insight.recommendedBedtime}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-500">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-400">Ideal Wake Time</span>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {insight.recommendedWakeTime}
                </div>
              </div>
            </div>
          </div>

          {/* Circadian Advice & Synergy */}
          <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                Circadian Calibration:
              </span>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                {insight.circadianAdvice}
              </p>
            </div>

            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-0.5">
                Habit Synergy:
              </span>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                {insight.habitSleepSynergy}
              </p>
            </div>
          </div>

          {/* Actionable Tips */}
          {insight.actionableTips && insight.actionableTips.length > 0 && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-2">
                Targeted Protocols:
              </span>
              <div className="space-y-1.5">
                {insight.actionableTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
