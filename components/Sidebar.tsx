'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useLifeOS } from '@/context/LifeOSContext';
import { ActiveTab } from '@/lib/types';
import { computeActiveStudyElapsedMs, formatHMS } from '@/lib/study-service';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Target,
  Moon,
  Calendar,
  TrendingUp,
  Settings,
  Cloud,
  PiggyBank,
  Bell,
  GraduationCap,
  ChevronDown,
  Timer,
  Gauge,
  BarChart3,
  FileText,
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

const STUDY_SUB_ITEMS: {
  id: Extract<ActiveTab, 'study_timer' | 'stopwatch' | 'study_analytics' | 'study_notes'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'study_timer', label: 'Study Timer', icon: Timer },
  { id: 'stopwatch', label: 'Stopwatch', icon: Gauge },
  { id: 'study_analytics', label: 'Study Analytics', icon: BarChart3 },
  { id: 'study_notes', label: 'Study Notes', icon: FileText },
];

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    todayProgress,
    habits,
    goals,
    savingsGoals,
    sleepAnalytics,
    unreadNotificationsCount,
    activeStudyTimer,
    studyNotes,
    user,
    loginWithGoogle,
    isOnline,
  } = useLifeOS();

  const isStudyTabActive =
    activeTab === 'study_timer' ||
    activeTab === 'stopwatch' ||
    activeTab === 'study_analytics' ||
    activeTab === 'study_notes';

  const [studyOpenOverride, setStudyOpenOverride] = useState<boolean | null>(null);
  const isStudyOpen = studyOpenOverride ?? isStudyTabActive;
  const [tickNow, setTickNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!activeStudyTimer || activeStudyTimer.status !== 'running') return;
    const id = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeStudyTimer]);

  const activeTimerElapsed = activeStudyTimer
    ? formatHMS(
        computeActiveStudyElapsedMs(
          activeStudyTimer,
          activeStudyTimer.status === 'running' ? tickNow : activeStudyTimer.pausedAtTimestamp || tickNow
        )
      )
    : null;

  const navItemsTop: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'habits',
      label: 'Habits',
      icon: Sparkles,
      badge: habits.filter((h) => h.status === 'active').length || undefined,
    },
    {
      id: 'todos',
      label: 'To-Dos',
      icon: CheckSquare,
      badge:
        todayProgress.totalTodos > 0
          ? `${todayProgress.completedTodos}/${todayProgress.totalTodos}`
          : undefined,
    },
  ];

  const navItemsBottom: NavItem[] = [
    {
      id: 'goals',
      label: 'Goals',
      icon: Target,
      badge: (goals || []).filter((g) => g.status !== 'completed' && g.status !== 'archived').length || undefined,
    },
    {
      id: 'savings',
      label: 'Savings',
      icon: PiggyBank,
      badge: (savingsGoals || []).filter((g) => g.status === 'active').length || undefined,
    },
    {
      id: 'sleep',
      label: 'Sleep Tracker',
      icon: Moon,
      badge: sleepAnalytics.currentStreakDays > 0 ? `${sleepAnalytics.currentStreakDays}d streak` : undefined,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: TrendingUp,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          isActive
            ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs font-semibold'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
          <span>{item.label}</span>
        </div>
        {item.badge !== undefined && (
          <span
            className={`text-[11px] font-mono tabular-nums font-medium ${
              isActive
                ? 'text-sky-700 dark:text-sky-300 font-semibold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 p-3 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto no-scrollbar z-30">
      <nav className="space-y-1 flex-1">
        {navItemsTop.map(renderNavItem)}

        {/* Expandable Study System Menu */}
        <div className="pt-0.5 pb-0.5">
          <button
            type="button"
            onClick={() => setStudyOpenOverride(!isStudyOpen)}
            aria-expanded={isStudyOpen}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              isStudyTabActive
                ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap
                className={`w-4 h-4 ${
                  isStudyTabActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              />
              <span>Study</span>
              {activeStudyTimer && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeStudyTimer.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                  title="Active study timer"
                />
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isStudyOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {isStudyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden pl-3.5 mt-0.5 space-y-0.5 border-l border-zinc-200/80 dark:border-zinc-800/80 ml-4"
              >
                {STUDY_SUB_ITEMS.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id;
                  const badge =
                    sub.id === 'study_timer' && activeTimerElapsed
                      ? activeTimerElapsed
                      : sub.id === 'study_notes' && studyNotes.length > 0
                        ? studyNotes.length
                        : undefined;

                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setStudyOpenOverride(true);
                        setActiveTab(sub.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSubActive
                          ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs font-semibold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSubActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </div>
                      {badge !== undefined && (
                        <span
                          className={`text-[10px] font-mono tabular-nums font-medium shrink-0 ${
                            sub.id === 'study_timer' && activeStudyTimer?.status === 'running'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : isSubActive
                                ? 'text-sky-700 dark:text-sky-300 font-semibold'
                                : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {navItemsBottom.map(renderNavItem)}
      </nav>

      {/* Mini daily completion widget at bottom of sidebar */}
      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs mb-2">
        <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1.5">
          <span className="font-medium">Daily Target</span>
          <span suppressHydrationWarning className="font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{todayProgress.percentage}%</span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${todayProgress.percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-sky-500 rounded-full"
          />
        </div>
        <div suppressHydrationWarning className="flex justify-between items-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-mono tabular-nums">
          <span suppressHydrationWarning>{todayProgress.completedItems}/{todayProgress.totalItems} done</span>
          <span suppressHydrationWarning className="text-[10px] font-sans text-zinc-500">{todayProgress.isFullyCompleted ? 'Done' : 'Active'}</span>
        </div>
      </div>

      {/* User Cloud Sync Status in Sidebar */}
      {user ? (
        <button
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition text-left cursor-pointer"
        >
          {user.photoURL ? (
            <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
              <Image
                src={user.photoURL}
                alt={user.displayName || 'User'}
                fill
                sizes="32px"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {(user.displayName || user.email || 'U')[0]?.toUpperCase()}
            </div>
          )}
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {user.displayName || 'User'}
            </p>
            {isOnline ? (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LifeOS Cloud Synced
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Offline (Saved Locally)
              </p>
            )}
          </div>
        </button>
      ) : (
        <button
          onClick={loginWithGoogle}
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-400 transition"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Sign in with Gmail</span>
        </button>
      )}
    </aside>
  );
}
