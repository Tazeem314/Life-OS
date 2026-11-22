'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  computeActiveStudyElapsedMs,
  computeStudyTargetProgress,
  formatHMS,
  formatStudyDurationMs,
  formatStudyMinutes,
  isStudyTodo,
} from '@/lib/study-service';
import { STUDY_DURATION_PRESETS } from '@/lib/study-types';
import { getTodayKey, formatDisplayDate } from '@/lib/date-utils';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { useStudyTimerPiP } from '@/components/study/StudyTimerPiPContext';
import {
  Timer,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Trash2,
  GraduationCap,
  Calendar,
  AlignLeft,
  Info,
  Clock,
  Plus,
  PictureInPicture2,
  Hourglass,
  Bell,
} from 'lucide-react';

export function StudyTimerView() {
  const {
    todos,
    studySessions,
    activeStudyTimer,
    startStudyTimer,
    pauseStudyTimer,
    resumeStudyTimer,
    updateActiveStudyTimerNotes,
    finishStudyTimer,
    cancelStudyTimer,
    deleteStudySession,
    setActiveTab,
  } = useLifeOS();

  const { isFloatingOpen, toggleFloatingTimer } = useStudyTimerPiP();
  const todayKey = getTodayKey();

  // Live timer setup state (used when idle)
  const [sessionMode, setSessionMode] = useState<'linked' | 'unlinked'>('linked');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskScopeFilter, setTaskScopeFilter] = useState<'today' | 'all_open'>('today');
  const [unlinkedLabel, setUnlinkedLabel] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'auto' | 'none' | 'preset' | 'custom'>('auto');
  const [presetTargetMinutes, setPresetTargetMinutes] = useState<number>(60);
  const [customTargetMinutes, setCustomTargetMinutes] = useState<string>('45');
  const [setupNotes, setSetupNotes] = useState<string>('');
  const [setupError, setSetupError] = useState<string>('');

  // Live active timer state
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [notesDraft, setNotesDraft] = useState<{ sessionId: string; text: string } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const draftNotes =
    activeStudyTimer && notesDraft?.sessionId === activeStudyTimer.sessionId
      ? notesDraft.text
      : activeStudyTimer?.notes || '';

  // Wall-clock tick & visibility resync for active timer
  useEffect(() => {
    if (!activeStudyTimer || activeStudyTimer.status !== 'running') return;

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

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
  }, [activeStudyTimer]);

  // Filter eligible Study To-Dos
  const studyTodos = useMemo(() => {
    const allStudy = (todos || []).filter((t) => isStudyTodo(t));
    if (taskScopeFilter === 'today') {
      return allStudy
        .filter((t) => t.date === todayKey)
        .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.order ?? 0) - (b.order ?? 0));
    }
    return allStudy
      .filter((t) => !t.completed)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.order ?? 0) - (b.order ?? 0));
  }, [todos, taskScopeFilter, todayKey]);

  const effectiveSelectedTaskId = useMemo(() => {
    if (sessionMode !== 'linked') return '';
    if (selectedTaskId && studyTodos.some((t) => t.id === selectedTaskId)) {
      return selectedTaskId;
    }
    const firstOpen = studyTodos.find((t) => !t.completed) || studyTodos[0];
    return firstOpen ? firstOpen.id : '';
  }, [sessionMode, studyTodos, selectedTaskId]);

  const selectedLinkedTask = useMemo(() => {
    if (sessionMode !== 'linked' || !effectiveSelectedTaskId) return null;
    return studyTodos.find((t) => t.id === effectiveSelectedTaskId) || null;
  }, [sessionMode, effectiveSelectedTaskId, studyTodos]);

  const resolvedSetupTargetMinutes = useMemo<number | null>(() => {
    if (targetMode === 'none') return null;
    if (targetMode === 'preset') return presetTargetMinutes;
    if (targetMode === 'custom') {
      const parsed = parseInt(customTargetMinutes, 10);
      return Number.isFinite(parsed) && parsed > 0 ? Math.min(1440, parsed) : null;
    }
    // 'auto': inherit estimatedDurationMinutes from selected linked Study To-Do if present
    if (
      sessionMode === 'linked' &&
      selectedLinkedTask?.estimatedDurationMinutes &&
      selectedLinkedTask.estimatedDurationMinutes > 0
    ) {
      return selectedLinkedTask.estimatedDurationMinutes;
    }
    return null;
  }, [targetMode, presetTargetMinutes, customTargetMinutes, sessionMode, selectedLinkedTask]);

  const elapsedMs = activeStudyTimer
    ? computeActiveStudyElapsedMs(
        activeStudyTimer,
        activeStudyTimer.status === 'running' ? nowMs : activeStudyTimer.pausedAtTimestamp || nowMs
      )
    : 0;

  const targetProgress = activeStudyTimer
    ? computeStudyTargetProgress(elapsedMs, activeStudyTimer.targetDurationMinutes)
    : null;

  const livePausedMs = useMemo(() => {
    if (!activeStudyTimer) return 0;
    const extraPaused =
      activeStudyTimer.status === 'paused' && typeof activeStudyTimer.pausedAtTimestamp === 'number'
        ? Math.max(0, nowMs - activeStudyTimer.pausedAtTimestamp)
        : 0;
    return (activeStudyTimer.totalPausedMs || 0) + extraPaused;
  }, [activeStudyTimer, nowMs]);

  const handleRequestDesktopNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    } catch {}
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (targetMode === 'custom') {
      const parsed = parseInt(customTargetMinutes, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
        setSetupError('Custom target duration must be between 1 and 1440 minutes.');
        return;
      }
    }

    if (sessionMode === 'linked') {
      if (!effectiveSelectedTaskId) {
        setSetupError('Select a Study To-Do or switch to an Unlinked Study Session.');
        return;
      }
      const res = startStudyTimer(
        effectiveSelectedTaskId,
        undefined,
        setupNotes,
        resolvedSetupTargetMinutes
      );
      if (!res.success && res.error) {
        setSetupError(res.error);
      } else {
        setSetupNotes('');
        setTargetMode('auto');
      }
    } else {
      const label = unlinkedLabel.trim() || 'Unlinked Study Session';
      const res = startStudyTimer(null, label, setupNotes, resolvedSetupTargetMinutes);
      if (!res.success && res.error) {
        setSetupError(res.error);
      } else {
        setUnlinkedLabel('');
        setSetupNotes('');
        setTargetMode('auto');
      }
    }
  };

  const handleFinish = () => {
    finishStudyTimer(draftNotes);
  };

  const formatTimeOfDay = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Timer className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Study Timer</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Timestamp-accurate study sessions persisted across refreshes and tab switches
          </p>
        </div>
      </div>

      {/* Main Timer Card */}
      {activeStudyTimer ? (
        <div className="p-5 sm:p-8 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-6">
          {/* Status + Linked Task Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    activeStudyTimer.status === 'running'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeStudyTimer.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {activeStudyTimer.status === 'running' ? 'Session Running' : 'Session Paused'}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {activeStudyTimer.taskId ? 'Linked Study To-Do' : 'Unlinked Study Session'}
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2 truncate">
                {activeStudyTimer.taskNameSnapshot}
              </h2>
            </div>

            <div className="flex items-center gap-3 sm:justify-end shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => void toggleFloatingTimer()}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isFloatingOpen
                    ? 'bg-sky-600 border-sky-600 text-white shadow-xs hover:bg-sky-500'
                    : 'bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60'
                }`}
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
                <span>{isFloatingOpen ? 'Floating Mini Timer On' : 'Float Mini Screen'}</span>
              </button>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums space-y-0.5 sm:text-right shrink-0">
                <div>Started: {formatTimeOfDay(activeStudyTimer.startTimestamp)}</div>
                <div>
                  Pauses: {activeStudyTimer.pauseCount} ({formatStudyDurationMs(livePausedMs)})
                </div>
              </div>
            </div>
          </div>

          {/* Elapsed / Remaining Time Readout */}
          <div className="py-4 sm:py-6 flex flex-col items-center justify-center text-center">
            {targetProgress?.hasTarget ? (
              <div className="w-full max-w-md space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  <Hourglass className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    {targetProgress.isOvertime
                      ? 'Overtime (Target Completed)'
                      : 'Time Left'}
                  </span>
                </div>

                <div
                  className={`text-5xl sm:text-7xl font-mono font-bold tabular-nums tracking-tight ${
                    targetProgress.isOvertime
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-950 dark:text-zinc-50'
                  }`}
                >
                  {targetProgress.primaryTimeLabel}
                </div>

                <div className="space-y-1.5 px-2">
                  <progress
                    value={targetProgress.progressPct}
                    max={100}
                    className={`w-full h-2.5 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-zinc-100 dark:[&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all ${
                      targetProgress.isOvertime
                        ? '[&::-webkit-progress-value]:bg-amber-500'
                        : '[&::-webkit-progress-value]:bg-sky-500'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    <span>Elapsed: {formatHMS(elapsedMs)}</span>
                    <span>
                      Target: {formatStudyMinutes(targetProgress.targetMinutes)} ({targetProgress.progressPct}%)
                    </span>
                  </div>
                </div>

                {notifPermission === 'default' && !targetProgress.isOvertime && (
                  <button
                    type="button"
                    onClick={() => void handleRequestDesktopNotification()}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <Bell className="w-3 h-3" />
                    <span>Enable desktop alert when countdown reaches zero</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="text-5xl sm:text-7xl font-mono font-bold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">
                  {formatHMS(elapsedMs)}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                  Actual focused time (excluding paused intervals)
                </p>
              </>
            )}
          </div>

          {/* Primary Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {activeStudyTimer.status === 'running' ? (
              <button
                type="button"
                onClick={pauseStudyTimer}
                className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeStudyTimer}
                className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finish Session</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleFloatingTimer()}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sm font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PictureInPicture2 className="w-4 h-4" />
              <span>{isFloatingOpen ? 'Close Mini Screen' : 'Pop Out Mini Timer'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl border border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Session</span>
            </button>
          </div>

          {/* Session Notes */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <AlignLeft className="w-3.5 h-3.5 text-zinc-400" />
                Session Notes
              </label>
              <button
                type="button"
                onClick={() => updateActiveStudyTimerNotes(draftNotes)}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Save notes
              </button>
            </div>
            <textarea
              rows={3}
              value={draftNotes}
              onChange={(e) =>
                activeStudyTimer &&
                setNotesDraft({ sessionId: activeStudyTimer.sessionId, text: e.target.value })
              }
              onBlur={() => updateActiveStudyTimerNotes(draftNotes)}
              placeholder="Write topics covered, problems solved, or key takeaways during this session..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/60 text-xs text-sky-800 dark:text-sky-200">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
            <span>
              Finishing a study session logs your actual focus time to Study Analytics. Linked Study To-Dos are <strong>never</strong> marked completed automatically — check them off manually in To-Dos when finished.
            </span>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleStart}
          className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Start a Study Session
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Link a Study To-Do or run an unlinked focus timer
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSessionMode('linked');
                  setSetupError('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  sessionMode === 'linked'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Linked Study Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionMode('unlinked');
                  setSetupError('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  sessionMode === 'unlinked'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Unlinked Session
              </button>
            </div>
          </div>

          {setupError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {setupError}
            </div>
          )}

          {sessionMode === 'linked' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                  Select Study To-Do
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTaskScopeFilter('today')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      taskScopeFilter === 'today'
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Today&apos;s Study Tasks
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskScopeFilter('all_open')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer ${
                      taskScopeFilter === 'all_open'
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    All Open Study Tasks
                  </button>
                </div>
              </div>

              {studyTodos.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 text-center space-y-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                    No {taskScopeFilter === 'today' ? "Study To-Dos scheduled for today" : 'open Study To-Dos'} yet.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveTab('todos')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Study To-Do
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionMode('unlinked')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300 dark:hover:bg-zinc-600 transition cursor-pointer"
                    >
                      Start Unlinked Session Instead
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={effectiveSelectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    setTargetMode('auto');
                  }}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {studyTodos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                      {t.estimatedDurationMinutes
                        ? ` (Est. ${formatStudyMinutes(t.estimatedDurationMinutes)})`
                        : ''}
                      {taskScopeFilter === 'all_open' ? ` · ${formatDisplayDate(t.date)}` : ''}
                      {t.completed ? ' [Completed]' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                Study Topic / Session Label (Optional)
              </label>
              <input
                type="text"
                value={unlinkedLabel}
                onChange={(e) => setUnlinkedLabel(e.target.value)}
                placeholder="e.g. Organic Chemistry Revision, Mock Paper..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Optional Target Countdown Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                <Hourglass className="w-3.5 h-3.5 text-sky-500" />
                Target Duration / Time Left Countdown (Optional)
              </label>
              {resolvedSetupTargetMinutes ? (
                <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                  Countdown: {formatStudyMinutes(resolvedSetupTargetMinutes)}
                  {targetMode === 'auto' && selectedLinkedTask?.estimatedDurationMinutes
                    ? ' (from task)'
                    : ''}
                </span>
              ) : (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Open-ended elapsed count-up
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTargetMode('none')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  resolvedSetupTargetMinutes === null && targetMode !== 'custom'
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                No Target
              </button>

              {STUDY_DURATION_PRESETS.map((preset) => {
                const isActivePreset =
                  (targetMode === 'preset' && presetTargetMinutes === preset.minutes) ||
                  (targetMode === 'auto' && resolvedSetupTargetMinutes === preset.minutes);
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setTargetMode('preset');
                      setPresetTargetMinutes(preset.minutes);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActivePreset
                        ? 'bg-sky-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  if (resolvedSetupTargetMinutes) {
                    setCustomTargetMinutes(String(resolvedSetupTargetMinutes));
                  }
                  setTargetMode('custom');
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  targetMode === 'custom' ||
                  (targetMode === 'auto' &&
                    resolvedSetupTargetMinutes !== null &&
                    !STUDY_DURATION_PRESETS.some((p) => p.minutes === resolvedSetupTargetMinutes))
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                Custom
              </button>
            </div>

            {targetMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={customTargetMinutes}
                  onChange={(e) => setCustomTargetMinutes(e.target.value)}
                  className="w-28 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  minutes (1 – 1440)
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Initial Session Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={setupNotes}
              onChange={(e) => setSetupNotes(e.target.value)}
              placeholder="Target chapters, problem numbers, or goals for this sitting..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Float your timer in an always-on-top mini window anytime while watching lectures or multitasking.
            </span>
            <button
              type="submit"
              disabled={sessionMode === 'linked' && studyTodos.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xs transition active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Study Timer</span>
            </button>
          </div>
        </form>
      )}

      {/* Study Session History */}
      <div className="p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              Study Session History
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Completed timer sessions and converted study blocks
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-zinc-500 dark:text-zinc-400">
            {studySessions.length} {studySessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {studySessions.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-400 dark:text-zinc-500">
            No completed study sessions recorded yet. Start your first timer above!
          </div>
        ) : (
          <div className="space-y-2.5">
            {studySessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {session.taskNameSnapshot}
                    </span>
                    <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                      {session.source === 'stopwatch_converted'
                        ? 'From Stopwatch'
                        : session.isUnlinked || !session.taskId
                          ? 'Unlinked'
                          : 'Study To-Do'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDisplayDate(session.dateKey)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3" />
                      {formatTimeOfDay(session.startTimestamp)} – {formatTimeOfDay(session.endTimestamp)}
                    </span>
                    {session.targetDurationMinutes && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          Target {formatStudyMinutes(session.targetDurationMinutes)}
                        </span>
                      </>
                    )}
                    {session.pauseCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {session.pauseCount} {session.pauseCount === 1 ? 'pause' : 'pauses'} (
                          {formatStudyDurationMs(session.totalPausedMs)})
                        </span>
                      </>
                    )}
                  </div>

                  {session.notes && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900/70 px-2.5 py-1.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 mt-1.5">
                      {session.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400">
                      {formatHMS(session.actualDurationMs)}
                    </div>
                    <div className="text-[10px] font-mono tabular-nums text-zinc-400">
                      {formatStudyDurationMs(session.actualDurationMs)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(session.id)}
                    aria-label="Delete study session"
                    className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Active Session Guard */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Cancel Active Study Session?"
        message="This will discard the active study timer without saving its duration to Study Analytics."
        confirmText="Discard Session"
        isDestructive
        onConfirm={() => {
          cancelStudyTimer();
          setShowCancelConfirm(false);
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Delete Study Session Guard */}
      <ConfirmDialog
        isOpen={Boolean(sessionToDelete)}
        title="Delete Study Session?"
        message="This study session will be removed from your history and Study Analytics."
        confirmText="Delete Session"
        isDestructive
        onConfirm={() => {
          if (sessionToDelete) deleteStudySession(sessionToDelete);
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
