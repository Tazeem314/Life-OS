'use client';

import React, { useState } from 'react';
import { useLifeOS } from '@/context/LifeOSContext';
import {
  Moon,
  Sun,
  Plus,
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  Activity,
  Flame,
  Brain,
  CheckCircle2,
} from 'lucide-react';
import { SleepLog } from '@/lib/types';
import {
  formatDurationHoursMinutes,
  QUALITY_LABELS,
  MOOD_LABELS,
} from '@/lib/sleep-service';
import { SleepLogModal } from './SleepLogModal';
import { ActiveSleepModal } from './ActiveSleepModal';
import { SleepAnalyticsSection } from './SleepAnalyticsSection';
import { SleepHistoryList } from './SleepHistoryList';
import { AISleepCoachCard } from './AISleepCoachCard';
import { SleepSettingsModal } from './SleepSettingsModal';
import { ConfirmDialog } from '../modals/ConfirmDialog';

export function SleepView() {
  const {
    sleepLogs,
    activeSleepSession,
    sleepSettings,
    sleepAnalytics,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog,
    startSleepSession,
    stopSleepSessionAndLog,
    cancelSleepSession,
    updateSleepSettings,
    habits,
    todayProgress,
  } = useLifeOS();

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'analytics' | 'history' | 'ai'>('analytics');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<SleepLog | null>(null);
  const [isNightModeOpen, setIsNightModeOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Latest log
  const latestLog = sleepLogs.length > 0
    ? [...sleepLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const handleOpenNewLog = () => {
    setEditingLog(null);
    setIsLogModalOpen(true);
  };

  const handleEditLog = (log: SleepLog) => {
    setEditingLog(log);
    setIsLogModalOpen(true);
  };

  const handleDeletePrompt = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      deleteSleepLog(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveLog = async (logData: Omit<SleepLog, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingLog) {
      await updateSleepLog(editingLog.id, logData);
    } else {
      await addSleepLog(logData);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Sleep & Circadian Rhythm
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track rest architecture, sleep debt balance, and habit productivity synergy
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors shadow-2xs"
            title="Sleep Targets & Settings"
            aria-label="Sleep settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {!activeSleepSession ? (
            <button
              onClick={() => {
                startSleepSession();
                setIsNightModeOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Start Night Session</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNightModeOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md animate-pulse"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Open Night Clock</span>
            </button>
          )}

          <button
            onClick={handleOpenNewLog}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Sleep</span>
          </button>
        </div>
      </div>

      {/* Active Session Alert Banner (if running) */}
      {activeSleepSession && (
        <div className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-800/80 text-white flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping" />
            <div>
              <div className="text-xs font-bold text-indigo-200">
                Active Night Recording in Progress
              </div>
              <div className="text-[11px] text-zinc-300">
                Started at {new Date(activeSleepSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsNightModeOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-zinc-950 font-bold text-xs transition-all active:scale-95"
          >
            I Woke Up / View Timer
          </button>
        </div>
      )}

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Last Night's Rest */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span className="font-medium">Last Night&apos;s Rest</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {latestLog ? formatDurationHoursMinutes(latestLog.durationMinutes) : '--'}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
            {latestLog ? (
              <>
                <span className={QUALITY_LABELS[latestLog.qualityRating].color}>
                  {QUALITY_LABELS[latestLog.qualityRating].label} ({latestLog.qualityRating}/5)
                </span>
                <span>·</span>
                <span className="font-mono">{latestLog.efficiencyScore || 85}% eff.</span>
              </>
            ) : (
              <span>No logs yet</span>
            )}
          </div>
        </div>

        {/* 7-Day Average */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span className="font-medium">7-Day Average</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {sleepAnalytics.avgDurationMinutes > 0
              ? formatDurationHoursMinutes(sleepAnalytics.avgDurationMinutes)
              : '--'}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Target: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{sleepSettings.targetHours}h 00m</span>
          </div>
        </div>

        {/* Sleep Consistency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span className="font-medium">Regularity Score</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {sleepAnalytics.bedtimeConsistencyScore}
            <span className="text-xs text-zinc-400 font-normal">/100</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {sleepAnalytics.bedtimeConsistencyScore >= 75
              ? 'Stable circadian rhythm'
              : 'Variable bedtime window'}
          </div>
        </div>

        {/* Sleep Logging Streak */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs mb-1">
            <span className="font-medium">Tracking Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {sleepAnalytics.currentStreakDays}{' '}
            <span className="text-xs font-normal text-zinc-400">
              {sleepAnalytics.currentStreakDays === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Best streak: <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{sleepAnalytics.bestStreakDays} days</span>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeSubTab === 'analytics'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Analytics & Synergy
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Sleep History ({sleepLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('ai')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
            activeSubTab === 'ai'
              ? 'bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-300 shadow-2xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>AI Sleep Coach</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <SleepAnalyticsSection
            logs={sleepLogs}
            settings={sleepSettings}
            analytics={sleepAnalytics}
          />
          {/* Quick AI Coach Preview at bottom of analytics */}
          <AISleepCoachCard
            logs={sleepLogs}
            settings={sleepSettings}
            habitCompletionRate={todayProgress.percentage || 75}
          />
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              All Sleep Records
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {sleepLogs.length} total nights tracked
            </span>
          </div>
          <SleepHistoryList
            logs={sleepLogs}
            onEdit={handleEditLog}
            onDelete={handleDeletePrompt}
            onAddNew={handleOpenNewLog}
          />
        </div>
      )}

      {activeSubTab === 'ai' && (
        <div className="space-y-6">
          <AISleepCoachCard
            logs={sleepLogs}
            settings={sleepSettings}
            habitCompletionRate={todayProgress.percentage || 75}
          />
        </div>
      )}

      {/* Modals */}
      <SleepLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingLog(null);
        }}
        onSave={handleSaveLog}
        initialLog={editingLog}
        targetBedtime={sleepSettings.targetBedtime}
        targetWakeTime={sleepSettings.targetWakeTime}
      />

      <ActiveSleepModal
        isOpen={isNightModeOpen}
        session={activeSleepSession}
        onClose={() => setIsNightModeOpen(false)}
        onCancelSession={cancelSleepSession}
        onWakeUpAndLog={stopSleepSessionAndLog}
      />

      <SleepSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={sleepSettings}
        onSave={updateSleepSettings}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Sleep Record?"
        message="Are you sure you want to delete this sleep log? This will update your consistency score and streak."
        confirmText="Delete"
        isDestructive={true}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
