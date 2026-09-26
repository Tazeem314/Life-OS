'use client';

import React, { useState, useRef } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Sun,
  Moon,
  Laptop,
  Bell,
  Download,
  Upload,
  RefreshCw,
  User,
  Check,
  Cloud,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Image from 'next/image';
import { PWAInstallButton } from '@/components/PWAInstallButton';

interface SettingsViewProps {
  onConfirmReset?: () => void;
  onConfirmClear?: () => void;
}

export function SettingsView({ onConfirmReset, onConfirmClear }: SettingsViewProps = {}) {
  const {
    settings,
    updateSettings,
    exportDataJson,
    importDataJson,
    showToast,
    user,
    authLoading,
    loginWithGoogle,
    logout,
    isOnline,
    isSyncing,
    syncNow,
    pullFromCloud,
  } = useLifeOS();
  const [userName, setUserName] = useState(settings.userName || '');
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveUserName = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ userName: userName.trim() || 'Achiever' });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExport = () => {
    try {
      const dataStr = exportDataJson();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `life_os_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast({
        type: 'success',
        title: 'Backup Exported',
        message: 'Your Life OS data file has been downloaded.',
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not generate backup file.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataJson(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Application Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Customize appearance, cloud sync, and manage your LifeOS database
        </p>
      </div>

      {/* Cloud Account & Gmail */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-sky-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Account & Cloud Sync
          </h2>
        </div>

        {user ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white dark:border-zinc-800 shadow-xs">
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    fill
                    sizes="44px"
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-sky-600 text-white flex items-center justify-center text-base font-bold shadow-xs">
                  {(user.displayName || user.email || 'U')[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || 'Google User'}
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-200/70 dark:bg-sky-900/70 text-sky-800 dark:text-sky-200">
                    Gmail Connected
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Sign in with Gmail
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Connect your Google account to automatically synchronize your habits, to-dos, and streaks across all your devices.
              </p>
            </div>

            <button
              onClick={loginWithGoogle}
              disabled={authLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 shadow-xs text-xs font-semibold cursor-pointer transition shrink-0"
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
              <span>{authLoading ? 'Signing In...' : 'Sign in with Google'}</span>
            </button>
          </div>
        )}

        {/* Offline Mode & Cloud Sync Status */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                  Online & Auto-Sync
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 animate-pulse">
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  Offline Mode (Local Storage)
                </span>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isOnline
                  ? user
                    ? 'All changes sync automatically to Google Cloud in the background.'
                    : 'Changes saved locally on device. Sign in to sync across devices.'
                  : 'All habits & tasks are saved locally and will auto-sync in the background once reconnected.'}
              </p>
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <button
                  onClick={pullFromCloud}
                  disabled={isSyncing || !isOnline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  title="Pull your latest habits and tasks from your Gmail cloud database"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore from Cloud</span>
                </button>
                <button
                  onClick={syncNow}
                  disabled={isSyncing || !isOnline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200/60 dark:border-sky-800/60 transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Offline & Background Sync Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Full Offline & Background Sync Engine</span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
              LifeOS is fully functional offline. When you add, edit, complete, or delete habits and tasks while disconnected or off-grid, every change is stored instantly on your device. As soon as your device reconnects to the internet, LifeOS automatically synchronizes everything in the background without interrupting your workflow.
            </p>
          </div>
        </div>
      </div>

      {/* PWA App Installation Card */}
      <PWAInstallButton variant="settings" />

      {/* 1. Profile / Display Name */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-sky-500" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Personalization
          </h2>
        </div>

        <form onSubmit={handleSaveUserName} className="flex items-center gap-3">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your name (e.g. Alex, Maya)"
            className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {isSaved ? <Check className="w-4 h-4" /> : null}
            <span>{isSaved ? 'Saved' : 'Save Name'}</span>
          </button>
        </form>
      </div>

      {/* 2. Appearance & Theme */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Appearance
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Choose your preferred interface theme
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition ${
              settings.theme === 'light'
                ? 'border-sky-500 bg-sky-50/50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ring-2 ring-sky-200 dark:ring-sky-800'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold">Light</span>
          </button>

          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition ${
              settings.theme === 'dark'
                ? 'border-sky-500 bg-sky-50/50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ring-2 ring-sky-200 dark:ring-sky-800'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Moon className="w-5 h-5 text-sky-400" />
            <span className="text-xs font-semibold">Dark</span>
          </button>

          <button
            onClick={() => updateSettings({ theme: 'system' })}
            className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-2 transition ${
              settings.theme === 'system'
                ? 'border-sky-500 bg-sky-50/50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ring-2 ring-sky-200 dark:ring-sky-800'
                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Laptop className="w-5 h-5 text-zinc-500" />
            <span className="text-xs font-semibold">System</span>
          </button>
        </div>
      </div>

      {/* 3. Preferences */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Preferences
        </h2>

        {/* Notification Reminders Toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-indigo-500" />
              Daily Habit Reminders (Browser Alerts)
            </span>
            <p className="text-xs text-zinc-400">
              Receive on-screen alerts when habit reminder times arrive
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({ reminderNotifications: !settings.reminderNotifications })
            }
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              settings.reminderNotifications ? 'bg-sky-600 justify-end' : 'bg-zinc-300 dark:bg-zinc-700 justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      {/* 4. Backup & Data Management */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Data & Backups
        </h2>
        <p className="text-xs text-zinc-400">
          All your habits and tasks are saved securely in your browser local storage and synced with your connected Google account.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup (JSON)</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Backup</span>
          </button>
        </div>

        {/* Reset & Wipe Controls */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-3">
          {onConfirmReset && (
            <button
              onClick={onConfirmReset}
              className="px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 rounded-xl transition cursor-pointer"
            >
              Restore Sample Starter Routine
            </button>
          )}
          {onConfirmClear && (
            <button
              onClick={onConfirmClear}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
            >
              Wipe All Local Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
