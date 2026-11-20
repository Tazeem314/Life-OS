'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  computeActiveStopwatchElapsedMs,
  formatHMSCentiseconds,
  formatStudyDurationMs,
  formatStudyMinutes,
  isStudyTodo,
} from '@/lib/study-service';
import { formatDisplayDate } from '@/lib/date-utils';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { StopwatchRecord } from '@/lib/types';
import {
  Gauge,
  Play,
  Pause,
  Flag,
  RotateCcw,
  Square,
  Trash2,
  ArrowRightCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  X,
} from 'lucide-react';

export function StopwatchView() {
  const {
    todos,
    stopwatchRecords,
    activeStopwatch,
    startStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    lapStopwatch,
    resetStopwatch,
    stopAndSaveStopwatch,
    deleteStopwatchRecord,
    convertStopwatchToStudySession,
  } = useLifeOS();

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [runTitle, setRunTitle] = useState<string>('');
  const [runNotes, setRunNotes] = useState<string>('');
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [recordToConvert, setRecordToConvert] = useState<StopwatchRecord | null>(null);
  const [convertTaskId, setConvertTaskId] = useState<string>('');

  // High-precision wall-clock ticker for centiseconds
  useEffect(() => {
    if (!activeStopwatch || activeStopwatch.status !== 'running') return;

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 50);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeStopwatch]);

  const elapsedMs = computeActiveStopwatchElapsedMs(activeStopwatch, nowMs);
  const formatted = formatHMSCentiseconds(elapsedMs);

  const studyTodos = useMemo(() => {
    return (todos || [])
      .filter((t) => isStudyTodo(t))
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.date.localeCompare(a.date));
  }, [todos]);

  const toggleExpandRecord = (id: string) => {
    setExpandedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStopAndSave = () => {
    stopAndSaveStopwatch(runTitle, runNotes);
    setRunTitle('');
    setRunNotes('');
  };

  const handleConfirmConvert = () => {
    if (!recordToConvert) return;
    convertStopwatchToStudySession(recordToConvert.id, convertTaskId || null);
    setRecordToConvert(null);
    setConvertTaskId('');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
          <Gauge className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Stopwatch</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Independent stopwatch with lap splits, saved history, and optional conversion to Study Sessions
        </p>
      </div>

      {/* Isolation notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
        <span>
          Stopwatch records stay strictly separate from <strong>Study Analytics</strong> unless you manually click <strong>Save as Study Session</strong> on a completed record.
        </span>
      </div>

      {/* Stopwatch Main Card */}
      <div className="p-5 sm:p-8 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-6">
        {/* Elapsed Readout */}
        <div className="py-4 sm:py-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center font-mono tabular-nums tracking-tight">
            <span className="text-5xl sm:text-7xl font-bold text-zinc-950 dark:text-zinc-50">
              {formatted.main}
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-indigo-500 dark:text-indigo-400 ml-1">
              .{formatted.centiseconds}
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
            {activeStopwatch
              ? activeStopwatch.status === 'running'
                ? 'Running'
                : 'Paused'
              : 'Ready'}
          </p>
        </div>

        {/* Title / Notes inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
          <input
            type="text"
            value={runTitle}
            onChange={(e) => setRunTitle(e.target.value)}
            placeholder="Run title (optional, e.g. Mock Drill #4)"
            className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={runNotes}
            onChange={(e) => setRunNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {!activeStopwatch ? (
            <button
              type="button"
              onClick={() => startStopwatch(runTitle)}
              className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start</span>
            </button>
          ) : (
            <>
              {activeStopwatch.status === 'running' ? (
                <button
                  type="button"
                  onClick={pauseStopwatch}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeStopwatch}
                  className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => lapStopwatch()}
                className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-semibold transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Flag className="w-4 h-4 text-sky-500" />
                <span>Lap</span>
              </button>

              <button
                type="button"
                onClick={handleStopAndSave}
                className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>Stop &amp; Save</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetStopwatch();
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>

        {/* Live Laps Table */}
        {activeStopwatch && activeStopwatch.laps.length > 0 && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 max-w-2xl mx-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Recorded Laps ({activeStopwatch.laps.length})
            </h3>
            <div className="overflow-x-auto border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Lap</th>
                    <th className="px-3 py-2 font-semibold">Split Time</th>
                    <th className="px-3 py-2 font-semibold">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 font-mono tabular-nums">
                  {[...activeStopwatch.laps].reverse().map((lap) => {
                    const splitFmt = formatHMSCentiseconds(lap.splitMs);
                    const cumFmt = formatHMSCentiseconds(lap.cumulativeMs);
                    return (
                      <tr key={lap.lapNumber}>
                        <td className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-300">
                          #{lap.lapNumber}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                          {splitFmt.main}.{splitFmt.centiseconds}
                        </td>
                        <td className="px-3 py-2 font-semibold text-zinc-900 dark:text-zinc-100">
                          {cumFmt.main}.{cumFmt.centiseconds}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Saved Stopwatch History */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Saved Stopwatch History
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Completed runs and lap splits
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-zinc-500 dark:text-zinc-400">
            {stopwatchRecords.length} {stopwatchRecords.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {stopwatchRecords.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No saved stopwatch runs yet. Click <strong>Stop &amp; Save</strong> after a run to store it here.
          </div>
        ) : (
          <div className="space-y-3">
            {stopwatchRecords.map((record) => {
              const durFmt = formatHMSCentiseconds(record.elapsedMs);
              const isExpanded = expandedRecordIds.has(record.id);
              const isConverted = Boolean(record.convertedToStudySessionId);

              return (
                <div
                  key={record.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {record.title || 'Stopwatch Run'}
                        </span>
                        <span className="text-xs font-mono font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {durFmt.main}.{durFmt.centiseconds}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>{formatDisplayDate(record.dateKey)}</span>
                        <span>·</span>
                        <span>{formatStudyDurationMs(record.elapsedMs)}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {record.laps.length} {record.laps.length === 1 ? 'lap' : 'laps'}
                        </span>
                      </div>

                      {record.notes && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{record.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {record.laps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpandRecord(record.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>Laps</span>
                        </button>
                      )}

                      {isConverted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Converted to Study Session</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setRecordToConvert(record);
                            setConvertTaskId('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5" />
                          <span>Save as Study Session</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setRecordToDelete(record.id)}
                        aria-label="Delete stopwatch record"
                        className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && record.laps.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono tabular-nums text-[11px]">
                        {record.laps.map((lap) => {
                          const s = formatHMSCentiseconds(lap.splitMs);
                          const c = formatHMSCentiseconds(lap.cumulativeMs);
                          return (
                            <div
                              key={lap.lapNumber}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between"
                            >
                              <span className="font-semibold text-zinc-500">Lap #{lap.lapNumber}</span>
                              <span className="text-zinc-700 dark:text-zinc-300">
                                +{s.main}.{s.centiseconds}
                              </span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {c.main}.{c.centiseconds}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Convert to Study Session Modal */}
      {recordToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Save as Study Session
              </h3>
              <button
                type="button"
                onClick={() => setRecordToConvert(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
              <p>
                Converting <strong>{recordToConvert.title || 'Stopwatch Run'}</strong> (
                <span className="font-mono font-semibold">
                  {formatStudyDurationMs(recordToConvert.elapsedMs)}
                </span>
                ) will add it to your Study Session History and Study Analytics.
              </p>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Link to Study To-Do (Optional)
                </label>
                <select
                  value={convertTaskId}
                  onChange={(e) => setConvertTaskId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Unlinked ({recordToConvert.title || 'Stopwatch Study Session'})</option>
                  {studyTodos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                      {t.estimatedDurationMinutes
                        ? ` (${formatStudyMinutes(t.estimatedDurationMinutes)})`
                        : ''}
                      {' · '}
                      {formatDisplayDate(t.date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToConvert(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmConvert}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition cursor-pointer"
              >
                Convert &amp; Log Study Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Stopwatch Record Guard */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="Delete Stopwatch Record?"
        message="This will delete this saved stopwatch entry."
        confirmText="Delete Record"
        isDestructive
        onConfirm={() => {
          if (recordToDelete) deleteStopwatchRecord(recordToDelete);
          setRecordToDelete(null);
        }}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}
