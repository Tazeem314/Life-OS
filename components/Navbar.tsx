'use client';

import React, { useEffect, useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatDisplayDate, getTodayKey } from '@/lib/date-utils';
import {
  computeActiveStopwatchElapsedMs,
  computeActiveStudyElapsedMs,
  computeStudyTargetProgress,
  formatHMS,
} from '@/lib/study-service';
import { useStudyTimerPiP } from '@/components/study/StudyTimerPiPContext';
import {
  Flame,
  Sun,
  Moon,
  Laptop,
  Calendar as CalendarIcon,
  WifiOff,
  RefreshCw,
  Timer,
  Gauge,
  Pause,
  Play,
  PictureInPicture2,
} from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface NavbarProps {
  onOpenNewHabit?: () => void;
  onOpenNewTodo?: () => void;
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}

export function Navbar({
  onOpenNewHabit,
  onOpenNewTodo,
  onToggleMobileNav,
  isMobileNavOpen,
}: NavbarProps = {}) {
  const {
    overallStreaks,
    settings,
    updateSettings,
    selectedDate,
    goToToday,
    isOnline,
    isSyncing,
    activeTab,
    setActiveTab,
    activeStudyTimer,
    pauseStudyTimer,
    resumeStudyTimer,
    activeStopwatch,
    pauseStopwatch,
    resumeStopwatch,
  } = useLifeOS();

  const {
    isFloatingOpen,
    isStopwatchFloatingOpen,
    toggleFloatingTimer,
    toggleFloatingStopwatch,
  } = useStudyTimerPiP();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const isAnyClockRunning =
    activeStudyTimer?.status === 'running' || activeStopwatch?.status === 'running';

  useEffect(() => {
    if (!isAnyClockRunning) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [isAnyClockRunning]);

  const showLiveTimerBar = Boolean(activeStudyTimer && activeTab !== 'study_timer');
  const elapsedMs = activeStudyTimer
    ? computeActiveStudyElapsedMs(
        activeStudyTimer,
        activeStudyTimer.status === 'running' ? nowMs : activeStudyTimer.pausedAtTimestamp || nowMs
      )
    : 0;
  const targetProgress = activeStudyTimer
    ? computeStudyTargetProgress(elapsedMs, activeStudyTimer.targetDurationMinutes)
    : null;
  const timerPrimaryLabel = activeStudyTimer
    ? targetProgress?.hasTarget
      ? targetProgress.primaryTimeLabel
      : formatHMS(elapsedMs)
    : null;

  const showLiveStopwatchBar = Boolean(activeStopwatch && activeTab !== 'stopwatch');
  const stopwatchElapsedLabel = activeStopwatch
    ? formatHMS(computeActiveStopwatchElapsedMs(activeStopwatch, nowMs))
    : null;

  const toggleTheme = () => {
    if (settings.theme === 'light') {
      updateSettings({ theme: 'dark' });
    } else if (settings.theme === 'dark') {
      updateSettings({ theme: 'system' });
    } else {
      updateSettings({ theme: 'light' });
    }
  };

  const isToday = selectedDate === getTodayKey();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Date indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleMobileNav}
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              title="Open navigation menu"
              className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 active:scale-95 transition-all text-left cursor-pointer md:cursor-default focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 group"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-tighter shrink-0 shadow-xs group-hover:scale-105 active:scale-95 transition-transform">
                ⌘
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-base">
                  Life OS
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                  Daily Tracker
                </span>
              </div>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
            <button
              onClick={goToToday}
              suppressHydrationWarning
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition ${
                isToday
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-sky-500" />
              <span suppressHydrationWarning>{formatDisplayDate(selectedDate)}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Compact Active Study Timer Bar, Streak Counter, Theme Toggle, Install, Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {showLiveTimerBar && activeStudyTimer && timerPrimaryLabel && (
            <div
              onClick={() => setActiveTab('study_timer')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('study_timer');
                }
              }}
              title={`Active study timer: ${activeStudyTimer.taskNameSnapshot}. Click to open Study Timer.`}
              className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs cursor-pointer transition shrink-0 ${
                activeStudyTimer.status === 'paused'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-700 dark:text-amber-300'
                  : targetProgress?.isOvertime
                    ? 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/70 text-orange-700 dark:text-orange-300'
                    : 'bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800/70 text-sky-700 dark:text-sky-300'
              }`}
            >
              <Timer
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeStudyTimer.status === 'running'
                    ? targetProgress?.isOvertime
                      ? 'animate-pulse text-orange-500'
                      : 'animate-pulse text-sky-600 dark:text-sky-400'
                    : 'text-amber-500'
                }`}
              />
              <span className="hidden lg:inline truncate max-w-[130px] font-medium">
                {activeStudyTimer.taskNameSnapshot}
              </span>
              <span className="font-mono font-bold tabular-nums text-[11px] sm:text-xs">
                {timerPrimaryLabel}
              </span>
              {targetProgress?.hasTarget && (
                <span className="hidden xl:inline text-[10px] font-medium opacity-75">
                  {targetProgress.isOvertime ? 'OT' : 'left'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeStudyTimer.status === 'running') {
                    pauseStudyTimer();
                  } else {
                    resumeStudyTimer();
                  }
                }}
                aria-label={activeStudyTimer.status === 'running' ? 'Pause study timer' : 'Resume study timer'}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
              >
                {activeStudyTimer.status === 'running' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleFloatingTimer();
                }}
                title={isFloatingOpen ? 'Close floating mini timer' : 'Pop out always-on-top mini timer'}
                aria-label={isFloatingOpen ? 'Close floating mini timer' : 'Pop out always-on-top mini timer'}
                className={`p-1 rounded-md transition shrink-0 ${
                  isFloatingOpen
                    ? 'bg-sky-600 text-white hover:bg-sky-500'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <PictureInPicture2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {showLiveStopwatchBar && activeStopwatch && stopwatchElapsedLabel && (
            <div
              onClick={() => setActiveTab('stopwatch')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('stopwatch');
                }
              }}
              title={`Active stopwatch: ${activeStopwatch.title || 'Stopwatch Run'}. Click to open Stopwatch.`}
              className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-xs cursor-pointer transition shrink-0 ${
                activeStopwatch.status === 'paused'
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-700 dark:text-amber-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              <Gauge
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeStopwatch.status === 'running'
                    ? 'animate-pulse text-indigo-600 dark:text-indigo-400'
                    : 'text-amber-500'
                }`}
              />
              <span className="hidden lg:inline truncate max-w-[110px] font-medium">
                {activeStopwatch.title?.trim() || 'Stopwatch'}
              </span>
              <span className="font-mono font-bold tabular-nums text-[11px] sm:text-xs">
                {stopwatchElapsedLabel}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeStopwatch.status === 'running') {
                    pauseStopwatch();
                  } else {
                    resumeStopwatch();
                  }
                }}
                aria-label={activeStopwatch.status === 'running' ? 'Pause stopwatch' : 'Resume stopwatch'}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
              >
                {activeStopwatch.status === 'running' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleFloatingStopwatch();
                }}
                title={
                  isStopwatchFloatingOpen
                    ? 'Close floating mini stopwatch'
                    : 'Pop out always-on-top mini stopwatch'
                }
                aria-label={
                  isStopwatchFloatingOpen
                    ? 'Close floating mini stopwatch'
                    : 'Pop out always-on-top mini stopwatch'
                }
                className={`p-1 rounded-md transition shrink-0 ${
                  isStopwatchFloatingOpen
                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <PictureInPicture2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Offline / Syncing Indicator */}
          {!isOnline ? (
            <div
              title="Offline mode. Changes are saved locally on device."
              className="flex items-center gap-1.5 px-2 py-1 text-amber-600 dark:text-amber-400 text-xs font-medium"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[11px]">Offline</span>
            </div>
          ) : isSyncing ? (
            <div
              title="Syncing..."
              className="flex items-center gap-1.5 px-2 py-1 text-sky-600 dark:text-sky-400 text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden lg:inline text-[11px]">Syncing</span>
            </div>
          ) : null}

          {/* Daily Streak Counter */}
          <div
            suppressHydrationWarning
            title={`Current Daily Streak: ${overallStreaks.currentDailyStreak} days (Best: ${overallStreaks.bestDailyStreak} days)`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 cursor-default shrink-0 text-xs font-medium text-zinc-800 dark:text-zinc-200"
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span suppressHydrationWarning className="font-mono font-bold tabular-nums">
              {overallStreaks.currentDailyStreak}d
            </span>
            <span className="text-[11px] text-zinc-400 hidden sm:inline">streak</span>
          </div>

          {/* Install App Button */}
          <PWAInstallButton variant="navbar" />

          {/* Notification Bell */}
          <NotificationBell />

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme mode"
            title={`Current theme: ${settings.theme}`}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 transition"
          >
            {settings.theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : settings.theme === 'dark' ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Laptop className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {/* Gmail / Google Login & User Profile */}
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
