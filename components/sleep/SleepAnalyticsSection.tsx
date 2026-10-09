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
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Plus,
  Minus,
  ArrowUp,
} from 'lucide-react';

interface SleepAnalyticsSectionProps {
  logs: SleepLog[];
  settings: SleepSettings;
  analytics: SleepAnalyticsSummary;
  onUpdateSettings?: (newSettings: Partial<SleepSettings>) => void;
  onOpenSettingsModal?: () => void;
}

export function SleepAnalyticsSection({
  logs,
  settings,
  analytics,
  onUpdateSettings,
  onOpenSettingsModal,
}: SleepAnalyticsSectionProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');

  // Filter logs based on selected range
  const sliceCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const displayLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-sliceCount);

  // Target in minutes
  const targetHours = settings.targetHours || 8;
  const targetMinutes = Math.round(targetHours * 60);

  // Maximum duration in current display range
  const maxLogDuration = displayLogs.length > 0
    ? Math.max(...displayLogs.map((l) => l.durationMinutes))
    : 0;

  // Headroom coordinate calculation:
  // Ensure target line sits comfortably around 62-70% height when normal,
  // and dynamically expands when logs exceed target so bars that are over target
  // have ample room to rise clearly above the dashed guideline without hitting the top!
  const maxMinutesInView = Math.max(
    targetMinutes * 1.38,
    maxLogDuration * 1.18,
    targetMinutes + 120, // At least 2 hours headroom above target
    600 // Minimum 10 hours scale
  );

  // Guideline percentage from baseline (bottom = 0%)
  const targetPercent = (targetMinutes / maxMinutesInView) * 100;

  // Quick target adjust handlers
  const handleStepTarget = (deltaHours: number) => {
    if (!onUpdateSettings) return;
    const next = Math.max(5, Math.min(11, Math.round((targetHours + deltaHours) * 10) / 10));
    onUpdateSettings({ targetHours: next });
  };

  // Stats for the active range
  const exceededCount = displayLogs.filter((l) => l.durationMinutes > targetMinutes).length;
  const metCount = displayLogs.filter(
    (l) => l.durationMinutes >= targetMinutes - 30 && l.durationMinutes <= targetMinutes
  ).length;
  const underCount = displayLogs.filter((l) => l.durationMinutes < targetMinutes - 30).length;
  const rangeAvgMins = displayLogs.length > 0
    ? Math.round(displayLogs.reduce((s, l) => s + l.durationMinutes, 0) / displayLogs.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Primary Duration Trend Chart Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs">
        {/* Card Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sleep Duration & Target Comparison
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Target baseline:{' '}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                {targetHours.toFixed(1)}h / night ({formatDurationHoursMinutes(targetMinutes)})
              </span>
              {' · '}
              Bars extending above the dashed line indicate surplus recovery
            </p>
          </div>

          {/* Right Controls: In-Graph Target Adjuster + Range Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Interactive Target Stepper directly in the graph */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/90 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pl-2">
                Target:
              </span>
              <button
                type="button"
                onClick={() => handleStepTarget(-0.5)}
                disabled={targetHours <= 5}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs disabled:opacity-40 transition-all active:scale-90"
                title="Decrease sleep target (-30m)"
                aria-label="Decrease sleep target by 30 minutes"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 px-1 min-w-[38px] text-center">
                {targetHours.toFixed(1)}h
              </span>

              <button
                type="button"
                onClick={() => handleStepTarget(+0.5)}
                disabled={targetHours >= 11}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs disabled:opacity-40 transition-all active:scale-90"
                title="Increase sleep target (+30m)"
                aria-label="Increase sleep target by 30 minutes"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Range segmented buttons */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              {(['7d', '14d', '30d'] as const).map((rng) => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => setTimeRange(rng)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
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
        </div>

        {/* Visual Bar Chart Plot Area */}
        {displayLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            No sleep logs recorded yet for this period.
          </div>
        ) : (
          <div className="space-y-0">
            {/* DEDICATED PLOT CANVAS (pure Y-axis coordinate space from 0% baseline to max headroom) */}
            <div className="relative h-64 w-full select-none overflow-visible">
              {/* Reference Grid Line at 50% target */}
              <div
                className="absolute inset-x-0 border-b border-zinc-100 dark:border-zinc-800/60 z-0 pointer-events-none"
                style={{ bottom: `${targetPercent * 0.5}%` }}
              >
                <span className="absolute -top-3 left-1 text-[9px] font-mono text-zinc-400 dark:text-zinc-600">
                  {(targetHours * 0.5).toFixed(1)}h
                </span>
              </div>

              {/* DASHED TARGET GUIDELINE (Exact baseline for target comparison) */}
              <div
                className="absolute inset-x-0 border-b-2 border-dashed border-indigo-500/90 dark:border-indigo-400/90 z-20 pointer-events-none transition-all duration-300"
                style={{ bottom: `${targetPercent}%` }}
              >
                {/* Left reference text */}
                <span className="absolute -top-3.5 left-1 text-[9px] font-mono font-bold text-indigo-500 dark:text-indigo-400 bg-white/80 dark:bg-zinc-900/80 px-1 rounded-sm">
                  {targetHours.toFixed(1)}h target
                </span>

                {/* Right Target Tag */}
                <div className="absolute -top-3.5 right-1 pointer-events-none">
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/95 dark:bg-indigo-950/95 border border-indigo-200/90 dark:border-indigo-800/90 px-2 py-0.5 rounded-md shadow-xs">
                    <span>Target {targetHours.toFixed(1)}h ({formatDurationHoursMinutes(targetMinutes)})</span>
                  </div>
                </div>
              </div>

              {/* BARS CONTAINER (Each bar sits directly on bottom: 0 baseline) */}
              <div className="absolute inset-0 flex items-end gap-2 sm:gap-3 px-2 sm:px-3 z-30">
                {displayLogs.map((log) => {
                  const durationMins = log.durationMinutes;
                  const isOverTarget = durationMins > targetMinutes;
                  const surplusMinutes = Math.max(0, durationMins - targetMinutes);
                  const deficitMinutes = Math.max(0, targetMinutes - durationMins);

                  // Total bar height percentage in plot canvas (capped at 98% to leave room for surplus badge)
                  const barHeightPercent = Math.min(
                    98,
                    Math.max(4, (durationMins / maxMinutesInView) * 100)
                  );

                  // Exact proportion of base layer vs surplus layer inside the bar
                  // Since the bar sits at bottom: 0, the target line is at targetPercent% of the canvas.
                  // Therefore, base layer = (targetPercent / barHeightPercent) * 100% of bar's height.
                  // The boundary between base and surplus lands EXACTLY on the dashed target line!
                  const basePortionPercent = isOverTarget
                    ? (targetPercent / barHeightPercent) * 100
                    : 100;
                  const surplusPortionPercent = isOverTarget
                    ? 100 - basePortionPercent
                    : 0;

                  const formattedDur = formatDurationHoursMinutes(durationMins);
                  const logDateObj = new Date(log.date + 'T12:00:00');
                  const weekdayStr = logDateObj.toLocaleDateString(undefined, { weekday: 'short' });
                  const dateShortStr = logDateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

                  return (
                    <div
                      key={log.id}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Floating Detail Tooltip */}
                      <div className="absolute -top-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] py-2 px-3 rounded-xl font-mono whitespace-nowrap shadow-2xl z-50 flex flex-col items-center gap-1 border border-zinc-800 dark:border-zinc-200">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{weekdayStr}, {log.date}</span>
                          <span>·</span>
                          <span className="text-zinc-300 dark:text-zinc-700">{log.bedtime} → {log.wakeTime}</span>
                        </div>
                        <div className="text-xs font-extrabold">
                          {formattedDur} total sleep
                        </div>
                        <div className="flex items-center gap-1 text-[9px] pt-0.5 border-t border-zinc-800 dark:border-zinc-200/50 w-full justify-center">
                          {isOverTarget ? (
                            <span className="text-emerald-400 dark:text-emerald-600 font-bold flex items-center gap-0.5">
                              <ArrowUp className="w-2.5 h-2.5" />
                              +{formatDurationHoursMinutes(surplusMinutes)} OVER target ({targetHours.toFixed(1)}h)
                            </span>
                          ) : deficitMinutes === 0 ? (
                            <span className="text-indigo-400 dark:text-indigo-600 font-bold">
                              Exact target achieved!
                            </span>
                          ) : (
                            <span className="text-amber-400 dark:text-amber-600">
                              -{formatDurationHoursMinutes(deficitMinutes)} under target
                            </span>
                          )}
                          <span>· {QUALITY_LABELS[log.qualityRating].label} ({log.qualityRating}/5)</span>
                        </div>
                      </div>

                      {/* SURPLUS BADGE: Clearly highlights when sleep exceeds target */}
                      {isOverTarget && (
                        <div
                          style={{ bottom: `${barHeightPercent + 1.5}%` }}
                          className="absolute pointer-events-none whitespace-nowrap z-40 flex items-center gap-0.5 text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-700/80 px-1.5 py-0.5 rounded-md shadow-2xs transition-all"
                        >
                          <ArrowUp className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                          <span>+{formatDurationHoursMinutes(surplusMinutes)}</span>
                        </div>
                      )}

                      {/* THE BAR STACK (Starts at baseline 0 and extends upward) */}
                      <div
                        style={{ height: `${barHeightPercent}%` }}
                        className="w-full max-w-[32px] min-w-[12px] flex flex-col justify-end transition-all duration-300 relative rounded-t-lg overflow-hidden group-hover:brightness-110 shadow-2xs"
                      >
                        {isOverTarget ? (
                          <>
                            {/* SURPLUS SECTION: Rises above the dashed target line in Emerald */}
                            <div
                              style={{ height: `${surplusPortionPercent}%` }}
                              className="w-full bg-emerald-500 dark:bg-emerald-400 rounded-t-lg transition-all relative"
                            >
                              {/* Visual surplus shimmer / top highlight */}
                              <div className="absolute inset-x-0 top-0 h-1 bg-emerald-200 dark:bg-emerald-200/60 opacity-80" />
                            </div>

                            {/* BASE SECTION: Fills exactly up to the dashed target line in Indigo */}
                            <div
                              style={{ height: `${basePortionPercent}%` }}
                              className="w-full bg-indigo-600 dark:bg-indigo-500 transition-all border-t border-emerald-400/40"
                            />
                          </>
                        ) : (
                          /* BELOW OR MET TARGET BAR */
                          <div
                            className={`w-full h-full rounded-t-lg transition-all ${
                              durationMins >= targetMinutes - 30
                                ? 'bg-indigo-600 dark:bg-indigo-500'
                                : 'bg-indigo-300 dark:bg-indigo-900/70'
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEPARATE X-AXIS ROW (Clean alignment directly beneath plot baseline) */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 sm:gap-3 px-2 sm:px-3 pt-2.5">
              {displayLogs.map((log) => {
                const durationMins = log.durationMinutes;
                const isOverTarget = durationMins > targetMinutes;
                const isMet = durationMins >= targetMinutes - 30;
                const logDateObj = new Date(log.date + 'T12:00:00');
                const weekdayStr = logDateObj.toLocaleDateString(undefined, { weekday: 'short' });
                const dateShortStr = logDateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

                return (
                  <div key={log.id} className="flex-1 flex flex-col items-center min-w-[12px]">
                    <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {weekdayStr}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                      {dateShortStr}
                    </span>
                    {/* Status dot */}
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isOverTarget
                          ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                          : isMet
                          ? 'bg-indigo-500'
                          : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                      title={
                        isOverTarget
                          ? 'Exceeded sleep target'
                          : isMet
                          ? 'Met sleep target'
                          : 'Below sleep target'
                      }
                    />
                  </div>
                );
              })}
            </div>

            {/* Chart Legend & Summary Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 gap-3 pt-4 mt-2">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Exceeded Target ({exceededCount} {exceededCount === 1 ? 'night' : 'nights'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-500" />
                  <span>
                    Met Target ({metCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 dark:bg-indigo-900/70" />
                  <span>
                    Under Target ({underCount})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-zinc-700 dark:text-zinc-300 font-medium">
                <span>
                  Avg: {formatDurationHoursMinutes(rangeAvgMins)}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Target: {targetHours.toFixed(1)}h
                </span>
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
          On days following {targetHours.toFixed(1)}+ hours of sleep, your habit completion rate is{' '}
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
