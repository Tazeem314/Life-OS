'use client';

import React from 'react';
import Image from 'next/image';
import { useLifeOS } from '@/context/LifeOSContext';
import { ActiveTab } from '@/lib/types';
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  Calendar,
  TrendingUp,
  Settings,
  Cloud,
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export function Sidebar() {
  const { activeTab, setActiveTab, todayProgress, habits, user, loginWithGoogle, isOnline } = useLifeOS();

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

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 p-3 min-h-[calc(100vh-57px)]">
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
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
        })}
      </nav>

      {/* Mini daily completion widget at bottom of sidebar */}
      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs mb-2">
        <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300 mb-1.5">
          <span className="font-medium">Daily Target</span>
          <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{todayProgress.percentage}%</span>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-300"
            style={{ width: `${todayProgress.percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 font-mono tabular-nums">
          <span>{todayProgress.completedItems}/{todayProgress.totalItems} done</span>
          <span className="text-[10px] font-sans text-zinc-500">{todayProgress.isFullyCompleted ? 'Done' : 'Active'}</span>
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
