'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useLifeOS } from '@/context/LifeOSContext';
import { ActiveTab } from '@/lib/types';
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
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const {
    activeTab,
    setActiveTab,
    todayProgress,
    habits,
    goals,
    sleepAnalytics,
    user,
    loginWithGoogle,
    isOnline,
  } = useLifeOS();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'habits',
      label: 'Habits',
      icon: Sparkles,
      badge: (habits || []).filter((h) => h.status === 'active').length || undefined,
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
    {
      id: 'goals',
      label: 'Goals',
      icon: Target,
      badge:
        (goals || []).filter((g) => g.status !== 'completed' && g.status !== 'archived').length ||
        undefined,
    },
    {
      id: 'sleep',
      label: 'Sleep Tracker',
      icon: Moon,
      badge:
        sleepAnalytics && sleepAnalytics.currentStreakDays > 0
          ? `${sleepAnalytics.currentStreakDays}d streak`
          : undefined,
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

  const handleSelectTab = (id: ActiveTab) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Menu */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            {/* Header with App Icon and Close button */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-tighter shrink-0 shadow-xs">
                  ⌘
                </div>
                <div>
                  <h2 className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
                    Life OS
                  </h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Navigation</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Items */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[11px] font-mono tabular-nums font-medium px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-sky-100/80 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-semibold'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer with Target Progress & Account */}
            <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/40">
              {/* Daily completion widget */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1">
                  <span className="font-medium text-[11px]">Daily Target</span>
                  <span
                    suppressHydrationWarning
                    className="font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100 text-xs"
                  >
                    {todayProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                    style={{ width: `${todayProgress.percentage}%` }}
                  />
                </div>
                <div
                  suppressHydrationWarning
                  className="flex justify-between items-center text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono tabular-nums"
                >
                  <span suppressHydrationWarning>
                    {todayProgress.completedItems}/{todayProgress.totalItems} done
                  </span>
                  <span
                    suppressHydrationWarning
                    className="font-sans text-zinc-500"
                  >
                    {todayProgress.isFullyCompleted ? 'Done' : 'Active'}
                  </span>
                </div>
              </div>

              {/* User Account / Cloud Sync */}
              {user ? (
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 p-2 w-full rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition text-left cursor-pointer"
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
                  onClick={() => {
                    loginWithGoogle();
                    onClose();
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-400 transition cursor-pointer"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sign in with Gmail</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
