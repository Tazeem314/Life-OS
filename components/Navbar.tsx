'use client';

import React from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { formatDisplayDate, getTodayKey } from '@/lib/date-utils';
import {
  Flame,
  Sun,
  Moon,
  Laptop,
  Calendar as CalendarIcon,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { AuthButton } from '@/components/AuthButton';
import { PWAInstallButton } from '@/components/PWAInstallButton';

interface NavbarProps {
  onOpenNewHabit?: () => void;
  onOpenNewTodo?: () => void;
}

export function Navbar({ onOpenNewHabit, onOpenNewTodo }: NavbarProps = {}) {
  const {
    overallStreaks,
    settings,
    updateSettings,
    selectedDate,
    goToToday,
    isOnline,
    isSyncing,
  } = useLifeOS();

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
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-tighter shrink-0 shadow-xs">
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

        {/* Right Section: Streak Counter, Theme Toggle, Install, Auth */}
        <div className="flex items-center gap-2">
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
