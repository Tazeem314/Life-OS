'use client';

import React, { useMemo, useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { StudyAnalyticsRange, StudyDailyMetric } from '@/lib/types';
import {
  formatHMS,
  formatStudyDurationMs,
  formatStudyMinutes,
} from '@/lib/study-service';
import { addDays, formatDisplayDate, getTodayKey } from '@/lib/date-utils';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  Hourglass,
  Timer,
  Calendar,
  Info,
  GraduationCap,
} from 'lucide-react';

const RANGE_OPTIONS: { id: StudyAnalyticsRange; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

export function StudyAnalyticsView() {
  const { getStudyAnalytics } = useLifeOS();
  const todayKey = getTodayKey();

  const [range, setRange] = useState<StudyAnalyticsRange>('daily');
  const [customStart, setCustomStart] = useState<string>(() => addDays(todayKey, -13));
  const [customEnd, setCustomEnd] = useState<string>(() => todayKey);
  const [hoveredBucket, setHoveredBucket] = useState<StudyDailyMetric | null>(null);

  const analytics = useMemo(() => {
    return getStudyAnalytics(
      range,
      range === 'custom' ? customStart : undefined,
      range === 'custom' ? customEnd : undefined
    );
  }, [getStudyAnalytics, range, customStart, customEnd]);

  const maxBucketMinutes = useMemo(() => {
    let maxVal = 30;
    for (const b of analytics.buckets) {
      maxVal = Math.max(
        maxVal,
        b.plannedMinutes,
        b.estimatedCompletedMinutes,
        b.actualStudiedMinutes
      );
    }
    return maxVal;
  }, [analytics.buckets]);

  const labelStep = useMemo(() => {
    const n = analytics.buckets.length;
    if (n <= 8) return 1;
    if (n <= 16) return 2;
    if (n <= 32) return 4;
    return 8;
  }, [analytics.buckets.length]);

  const formatTimeOfDay = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header + Period Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Study Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Comparing planned Study To-Dos, estimated completion, and actual timer sessions (
            {analytics.startDate === analytics.endDate
              ? analytics.startDate === todayKey
                ? `Today · ${formatDisplayDate(analytics.startDate)}`
                : formatDisplayDate(analytics.startDate)
              : `${formatDisplayDate(analytics.startDate)} – ${formatDisplayDate(analytics.endDate)}`}
            )
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRange(opt.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                range === opt.id
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Pickers */}
      {range === 'custom' && (
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-zinc-600 dark:text-zinc-300">Start:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => e.target.value && setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-semibold text-zinc-600 dark:text-zinc-300">End:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => e.target.value && setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>
      )}

      {/* Separation Explanation */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/60 text-xs text-sky-900 dark:text-sky-200">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
        <span>
          <strong>Planned Study</strong> sums estimates from Study To-Dos; <strong>Est. Completed</strong> sums estimates for checked-off Study To-Dos; <strong>Actual Studied</strong> tracks completed Study Timer sessions (and manually converted Stopwatch sessions). Non-Study tasks and unconverted Stopwatch runs are excluded.
        </span>
      </div>

      {/* Today's Study Overview Banner (shown in Daily view) */}
      {range === 'daily' && (() => {
        const plannedMs = analytics.plannedMinutes * 60000;
        const leftMs = Math.max(0, plannedMs - analytics.actualStudiedMs);
        const dailyPct =
          plannedMs > 0
            ? Math.min(100, Math.round((analytics.actualStudiedMs / plannedMs) * 100))
            : analytics.studyTasksTotal > 0
              ? Math.round((analytics.studyTasksCompleted / analytics.studyTasksTotal) * 100)
              : 0;

        return (
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-sky-200/80 dark:border-sky-900/60 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Today&apos;s Study Plan ({formatDisplayDate(todayKey)})
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {analytics.plannedMinutes > 0
                    ? leftMs > 0
                      ? `${formatStudyDurationMs(leftMs)} remaining to hit today's ${formatStudyMinutes(analytics.plannedMinutes)} target`
                      : `Daily target of ${formatStudyMinutes(analytics.plannedMinutes)} achieved`
                    : analytics.studyTasksTotal > 0
                      ? `${analytics.studyTasksTotal - analytics.studyTasksCompleted} open Study To-Do remaining today (add duration estimates in To-Dos to track a minute goal)`
                      : 'No Study To-Dos scheduled for today yet — add one in To-Dos or start a Study Timer session.'}
                </p>
              </div>
              <div className="font-mono font-bold tabular-nums text-sm sm:text-base text-sky-600 dark:text-sky-400 shrink-0">
                {dailyPct}% complete
              </div>
            </div>

            <progress
              value={dailyPct}
              max={100}
              className="w-full h-2.5 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-zinc-100 dark:[&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-sky-500 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all"
            />
          </div>
        );
      })()}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Planned Study</span>
            <Hourglass className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-950 dark:text-zinc-50">
            {formatStudyMinutes(analytics.plannedMinutes)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-1.5">
            {analytics.studyTasksTotal} Study {analytics.studyTasksTotal === 1 ? 'task' : 'tasks'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Est. Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatStudyMinutes(analytics.estimatedCompletedMinutes)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-1.5">
            {analytics.studyTasksCompleted}/{analytics.studyTasksTotal} completed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Remaining Planned</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatStudyMinutes(analytics.remainingPlannedMinutes)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-1.5">
            {analytics.studyTasksTotal - analytics.studyTasksCompleted} open tasks
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Actual Studied</span>
            <Timer className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400">
            {formatStudyDurationMs(analytics.actualStudiedMs)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-400 mt-1.5">
            {formatHMS(analytics.actualStudiedMs)} · {analytics.completedSessionsCount}{' '}
            {analytics.completedSessionsCount === 1 ? 'session' : 'sessions'}
          </div>
        </div>
      </div>

      {/* Planned vs Est. Completed vs Actual Studied Grouped Chart */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Planned vs. Estimated Completed vs. Actual Study Time
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Hover any bucket to inspect exact minutes
            </p>
          </div>
          <div className="flex items-center flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-600" />
              Planned
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Est. Completed
            </span>
            <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
              Actual
            </span>
          </div>
        </div>

        <div className="relative pt-7 pb-1">
          {hoveredBucket && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-lg text-xs flex flex-wrap items-center gap-2.5 pointer-events-none font-mono tabular-nums whitespace-nowrap">
              <span className="font-sans font-bold">{hoveredBucket.label}</span>
              <span>·</span>
              <span>Plan: {formatStudyMinutes(hoveredBucket.plannedMinutes)}</span>
              <span className="text-emerald-400 dark:text-emerald-600">
                Est: {formatStudyMinutes(hoveredBucket.estimatedCompletedMinutes)}
              </span>
              <span className="text-sky-400 dark:text-sky-600">
                Actual: {formatStudyDurationMs(hoveredBucket.actualStudiedMs)}
              </span>
            </div>
          )}

          <div className="h-48 flex items-end gap-1 sm:gap-2 pt-4 border-b border-zinc-100 dark:border-zinc-800">
            {analytics.buckets.map((bucket) => {
              const planH = bucket.plannedMinutes > 0
                ? Math.max(8, Math.round((bucket.plannedMinutes / maxBucketMinutes) * 100))
                : 3;
              const estH = bucket.estimatedCompletedMinutes > 0
                ? Math.max(8, Math.round((bucket.estimatedCompletedMinutes / maxBucketMinutes) * 100))
                : 3;
              const actH = bucket.actualStudiedMs > 0
                ? Math.max(
                    8,
                    Math.round((Math.max(1, bucket.actualStudiedMinutes) / maxBucketMinutes) * 100)
                  )
                : 3;

              return (
                <div
                  key={bucket.dateKey}
                  onMouseEnter={() => setHoveredBucket(bucket)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  className={`flex-1 h-full flex items-end justify-center cursor-pointer group ${
                    analytics.buckets.length === 1 ? 'gap-3 sm:gap-5' : 'gap-0.5 sm:gap-1'
                  }`}
                >
                  <div
                    className={`${
                      analytics.buckets.length === 1 ? 'w-10 sm:w-14' : 'w-1.5 sm:w-2.5'
                    } rounded-t transition-all ${
                      bucket.plannedMinutes > 0
                        ? 'bg-zinc-300 dark:bg-zinc-600 group-hover:bg-zinc-400'
                        : 'bg-zinc-100 dark:bg-zinc-800/50'
                    }`}
                    style={{ height: `${planH}%` }}
                  />
                  <div
                    className={`${
                      analytics.buckets.length === 1 ? 'w-10 sm:w-14' : 'w-1.5 sm:w-2.5'
                    } rounded-t transition-all ${
                      bucket.estimatedCompletedMinutes > 0
                        ? 'bg-emerald-500 group-hover:bg-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800/50'
                    }`}
                    style={{ height: `${estH}%` }}
                  />
                  <div
                    className={`${
                      analytics.buckets.length === 1 ? 'w-10 sm:w-14' : 'w-1.5 sm:w-2.5'
                    } rounded-t transition-all ${
                      bucket.actualStudiedMs > 0
                        ? 'bg-sky-500 group-hover:bg-sky-400'
                        : 'bg-zinc-100 dark:bg-zinc-800/50'
                    }`}
                    style={{ height: `${actH}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 pt-2 px-0.5">
            {analytics.buckets.map((bucket, idx) => {
              const show =
                idx === 0 || idx === analytics.buckets.length - 1 || idx % labelStep === 0;
              return (
                <span
                  key={`lbl_${bucket.dateKey}`}
                  className={`${show ? 'opacity-100 font-medium' : 'opacity-0'} truncate text-center flex-1`}
                >
                  {bucket.shortLabel}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Task Planned vs Actual Breakdown Table */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" />
              Task-Level Planned vs. Actual Study Breakdown
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Compares planned estimates against actual Study Timer logs per task
            </p>
          </div>
        </div>

        {analytics.taskBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No Study To-Dos or completed study sessions in this date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2.5 font-semibold rounded-l-lg">Study Task / Session</th>
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Planned Est.</th>
                  <th className="px-3 py-2.5 font-semibold">Est. Completed</th>
                  <th className="px-3 py-2.5 font-semibold">Actual Time</th>
                  <th className="px-3 py-2.5 font-semibold rounded-r-lg text-right">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {analytics.taskBreakdown.map((row) => (
                  <tr key={row.taskId} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                    <td className="px-3 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 max-w-[240px] truncate">
                      {row.title}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDisplayDate(row.dateKey)}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                      {row.plannedMinutes > 0 ? formatStudyMinutes(row.plannedMinutes) : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.estimatedCompletedMinutes > 0
                        ? formatStudyMinutes(row.estimatedCompletedMinutes)
                        : row.completed
                          ? 'Done (no est.)'
                          : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                      {row.actualStudiedMs > 0 ? formatHMS(row.actualStudiedMs) : '00:00:00'}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-right text-zinc-500 dark:text-zinc-400">
                      {row.sessionsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sessions in Period */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-500" />
          Completed Sessions in Selected Period ({analytics.sessions.length})
        </h2>

        {analytics.sessions.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4">
            No completed sessions inside{' '}
            {analytics.startDate === analytics.endDate
              ? formatDisplayDate(analytics.startDate)
              : `${formatDisplayDate(analytics.startDate)} – ${formatDisplayDate(analytics.endDate)}`}
            .
          </p>
        ) : (
          <div className="space-y-2">
            {analytics.sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {s.taskNameSnapshot}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {formatDisplayDate(s.dateKey)} · {formatTimeOfDay(s.startTimestamp)}–{formatTimeOfDay(s.endTimestamp)}
                    {s.source === 'stopwatch_converted' ? ' · From Stopwatch' : ''}
                  </div>
                </div>
                <div className="font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400 shrink-0">
                  {formatHMS(s.actualDurationMs)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
