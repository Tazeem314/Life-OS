'use client';

import React, { useState, useEffect } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import { Cloud, CloudOff, RefreshCw, DownloadCloud } from 'lucide-react';

export function CloudSyncBanner() {
  const {
    user,
    authLoading,
    isOnline,
    isSyncing,
    lastSyncedAt,
    loginWithGoogle,
    syncNow,
    pullFromCloud,
  } = useLifeOS();

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (authLoading) {
    return null;
  }

  const diff = lastSyncedAt && now > 0 ? Math.floor((now - lastSyncedAt.getTime()) / 1000) : 0;
  const lastSyncText =
    !lastSyncedAt || diff < 15
      ? 'Just now'
      : diff < 60
      ? `${diff}s ago`
      : lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // When user is NOT signed in: Explain that they are seeing local/demo data and offer 1-click Gmail sync
  if (!user) {
    return (
      <div className="mb-4 sm:mb-6 rounded-2xl bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 dark:from-amber-950/30 dark:via-sky-950/30 dark:to-indigo-950/30 border border-amber-200/80 dark:border-amber-900/60 p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Offline / Demo Mode Active
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  Not Synced
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 max-w-xl">
                You are currently viewing demo data on this device. Sign in with your Gmail to sync all your personal habits and to-dos across your phone, tablet, and computer.
              </p>
            </div>
          </div>

          <button
            onClick={loginWithGoogle}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.78-2.1-6.73-4.96H1.24v3.13C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24 0-.75.13-1.52.38-2.24V6.63H1.24C.45 8.24 0 10.06 0 12s.45 3.76 1.24 5.37l4.03-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.63l4.03 3.13c.95-2.86 3.61-4.96 6.73-4.96z"
              />
            </svg>
            <span>Sign in with Gmail</span>
          </button>
        </div>
      </div>
    );
  }

  // When user is SIGNED IN: Show real-time sync confirmation bar with quick sync and pull actions
  return (
    <div className="mb-4 sm:mb-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 px-3.5 py-2.5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Cloud className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Auto-Sync Active
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {isSyncing ? (
                <span className="text-sky-600 dark:text-sky-400 font-medium animate-pulse">Syncing changes to cloud...</span>
              ) : (
                <span>Auto-synced • Last updated {lastSyncText}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <button
            onClick={syncNow}
            disabled={isSyncing || !isOnline}
            title="Upload all local changes immediately to your Gmail cloud database"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-500' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={pullFromCloud}
            disabled={isSyncing || !isOnline}
            title="Restore and pull the latest data from your Gmail account"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            <DownloadCloud className="w-3 h-3" />
            <span>Pull Cloud</span>
          </button>
        </div>
      </div>
    </div>
  );
}
