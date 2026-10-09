'use client';

import React, { useState } from 'react';
import {
  SleepLog,
  SleepSettings,
  SleepAnalyticsSummary,
} from '@/lib/types';
import {
  formatDurationHoursMinutes,
  formatDurationDecimal,
  QUALITY_LABELS,
} from '@/lib/sleep-service';
import {
  Moon,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SleepAnalyticsSectionProps {
  logs: SleepLog[];
  settings: SleepSettings;
  analytics: SleepAnalyticsSummary;
}

export function SleepAnalyticsSection({
  logs,
  settings,
  analytics,
}: SleepAnalyticsSectionProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');

  // Filter logs based on selected range
  const sliceCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const displayLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-sliceCount);

  const targetMinutes = settings.targetHours * 60;
  const maxMinutesInView = Math.max(
    targetMinutes + 90,
    ...displayLogs.map((l) => l.durationMinutes),
    540
  );

  return (
    <div className="space-y-6">
      {/* Primary Duration Trend Chart Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Sleep Duration & Consistency Trend</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Target: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{settings.targetHours}h 00m</span> per night
            </p>
          </div>

          {/* Time range segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl self-start sm:self-auto">
            {(['7d', '14d', '30d'] as const).map((rng) => (
              <button
                key={rng}
                onClick={() => setTimeRange(rng)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  timeRange === rng
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {rng.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart */}
        {displayLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No sleep logs recorded yet for this period.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end gap-1.5 sm:gap-3 pt-6 pb-1 px-1 border-b border-zinc-100 dark:border-zinc-800 relative">
              {/* Target guideline line */}
              <div
                className="absolute left-0 right-0 border-b border-dashed border-indigo-400/60 dark:border-indigo-500/50 z-0 pointer-events-none"
                style={{
                  bottom: `${(targetMinutes / maxMinutesInView) * 100}%`,
                }}
              >
                <span className="absolute -top-3.5 right-1 text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 bg-white/90 dark:bg-zinc-900/90 px-1 rounded-sm">
                  Goal {settings.targetHours}h
                </span>
              </div>

              {displayLogs.map((log) => {
                const heightPercent = Math.min(100, Math.max(12, (log.durationMinutes / maxMinutesInView) * 100));
                const meetsTarget = log.durationMinutes >= targetMinutes - 30;
                const formattedDur = formatDurationHoursMinutes(log.durationMinutes);
                const dayLabel = new Date(log.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });

                return (
                  <div
                    key={log.id}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative z-10"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] py-1 px-2 rounded-lg font-mono whitespace-nowrap shadow-md z-30">
                      {log.date} · {formattedDur} · {QUALITY_LABELS[log.qualityRating].label}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                        meetsTarget
                          ? 'bg-indigo-600 dark:bg-indigo-500 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400'
                          : 'bg-indigo-300 dark:bg-indigo-900/60 group-hover:bg-indigo-400'
                      }`}
                    />
                    {/* Day text */}
                    <span className="text-[10px] text-zinc-400 mt-2 font-mono truncate">
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-500" />
                  <span>Met Target ({settings.targetHours}h+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 dark:bg-indigo-900/60" />
                  <span>Below Target</span>
                </div>
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-300">
                Avg: {formatDurationHoursMinutes(analytics.avgDurationMinutes)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Domain Synergy: Sleep vs Habit Productivity */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-sky-50/40 to-emerald-50/40 dark:from-indigo-950/30 dark:via-sky-950/20 dark:to-emerald-950/20 border border-indigo-200/70 dark:border-indigo-800/50 shadow-2xs">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs mb-1">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Sleep & Habit Execution Synergy</span>
        </div>
        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Rest directly boosts your daily habit completion by +{analytics.correlationWithHabits.boostPercentage}%
        </h4>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
          On days following 7.5+ hours of sleep, your habit completion rate is{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {analytics.correlationWithHabits.wellRestedCompletionRate}%
          </span>
          , compared to{' '}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {analytics.correlationWithHabits.underRestedCompletionRate}%
          </span>{' '}
          on sleep-deprived days. Prioritizing rest acts as your primary executive-function leverage.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-indigo-200/50 dark:border-indigo-800/40">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-indigo-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">Sleep Adherence</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {analytics.targetAdherenceRate}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-indigo-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">Circadian Regularity</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {analytics.bedtimeConsistencyScore}/100
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-indigo-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">Sleep Efficiency</span>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {analytics.overallEfficiencyScore}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/70 border border-indigo-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-500">Sleep Debt (7d)</span>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                analytics.sleepDebtMinutes >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {analytics.sleepDebtMinutes >= 0 ? '+' : ''}
              {formatDurationDecimal(analytics.sleepDebtMinutes)}
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Factors Impact Matrix */}
      {analytics.factorImpacts.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Factor Impact on Sleep Quality</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              How specific evening habits and environmental conditions correlate with your rest score
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {analytics.factorImpacts.slice(0, 8).map((factor) => {
              const isPositive = factor.qualityDelta >= 0;
              return (
                <div
                  key={factor.factorId}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60"
                >
                  <div>
                    <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                      {factor.factorLabel}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Logged {factor.count} {factor.count === 1 ? 'time' : 'times'} · Avg {factor.avgQualityWith}/5
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-0.5 font-mono text-xs font-bold ${
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isPositive ? `+${factor.qualityDelta}` : factor.qualityDelta}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
