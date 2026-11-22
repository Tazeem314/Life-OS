'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  computeActiveStopwatchElapsedMs,
  computeActiveStudyElapsedMs,
  computeStudyTargetProgress,
  formatHMS,
  formatHMSCentiseconds,
  formatStudyMinutes,
} from '@/lib/study-service';
import { ActiveStopwatchState, ActiveStudyTimerState } from '@/lib/study-types';
import {
  Play,
  Pause,
  CheckCircle2,
  Maximize2,
  X,
  PictureInPicture2,
  Move,
  Flag,
  Square,
} from 'lucide-react';

export type FloatingTimerMode = 'none' | 'document_pip' | 'video_pip' | 'in_app';
export type FloatingTargetKind = 'none' | 'study_timer' | 'stopwatch';
type InAppCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

interface DocumentPiPWindow extends Window {
  document: Document;
}

interface WindowWithDocumentPiP extends Window {
  documentPictureInPicture?: {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<DocumentPiPWindow>;
    window?: DocumentPiPWindow | null;
  };
}

interface StudyTimerPiPContextValue {
  floatingMode: FloatingTimerMode;
  floatingKind: FloatingTargetKind;
  isFloatingOpen: boolean;
  isStopwatchFloatingOpen: boolean;
  supportsSystemPiP: boolean;
  openFloatingTimer: () => Promise<void>;
  openFloatingStopwatch: () => Promise<void>;
  closeFloatingTimer: () => void;
  toggleFloatingTimer: () => Promise<void>;
  toggleFloatingStopwatch: () => Promise<void>;
}

const StudyTimerPiPContext = createContext<StudyTimerPiPContextValue | null>(null);

const CORNER_CLASSES: Record<InAppCorner, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-20 right-4',
  'top-left': 'top-20 left-4',
};

const CORNER_ORDER: InAppCorner[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right'];

function copyStylesToPiPWindow(targetDoc: Document) {
  const isDark = document.documentElement.classList.contains('dark');
  targetDoc.documentElement.className = document.documentElement.className;
  if (isDark) {
    targetDoc.documentElement.classList.add('dark');
    targetDoc.documentElement.style.colorScheme = 'dark';
  } else {
    targetDoc.documentElement.classList.remove('dark');
    targetDoc.documentElement.style.colorScheme = 'light';
  }

  targetDoc.body.className = document.body.className;

  Array.from(document.styleSheets).forEach((styleSheet) => {
    try {
      const cssRules = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join('');
      if (cssRules) {
        const styleEl = targetDoc.createElement('style');
        styleEl.textContent = cssRules;
        targetDoc.head.appendChild(styleEl);
      }
    } catch {
      if (styleSheet.href) {
        const linkEl = targetDoc.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = styleSheet.href;
        targetDoc.head.appendChild(linkEl);
      }
    }
  });
}

function drawStudyTimerToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timer: ActiveStudyTimerState,
  elapsedMs: number,
  isDark: boolean
) {
  const progress = computeStudyTargetProgress(elapsedMs, timer.targetDurationMinutes);

  ctx.fillStyle = isDark ? '#09090b' : '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = progress.isOvertime
    ? '#f59e0b'
    : timer.status === 'running'
      ? '#0284c7'
      : '#a1a1aa';
  ctx.fillRect(0, 0, width, 6);

  const statusText =
    timer.status === 'paused'
      ? 'PAUSED'
      : progress.isOvertime
        ? 'OVERTIME'
        : 'STUDYING';
  const badgeBg =
    timer.status === 'paused'
      ? isDark
        ? '#451a03'
        : '#fef3c7'
      : progress.isOvertime
        ? isDark
          ? '#451a03'
          : '#ffedd5'
        : isDark
          ? '#082f49'
          : '#e0f2fe';
  const badgeText =
    timer.status === 'paused' || progress.isOvertime
      ? isDark
        ? '#fbbf24'
        : '#b45309'
      : isDark
        ? '#38bdf8'
        : '#0369a1';

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(36, 34, 138, 34, 17);
  ctx.fill();

  ctx.fillStyle = badgeText;
  ctx.font = '700 16px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusText, 56, 52);

  ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Life OS · Timer', width - 36, 52);
  ctx.textAlign = 'left';

  ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
  ctx.font = '600 24px system-ui, -apple-system, sans-serif';
  let title = timer.taskNameSnapshot || 'Study Session';
  while (title.length > 3 && ctx.measureText(title).width > width - 72) {
    title = title.slice(0, -4) + '...';
  }
  ctx.fillText(title, 36, 108);

  ctx.fillStyle = progress.isOvertime
    ? isDark
      ? '#fbbf24'
      : '#d97706'
    : isDark
      ? '#f4f4f5'
      : '#09090b';
  ctx.font = '700 76px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(progress.primaryTimeLabel, 36, 196);

  ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
  ctx.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  if (progress.hasTarget) {
    const label = progress.isOvertime ? 'Overtime · ' : 'Time Left · ';
    ctx.fillText(
      `${label}Elapsed ${formatHMS(elapsedMs)} / ${formatStudyMinutes(progress.targetMinutes)}`,
      36,
      268
    );
  } else {
    ctx.fillText('Elapsed Focus Time', 36, 268);
  }

  ctx.fillStyle = isDark ? '#27272a' : '#e4e4e7';
  ctx.beginPath();
  ctx.roundRect(36, 308, width - 72, 16, 8);
  ctx.fill();

  const fillFraction = progress.hasTarget
    ? Math.min(1, progress.progressPct / 100)
    : timer.status === 'running'
      ? ((elapsedMs / 1000) % 60) / 60
      : 0.35;

  ctx.fillStyle = progress.isOvertime
    ? '#f59e0b'
    : timer.status === 'paused'
      ? '#a1a1aa'
      : '#0284c7';
  const fillWidth = Math.max(12, (width - 72) * fillFraction);
  ctx.beginPath();
  ctx.roundRect(36, 308, fillWidth, 16, 8);
  ctx.fill();
}

function drawStopwatchToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sw: ActiveStopwatchState,
  elapsedMs: number,
  isDark: boolean
) {
  const fmt = formatHMSCentiseconds(elapsedMs);

  ctx.fillStyle = isDark ? '#09090b' : '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = sw.status === 'running' ? '#4f46e5' : '#a1a1aa';
  ctx.fillRect(0, 0, width, 6);

  const statusText = sw.status === 'paused' ? 'PAUSED' : 'STOPWATCH';
  const badgeBg =
    sw.status === 'paused'
      ? isDark
        ? '#451a03'
        : '#fef3c7'
      : isDark
        ? '#1e1b4b'
        : '#e0e7ff';
  const badgeText =
    sw.status === 'paused'
      ? isDark
        ? '#fbbf24'
        : '#b45309'
      : isDark
        ? '#a5b4fc'
        : '#4338ca';

  ctx.fillStyle = badgeBg;
  ctx.beginPath();
  ctx.roundRect(36, 34, 152, 34, 17);
  ctx.fill();

  ctx.fillStyle = badgeText;
  ctx.font = '700 16px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusText, 54, 52);

  ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Life OS · Stopwatch', width - 36, 52);
  ctx.textAlign = 'left';

  ctx.fillStyle = isDark ? '#e4e4e7' : '#27272a';
  ctx.font = '600 24px system-ui, -apple-system, sans-serif';
  let title = sw.title?.trim() || 'Stopwatch Run';
  while (title.length > 3 && ctx.measureText(title).width > width - 72) {
    title = title.slice(0, -4) + '...';
  }
  ctx.fillText(title, 36, 108);

  ctx.fillStyle = isDark ? '#f4f4f5' : '#09090b';
  ctx.font = '700 68px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`${fmt.main}.${fmt.centiseconds}`, 36, 196);

  ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
  ctx.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  if (sw.laps.length > 0) {
    const lastLap = sw.laps[sw.laps.length - 1];
    const lapFmt = formatHMSCentiseconds(lastLap.splitMs);
    ctx.fillText(
      `Laps: ${sw.laps.length} · Last #${lastLap.lapNumber} (+${lapFmt.main}.${lapFmt.centiseconds})`,
      36,
      268
    );
  } else {
    ctx.fillText('0 laps recorded', 36, 268);
  }

  ctx.fillStyle = isDark ? '#27272a' : '#e4e4e7';
  ctx.beginPath();
  ctx.roundRect(36, 308, width - 72, 16, 8);
  ctx.fill();

  const fillFraction = sw.status === 'running' ? ((elapsedMs / 1000) % 60) / 60 : 0.35;
  ctx.fillStyle = sw.status === 'paused' ? '#a1a1aa' : '#4f46e5';
  const fillWidth = Math.max(12, (width - 72) * fillFraction);
  ctx.beginPath();
  ctx.roundRect(36, 308, fillWidth, 16, 8);
  ctx.fill();
}

interface FloatingTimerCardProps {
  timer: ActiveStudyTimerState;
  mode: 'document_pip' | 'in_app';
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onFocusApp: () => void;
  onClose: () => void;
  onCycleCorner?: () => void;
}

function FloatingTimerCard({
  timer,
  mode,
  onPause,
  onResume,
  onFinish,
  onFocusApp,
  onClose,
  onCycleCorner,
}: FloatingTimerCardProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (timer.status !== 'running') return;
    const ownerWin = typeof window !== 'undefined' ? window : null;
    if (!ownerWin) return;

    const id = ownerWin.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => ownerWin.clearInterval(id);
  }, [timer.status]);

  const elapsedMs = computeActiveStudyElapsedMs(
    timer,
    timer.status === 'running' ? nowMs : timer.pausedAtTimestamp || nowMs
  );
  const targetProgress = computeStudyTargetProgress(elapsedMs, timer.targetDurationMinutes);

  const isDocPiP = mode === 'document_pip';

  return (
    <div
      className={
        isDocPiP
          ? 'min-h-screen w-full flex flex-col justify-between p-3.5 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none'
          : 'w-full flex flex-col gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-2xl text-zinc-900 dark:text-zinc-100 select-none'
      }
    >
      {/* Top Status & Window Actions */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            timer.status === 'paused'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
              : targetProgress.isOvertime
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300'
                : 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              timer.status === 'paused'
                ? 'bg-amber-500'
                : targetProgress.isOvertime
                  ? 'bg-orange-500 animate-pulse'
                  : 'bg-emerald-500 animate-pulse'
            }`}
          />
          {timer.status === 'paused'
            ? 'Paused'
            : targetProgress.isOvertime
              ? 'Overtime'
              : 'Focusing'}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!isDocPiP && onCycleCorner && (
            <button
              type="button"
              onClick={onCycleCorner}
              title="Move floating card corner"
              aria-label="Move floating card corner"
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onFocusApp}
            title="Open Study Timer page"
            aria-label="Open Study Timer page"
            className="p-1 rounded-lg text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close mini timer"
            aria-label="Close mini timer"
            className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Snapshot Name */}
      <div className="min-w-0">
        <p
          title={timer.taskNameSnapshot}
          className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate"
        >
          {timer.taskNameSnapshot}
        </p>

        {/* Primary Timer Readout */}
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span
            className={`text-3xl font-mono font-bold tabular-nums tracking-tight ${
              targetProgress.isOvertime
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-zinc-950 dark:text-zinc-50'
            }`}
          >
            {targetProgress.primaryTimeLabel}
          </span>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
            {targetProgress.hasTarget
              ? targetProgress.isOvertime
                ? 'Overtime'
                : 'Left'
              : 'Elapsed'}
          </span>
        </div>

        {/* Sub-line with Elapsed & Target when countdown is active */}
        {targetProgress.hasTarget && (
          <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            <span>Elapsed {formatHMS(elapsedMs)}</span>
            <span>
              {targetProgress.progressPct}% of {formatStudyMinutes(targetProgress.targetMinutes)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        {targetProgress.hasTarget ? (
          <progress
            value={targetProgress.progressPct}
            max={100}
            className={`w-full h-1.5 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-zinc-100 dark:[&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all ${
              targetProgress.isOvertime
                ? '[&::-webkit-progress-value]:bg-amber-500'
                : '[&::-webkit-progress-value]:bg-sky-500'
            }`}
          />
        ) : (
          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full w-full rounded-full ${
                timer.status === 'running'
                  ? 'bg-sky-500/70 animate-pulse'
                  : 'bg-amber-500/60'
              }`}
            />
          </div>
        )}
      </div>

      {/* Controls: Pause/Resume & Finish */}
      <div className="flex items-center gap-2 pt-0.5">
        {timer.status === 'running' ? (
          <button
            type="button"
            onClick={onPause}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Resume</span>
          </button>
        )}

        <button
          type="button"
          onClick={onFinish}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Finish</span>
        </button>
      </div>
    </div>
  );
}

interface FloatingStopwatchCardProps {
  stopwatch: ActiveStopwatchState;
  mode: 'document_pip' | 'in_app';
  onPause: () => void;
  onResume: () => void;
  onLap: () => void;
  onStopAndSave: () => void;
  onFocusApp: () => void;
  onClose: () => void;
  onCycleCorner?: () => void;
}

function FloatingStopwatchCard({
  stopwatch,
  mode,
  onPause,
  onResume,
  onLap,
  onStopAndSave,
  onFocusApp,
  onClose,
  onCycleCorner,
}: FloatingStopwatchCardProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (stopwatch.status !== 'running') return;
    const ownerWin = typeof window !== 'undefined' ? window : null;
    if (!ownerWin) return;

    const id = ownerWin.setInterval(() => {
      setNowMs(Date.now());
    }, 80);

    return () => ownerWin.clearInterval(id);
  }, [stopwatch.status]);

  const elapsedMs = computeActiveStopwatchElapsedMs(stopwatch, nowMs);
  const formatted = formatHMSCentiseconds(elapsedMs);
  const latestLap =
    stopwatch.laps.length > 0 ? stopwatch.laps[stopwatch.laps.length - 1] : null;
  const latestLapFormatted = latestLap ? formatHMSCentiseconds(latestLap.splitMs) : null;

  const isDocPiP = mode === 'document_pip';

  return (
    <div
      className={
        isDocPiP
          ? 'min-h-screen w-full flex flex-col justify-between p-3.5 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none'
          : 'w-full flex flex-col gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-2xl text-zinc-900 dark:text-zinc-100 select-none'
      }
    >
      {/* Top Status & Window Actions */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            stopwatch.status === 'paused'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              stopwatch.status === 'paused'
                ? 'bg-amber-500'
                : 'bg-indigo-500 animate-pulse'
            }`}
          />
          {stopwatch.status === 'paused' ? 'Paused' : 'Stopwatch'}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {!isDocPiP && onCycleCorner && (
            <button
              type="button"
              onClick={onCycleCorner}
              title="Move floating card corner"
              aria-label="Move floating card corner"
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onFocusApp}
            title="Open Stopwatch page"
            aria-label="Open Stopwatch page"
            className="p-1 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close mini stopwatch"
            aria-label="Close mini stopwatch"
            className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Centisecond Readout */}
      <div className="min-w-0">
        <p
          title={stopwatch.title || 'Stopwatch Run'}
          className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate"
        >
          {stopwatch.title?.trim() || 'Stopwatch Run'}
        </p>

        <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums tracking-tight">
          <span className="text-3xl font-bold text-zinc-950 dark:text-zinc-50">
            {formatted.main}
          </span>
          <span className="text-lg font-bold text-indigo-500 dark:text-indigo-400">
            .{formatted.centiseconds}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
          <span>
            {stopwatch.laps.length} {stopwatch.laps.length === 1 ? 'lap' : 'laps'}
          </span>
          {latestLap && latestLapFormatted && (
            <span>
              #{latestLap.lapNumber} +{latestLapFormatted.main}.{latestLapFormatted.centiseconds}
            </span>
          )}
        </div>
      </div>

      {/* Animated Status Bar */}
      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full w-full rounded-full ${
            stopwatch.status === 'running' ? 'bg-indigo-500/75 animate-pulse' : 'bg-amber-500/60'
          }`}
        />
      </div>

      {/* Controls: Pause/Resume, Lap, Stop & Save */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {stopwatch.status === 'running' ? (
          <button
            type="button"
            onClick={onPause}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Resume</span>
          </button>
        )}

        <button
          type="button"
          onClick={onLap}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold transition active:scale-95 cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5 text-sky-500" />
          <span>Lap</span>
        </button>

        <button
          type="button"
          onClick={onStopAndSave}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
        >
          <Square className="w-3 h-3" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}

export function StudyTimerPiPProvider({ children }: { children: React.ReactNode }) {
  const {
    activeStudyTimer,
    pauseStudyTimer,
    resumeStudyTimer,
    finishStudyTimer,
    activeStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    lapStopwatch,
    stopAndSaveStopwatch,
    setActiveTab,
    showToast,
  } = useLifeOS();

  const [floatingMode, setFloatingMode] = useState<FloatingTimerMode>('none');
  const [floatingKind, setFloatingKind] = useState<FloatingTargetKind>('none');
  const [docPiPContainer, setDocPiPContainer] = useState<HTMLElement | null>(null);
  const [inAppCorner, setInAppCorner] = useState<InAppCorner>('bottom-right');

  const docPiPWinRef = useRef<DocumentPiPWindow | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSyncingVideoRef = useRef<boolean>(false);
  const activeTimerRef = useRef<ActiveStudyTimerState | null>(activeStudyTimer);
  const activeStopwatchRef = useRef<ActiveStopwatchState | null>(activeStopwatch);

  useEffect(() => {
    activeTimerRef.current = activeStudyTimer;
  }, [activeStudyTimer]);

  useEffect(() => {
    activeStopwatchRef.current = activeStopwatch;
  }, [activeStopwatch]);

  const supportsSystemPiP = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const winWithPiP = window as WindowWithDocumentPiP;
    return Boolean(
      winWithPiP.documentPictureInPicture || document.pictureInPictureEnabled
    );
  }, []);

  const teardownVideoPiP = useCallback(() => {
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    }
  }, []);

  const closeFloatingTimer = useCallback(() => {
    if (docPiPWinRef.current) {
      try {
        docPiPWinRef.current.close();
      } catch {}
      docPiPWinRef.current = null;
    }
    teardownVideoPiP();
    setDocPiPContainer(null);
    setFloatingMode('none');
    setFloatingKind('none');
  }, [teardownVideoPiP]);

  // Automatically close floating PiP windows if the floating target finishes, resets, or cancels
  useEffect(() => {
    const missingTarget =
      (floatingKind === 'study_timer' && !activeStudyTimer) ||
      (floatingKind === 'stopwatch' && !activeStopwatch);

    if (!missingTarget || floatingMode === 'none') return;

    if (docPiPWinRef.current) {
      try {
        docPiPWinRef.current.close();
      } catch {}
      docPiPWinRef.current = null;
    }
    teardownVideoPiP();

    const resetTimer = window.setTimeout(() => {
      setDocPiPContainer(null);
      setFloatingMode('none');
      setFloatingKind('none');
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [activeStudyTimer, activeStopwatch, floatingKind, floatingMode, teardownVideoPiP]);

  // Keep Document PiP dark/light class synced with main document
  useEffect(() => {
    if (!docPiPContainer) return;
    const syncDark = () => {
      const pipWin = docPiPWinRef.current;
      if (!pipWin) return;
      const isDark = document.documentElement.classList.contains('dark');
      const rootEl = pipWin.document.documentElement;
      rootEl.classList.toggle('dark', isDark);
      rootEl.style.colorScheme = isDark ? 'dark' : 'light';
    };
    syncDark();
    const observer = new MutationObserver(syncDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [docPiPContainer]);

  // Keep Canvas Video PiP stream updated while video_pip mode is active
  useEffect(() => {
    if (floatingMode !== 'video_pip' || floatingKind === 'none') return;
    const currentStatus =
      floatingKind === 'study_timer'
        ? activeStudyTimer?.status
        : activeStopwatch?.status;
    if (!currentStatus) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderFrame = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (floatingKind === 'study_timer') {
        const current = activeTimerRef.current;
        if (!current) return;
        const nowMs =
          current.status === 'running'
            ? Date.now()
            : current.pausedAtTimestamp || Date.now();
        const elapsedMs = computeActiveStudyElapsedMs(current, nowMs);
        drawStudyTimerToCanvas(ctx, canvas.width, canvas.height, current, elapsedMs, isDark);
      } else {
        const current = activeStopwatchRef.current;
        if (!current) return;
        const elapsedMs = computeActiveStopwatchElapsedMs(current, Date.now());
        drawStopwatchToCanvas(ctx, canvas.width, canvas.height, current, elapsedMs, isDark);
      }
    };

    renderFrame();
    const intervalMs = floatingKind === 'stopwatch' ? 125 : 500;
    const intervalId = window.setInterval(renderFrame, intervalMs);

    isSyncingVideoRef.current = true;
    if (currentStatus === 'running' && video.paused) {
      video.play().catch(() => {});
    } else if (currentStatus === 'paused' && !video.paused) {
      video.pause();
    }
    window.setTimeout(() => {
      isSyncingVideoRef.current = false;
    }, 150);

    return () => window.clearInterval(intervalId);
  }, [floatingMode, floatingKind, activeStudyTimer, activeStopwatch]);

  // MediaSession handlers during Video PiP so native media PiP controls pause/resume active tool
  useEffect(() => {
    if (
      floatingMode !== 'video_pip' ||
      floatingKind === 'none' ||
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator)
    ) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (floatingKind === 'study_timer') resumeStudyTimer();
        else if (floatingKind === 'stopwatch') resumeStopwatch();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (floatingKind === 'study_timer') pauseStudyTimer();
        else if (floatingKind === 'stopwatch') pauseStopwatch();
      });
    } catch {}
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
      } catch {}
    };
  }, [
    floatingMode,
    floatingKind,
    pauseStudyTimer,
    resumeStudyTimer,
    pauseStopwatch,
    resumeStopwatch,
  ]);

  const launchPiPForKind = useCallback(
    async (kind: 'study_timer' | 'stopwatch') => {
      const timer = activeTimerRef.current;
      const stopwatch = activeStopwatchRef.current;

      if (kind === 'study_timer' && !timer) {
        showToast({
          type: 'info',
          title: 'No Active Study Timer',
          message: 'Start a Study Timer session first before popping out the mini screen.',
        });
        return;
      }
      if (kind === 'stopwatch' && !stopwatch) {
        showToast({
          type: 'info',
          title: 'Stopwatch Not Started',
          message: 'Start the Stopwatch first before popping out the mini screen.',
        });
        return;
      }

      if (docPiPWinRef.current) {
        try {
          docPiPWinRef.current.close();
        } catch {}
        docPiPWinRef.current = null;
      }
      teardownVideoPiP();

      const winWithPiP = window as WindowWithDocumentPiP;

      // Tier 1: Interactive Document Picture-in-Picture (Chrome / Edge / Brave Desktop)
      if (winWithPiP.documentPictureInPicture?.requestWindow) {
        try {
          const pipWin = await winWithPiP.documentPictureInPicture.requestWindow({
            width: 340,
            height: 224,
          });
          copyStylesToPiPWindow(pipWin.document);
          pipWin.document.title =
            kind === 'study_timer' && timer
              ? `${timer.taskNameSnapshot} · Life OS Study Timer`
              : `${stopwatch?.title?.trim() || 'Stopwatch'} · Life OS`;

          const container = pipWin.document.createElement('div');
          container.id = 'lifeos-study-pip-root';
          pipWin.document.body.appendChild(container);

          pipWin.addEventListener('pagehide', () => {
            docPiPWinRef.current = null;
            setDocPiPContainer(null);
            setFloatingMode('none');
            setFloatingKind('none');
          });

          docPiPWinRef.current = pipWin;
          setDocPiPContainer(container);
          setFloatingKind(kind);
          setFloatingMode('document_pip');
          return;
        } catch {
          // Fall through to Video PiP fallback
        }
      }

      // Tier 2: Canvas-stream Video Picture-in-Picture fallback
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (
        canvas &&
        video &&
        document.pictureInPictureEnabled &&
        typeof video.requestPictureInPicture === 'function' &&
        typeof canvas.captureStream === 'function'
      ) {
        try {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const isDark = document.documentElement.classList.contains('dark');
            if (kind === 'study_timer' && timer) {
              const elapsedMs = computeActiveStudyElapsedMs(
                timer,
                timer.status === 'running' ? Date.now() : timer.pausedAtTimestamp || Date.now()
              );
              drawStudyTimerToCanvas(ctx, canvas.width, canvas.height, timer, elapsedMs, isDark);
            } else if (kind === 'stopwatch' && stopwatch) {
              const elapsedMs = computeActiveStopwatchElapsedMs(stopwatch, Date.now());
              drawStopwatchToCanvas(ctx, canvas.width, canvas.height, stopwatch, elapsedMs, isDark);
            }
          }

          const stream = canvas.captureStream(kind === 'stopwatch' ? 8 : 2);
          video.srcObject = stream;
          await video.play();
          await video.requestPictureInPicture();

          setFloatingKind(kind);
          setFloatingMode('video_pip');
          return;
        } catch {
          teardownVideoPiP();
          // Fall through to In-App floating mini widget fallback
        }
      }

      // Tier 3: In-App floating widget fallback when browser/iframe restricts system PiP
      setFloatingKind(kind);
      setFloatingMode('in_app');
      showToast({
        type: 'info',
        title:
          kind === 'stopwatch'
            ? 'In-App Mini Stopwatch Opened'
            : 'In-App Mini Timer Opened',
        message:
          'System Picture-in-Picture is blocked in this browser or frame. Open Life OS in a standalone Chrome/Edge tab to float over other apps.',
      });
    },
    [showToast, teardownVideoPiP]
  );

  const openFloatingTimer = useCallback(async () => {
    await launchPiPForKind('study_timer');
  }, [launchPiPForKind]);

  const openFloatingStopwatch = useCallback(async () => {
    await launchPiPForKind('stopwatch');
  }, [launchPiPForKind]);

  const toggleFloatingTimer = useCallback(async () => {
    if (floatingMode !== 'none' && floatingKind === 'study_timer') {
      closeFloatingTimer();
    } else {
      await openFloatingTimer();
    }
  }, [floatingMode, floatingKind, closeFloatingTimer, openFloatingTimer]);

  const toggleFloatingStopwatch = useCallback(async () => {
    if (floatingMode !== 'none' && floatingKind === 'stopwatch') {
      closeFloatingTimer();
    } else {
      await openFloatingStopwatch();
    }
  }, [floatingMode, floatingKind, closeFloatingTimer, openFloatingStopwatch]);

  const handleFocusTimerApp = useCallback(() => {
    try {
      window.focus();
    } catch {}
    setActiveTab('study_timer');
  }, [setActiveTab]);

  const handleFocusStopwatchApp = useCallback(() => {
    try {
      window.focus();
    } catch {}
    setActiveTab('stopwatch');
  }, [setActiveTab]);

  const handleCycleCorner = useCallback(() => {
    setInAppCorner((prev) => {
      const idx = CORNER_ORDER.indexOf(prev);
      return CORNER_ORDER[(idx + 1) % CORNER_ORDER.length];
    });
  }, []);

  const handleVideoPlay = useCallback(() => {
    if (isSyncingVideoRef.current || floatingMode !== 'video_pip') return;
    if (floatingKind === 'study_timer' && activeTimerRef.current?.status === 'paused') {
      resumeStudyTimer();
    } else if (floatingKind === 'stopwatch' && activeStopwatchRef.current?.status === 'paused') {
      resumeStopwatch();
    }
  }, [floatingMode, floatingKind, resumeStudyTimer, resumeStopwatch]);

  const handleVideoPause = useCallback(() => {
    if (isSyncingVideoRef.current || floatingMode !== 'video_pip') return;
    if (floatingKind === 'study_timer' && activeTimerRef.current?.status === 'running') {
      pauseStudyTimer();
    } else if (floatingKind === 'stopwatch' && activeStopwatchRef.current?.status === 'running') {
      pauseStopwatch();
    }
  }, [floatingMode, floatingKind, pauseStudyTimer, pauseStopwatch]);

  const handleLeaveVideoPiP = useCallback(() => {
    teardownVideoPiP();
    setFloatingMode('none');
    setFloatingKind('none');
  }, [teardownVideoPiP]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('leavepictureinpicture', handleLeaveVideoPiP);
    return () => {
      video.removeEventListener('leavepictureinpicture', handleLeaveVideoPiP);
    };
  }, [handleLeaveVideoPiP]);

  const contextValue = useMemo<StudyTimerPiPContextValue>(
    () => ({
      floatingMode,
      floatingKind,
      isFloatingOpen: Boolean(
        activeStudyTimer && floatingKind === 'study_timer' && floatingMode !== 'none'
      ),
      isStopwatchFloatingOpen: Boolean(
        activeStopwatch && floatingKind === 'stopwatch' && floatingMode !== 'none'
      ),
      supportsSystemPiP,
      openFloatingTimer,
      openFloatingStopwatch,
      closeFloatingTimer,
      toggleFloatingTimer,
      toggleFloatingStopwatch,
    }),
    [
      floatingMode,
      floatingKind,
      activeStudyTimer,
      activeStopwatch,
      supportsSystemPiP,
      openFloatingTimer,
      openFloatingStopwatch,
      closeFloatingTimer,
      toggleFloatingTimer,
      toggleFloatingStopwatch,
    ]
  );

  return (
    <StudyTimerPiPContext.Provider value={contextValue}>
      {children}

      {/* Hidden Canvas + Video elements used strictly for Video Picture-in-Picture fallback */}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        aria-hidden="true"
        className="hidden"
      />
      <video
        ref={videoRef}
        muted
        playsInline
        aria-hidden="true"
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        className="fixed w-px h-px opacity-0 pointer-events-none -left-[9999px] -top-[9999px]"
      />

      {/* Document Picture-in-Picture Portal (always-on-top OS window) */}
      {floatingMode === 'document_pip' &&
        docPiPContainer &&
        floatingKind === 'study_timer' &&
        activeStudyTimer &&
        createPortal(
          <FloatingTimerCard
            timer={activeStudyTimer}
            mode="document_pip"
            onPause={pauseStudyTimer}
            onResume={resumeStudyTimer}
            onFinish={() => {
              finishStudyTimer();
              closeFloatingTimer();
            }}
            onFocusApp={handleFocusTimerApp}
            onClose={closeFloatingTimer}
          />,
          docPiPContainer
        )}

      {floatingMode === 'document_pip' &&
        docPiPContainer &&
        floatingKind === 'stopwatch' &&
        activeStopwatch &&
        createPortal(
          <FloatingStopwatchCard
            stopwatch={activeStopwatch}
            mode="document_pip"
            onPause={pauseStopwatch}
            onResume={resumeStopwatch}
            onLap={() => lapStopwatch()}
            onStopAndSave={() => {
              stopAndSaveStopwatch(activeStopwatch.title);
              closeFloatingTimer();
            }}
            onFocusApp={handleFocusStopwatchApp}
            onClose={closeFloatingTimer}
          />,
          docPiPContainer
        )}

      {/* Tier 3 In-App Floating Mini Widget Fallback */}
      {floatingMode === 'in_app' && floatingKind === 'study_timer' && activeStudyTimer && (
        <div
          className={`fixed ${CORNER_CLASSES[inAppCorner]} z-50 w-72 sm:w-80 animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          <FloatingTimerCard
            timer={activeStudyTimer}
            mode="in_app"
            onPause={pauseStudyTimer}
            onResume={resumeStudyTimer}
            onFinish={() => {
              finishStudyTimer();
              closeFloatingTimer();
            }}
            onFocusApp={handleFocusTimerApp}
            onClose={closeFloatingTimer}
            onCycleCorner={handleCycleCorner}
          />
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            <PictureInPicture2 className="w-3 h-3" />
            <span>In-app mini view</span>
          </div>
        </div>
      )}

      {floatingMode === 'in_app' && floatingKind === 'stopwatch' && activeStopwatch && (
        <div
          className={`fixed ${CORNER_CLASSES[inAppCorner]} z-50 w-72 sm:w-80 animate-in fade-in slide-in-from-bottom-2 duration-200`}
        >
          <FloatingStopwatchCard
            stopwatch={activeStopwatch}
            mode="in_app"
            onPause={pauseStopwatch}
            onResume={resumeStopwatch}
            onLap={() => lapStopwatch()}
            onStopAndSave={() => {
              stopAndSaveStopwatch(activeStopwatch.title);
              closeFloatingTimer();
            }}
            onFocusApp={handleFocusStopwatchApp}
            onClose={closeFloatingTimer}
            onCycleCorner={handleCycleCorner}
          />
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            <PictureInPicture2 className="w-3 h-3" />
            <span>In-app mini stopwatch</span>
          </div>
        </div>
      )}
    </StudyTimerPiPContext.Provider>
  );
}

export function useStudyTimerPiP() {
  const ctx = useContext(StudyTimerPiPContext);
  if (!ctx) {
    throw new Error('useStudyTimerPiP must be used within StudyTimerPiPProvider');
  }
  return ctx;
}
