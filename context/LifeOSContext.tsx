'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Habit,
  HabitCompletion,
  Todo,
  UserSettings,
  ActiveTab,
  ToastMessage,
  DayProgress,
  HabitStreakInfo,
  OverallStreakInfo,
  Goal,
  GoalTimeHorizon,
  DailyGoalContribution,
  AIPlanGeneratedResult,
  AIReplanGeneratedResult,
  SleepLog,
  ActiveSleepSession,
  SleepSettings,
  SleepAnalyticsSummary,
  SleepQuality,
  WakeMood,
  SavingsGoal,
  SavingsTransaction,
  SavingsSettings,
  SavingsAnalyticsSummary,
  AISavingsInsight,
} from '@/lib/types';
import {
  calculateSleepAnalytics,
  DEFAULT_SLEEP_SETTINGS,
  calculateSleepDuration,
  calculateSleepEfficiency,
  getInitialSeedSleepLogs,
} from '@/lib/sleep-service';
import {
  calculateSavingsAnalytics,
  DEFAULT_SAVINGS_SETTINGS,
  formatCurrency,
} from '@/lib/savings-service';
import {
  toggleTaskInGoal,
  toggleMilestoneInGoal,
  toggleChapterInGoal,
  updateChapterInGoal,
  toggleChapterTaskInGoal,
  generateInstantAutoPlan,
  calculateGoalProgress,
  determineGoalStatus,
  computeDailyGoalContributions,
  generateLocalReplan,
} from '@/lib/goal-service';
import {
  Storage,
  INITIAL_SETTINGS,
  getInitialSeedData,
  DEMO_HABIT_IDS,
  DEMO_TODO_IDS,
  DEMO_COMPLETION_IDS,
} from '@/lib/storage';

const filterCleanHabits = (list: Habit[]) => (list || []).filter((h) => h && !DEMO_HABIT_IDS.has(h.id));
const filterCleanCompletions = (list: HabitCompletion[]) =>
  (list || []).filter((c) => c && !DEMO_COMPLETION_IDS.has(c.id) && !DEMO_HABIT_IDS.has(c.habitId));
const filterCleanTodos = (list: Todo[]) => (list || []).filter((t) => t && !DEMO_TODO_IDS.has(t.id));

const mergeRemoteHabits = (
  local: Habit[],
  remote: Habit[],
  syncedIds: Set<string>,
  pendingHabitUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: Habit[]; newToUpload: Habit[] } => {
  const map = new Map<string, Habit>();
  const newToUpload: Habit[] = [];

  // 1. Remote is the canonical cloud state
  for (const h of remote || []) {
    if (h && h.id && !DEMO_HABIT_IDS.has(h.id)) {
      map.set(h.id, h);
    }
  }

  // 2. Reconcile local
  for (const l of local || []) {
    if (!l || !l.id || DEMO_HABIT_IDS.has(l.id)) continue;

    if (map.has(l.id)) {
      if (pendingHabitUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    } else {
      if (!isAuthoritative) {
        // Cache snapshot or incomplete query: preserve local record
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingHabitUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        // Authoritative server state
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingHabitUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          const deletedAt = deletions.get(l.id)!;
          const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          const remoteDeleted = new Date(deletedAt).getTime();

          if (remoteDeleted >= localUpdated) {
            removePendingWrite('habit', l.id);
            Storage.unmarkSynced(l.id);
          } else {
            map.set(l.id, l);
            newToUpload.push(l);
          }
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const mergeRemoteTodos = (
  local: Todo[],
  remote: Todo[],
  syncedIds: Set<string>,
  pendingTodoUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: Todo[]; newToUpload: Todo[] } => {
  const map = new Map<string, Todo>();
  const newToUpload: Todo[] = [];

  // 1. Canonical cloud state
  for (const t of remote || []) {
    if (t && t.id && !DEMO_TODO_IDS.has(t.id)) {
      map.set(t.id, t);
    }
  }

  // 2. Reconcile local
  for (const l of local || []) {
    if (!l || !l.id || DEMO_TODO_IDS.has(l.id)) continue;

    if (map.has(l.id)) {
      if (pendingTodoUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    } else {
      if (!isAuthoritative) {
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingTodoUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingTodoUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          const deletedAt = deletions.get(l.id)!;
          const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          const remoteDeleted = new Date(deletedAt).getTime();

          if (remoteDeleted >= localUpdated) {
            removePendingWrite('todo', l.id);
            Storage.unmarkSynced(l.id);
          } else {
            map.set(l.id, l);
            newToUpload.push(l);
          }
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { merged, newToUpload };
};

const mergeRemoteGoals = (
  local: Goal[],
  remote: Goal[],
  syncedIds: Set<string>,
  pendingGoalUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: Goal[]; newToUpload: Goal[] } => {
  const map = new Map<string, Goal>();
  const newToUpload: Goal[] = [];

  for (const g of remote || []) {
    if (g && g.id) {
      map.set(g.id, g);
    }
  }

  for (const l of local || []) {
    if (!l || !l.id) continue;

    if (map.has(l.id)) {
      if (pendingGoalUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    } else {
      if (!isAuthoritative) {
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingGoalUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingGoalUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          const deletedAt = deletions.get(l.id)!;
          const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          const remoteDeleted = new Date(deletedAt).getTime();

          if (remoteDeleted >= localUpdated) {
            removePendingWrite('goal', l.id);
            Storage.unmarkSynced(l.id);
          } else {
            map.set(l.id, l);
            newToUpload.push(l);
          }
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const mergeRemoteSleepLogs = (
  local: SleepLog[],
  remote: SleepLog[],
  syncedIds: Set<string>,
  pendingSleepUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: SleepLog[]; newToUpload: SleepLog[] } => {
  const map = new Map<string, SleepLog>();
  const newToUpload: SleepLog[] = [];
  const dateMap = new Map<string, SleepLog>();

  const hasRealSleepInRemote = (remote || []).some((s) => s && !s.id.startsWith('seed_sleep_'));
  const hasRealSleepInLocal = (local || []).some((l) => l && !l.id.startsWith('seed_sleep_'));
  const shouldDiscardSeeds = hasRealSleepInRemote || hasRealSleepInLocal;

  // 1. Canonical cloud source of truth
  for (const s of remote || []) {
    if (s && s.id) {
      if (shouldDiscardSeeds && s.id.startsWith('seed_sleep_')) {
        continue;
      }
      map.set(s.id, s);
      dateMap.set(s.date, s);
    }
  }

  // 2. Reconcile local logs
  for (const l of local || []) {
    if (!l || !l.id) continue;

    if (shouldDiscardSeeds && l.id.startsWith('seed_sleep_')) {
      continue;
    }

    if (map.has(l.id)) {
      if (pendingSleepUploadIds.has(l.id)) {
        map.set(l.id, l);
        dateMap.set(l.date, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (
          l.updatedAt &&
          r.updatedAt &&
          new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()
        ) {
          map.set(l.id, l);
          dateMap.set(l.date, l);
          newToUpload.push(l);
        }
      }
    } else {
      const existingForDate = dateMap.get(l.date);
      if (existingForDate) {
        const isLocalSeed = l.id.startsWith('seed_sleep_');
        if (
          !isLocalSeed &&
          (pendingSleepUploadIds.has(l.id) ||
            (l.updatedAt &&
              existingForDate.updatedAt &&
              new Date(l.updatedAt).getTime() > new Date(existingForDate.updatedAt).getTime()))
        ) {
          map.delete(existingForDate.id);
          map.set(l.id, l);
          dateMap.set(l.date, l);
          newToUpload.push(l);
        }
      } else {
        if (!isAuthoritative) {
          if (!l.id.startsWith('seed_sleep_')) {
            map.set(l.id, l);
            dateMap.set(l.date, l);
            if (!syncedIds.has(l.id) || pendingSleepUploadIds.has(l.id)) {
              newToUpload.push(l);
            }
          }
        } else {
          const wasSyncedBefore = syncedIds.has(l.id);
          const isPendingUpload = pendingSleepUploadIds.has(l.id);

          if (deletions.has(l.id)) {
            const deletedAt = deletions.get(l.id)!;
            const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
            const remoteDeleted = new Date(deletedAt).getTime();

            if (remoteDeleted >= localUpdated) {
              removePendingWrite('sleep', l.id);
              Storage.unmarkSynced(l.id);
            } else {
              map.set(l.id, l);
              dateMap.set(l.date, l);
              newToUpload.push(l);
            }
          } else if (!l.id.startsWith('seed_sleep_') && (!wasSyncedBefore || isPendingUpload)) {
            map.set(l.id, l);
            dateMap.set(l.date, l);
            newToUpload.push(l);
          }
        }
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { merged, newToUpload };
};

const mergeRemoteSavingsGoals = (
  local: SavingsGoal[],
  remote: SavingsGoal[],
  syncedIds: Set<string>,
  pendingGoalUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: SavingsGoal[]; newToUpload: SavingsGoal[] } => {
  const map = new Map<string, SavingsGoal>();
  const newToUpload: SavingsGoal[] = [];

  for (const g of remote || []) {
    if (g && g.id) {
      map.set(g.id, g);
    }
  }

  for (const l of local || []) {
    if (!l || !l.id) continue;

    if (map.has(l.id)) {
      if (pendingGoalUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    } else {
      if (!isAuthoritative) {
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingGoalUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingGoalUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          const deletedAt = deletions.get(l.id)!;
          const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          const remoteDeleted = new Date(deletedAt).getTime();

          if (remoteDeleted >= localUpdated) {
            removePendingWrite('savings_goal', l.id);
            Storage.unmarkSynced(l.id);
          } else {
            map.set(l.id, l);
            newToUpload.push(l);
          }
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const mergeRemoteSavingsTransactions = (
  local: SavingsTransaction[],
  remote: SavingsTransaction[],
  syncedIds: Set<string>,
  pendingTxUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: SavingsTransaction[]; newToUpload: SavingsTransaction[] } => {
  const map = new Map<string, SavingsTransaction>();
  const newToUpload: SavingsTransaction[] = [];

  for (const t of remote || []) {
    if (t && t.id) {
      map.set(t.id, t);
    }
  }

  for (const l of local || []) {
    if (!l || !l.id) continue;

    if (map.has(l.id)) {
      if (pendingTxUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    } else {
      if (!isAuthoritative) {
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingTxUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingTxUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          const deletedAt = deletions.get(l.id)!;
          const localUpdated = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
          const remoteDeleted = new Date(deletedAt).getTime();

          if (remoteDeleted >= localUpdated) {
            removePendingWrite('savings_transaction', l.id);
            Storage.unmarkSynced(l.id);
          } else {
            map.set(l.id, l);
            newToUpload.push(l);
          }
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date)), newToUpload };
};

const mergeRemoteCompletions = (
  local: HabitCompletion[],
  remote: HabitCompletion[],
  syncedIds: Set<string>,
  pendingCompletionUploadIds: Set<string> = new Set(),
  isAuthoritative = true,
  deletions: Map<string, string> = new Map()
): { merged: HabitCompletion[]; newToUpload: HabitCompletion[] } => {
  const map = new Map<string, HabitCompletion>();
  const newToUpload: HabitCompletion[] = [];

  for (const c of remote || []) {
    if (c && c.id && !DEMO_COMPLETION_IDS.has(c.id)) {
      map.set(c.id, c);
    }
  }

  for (const l of local || []) {
    if (!l || !l.id || DEMO_COMPLETION_IDS.has(l.id)) continue;

    if (map.has(l.id)) {
      if (pendingCompletionUploadIds.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      }
    } else {
      if (!isAuthoritative) {
        map.set(l.id, l);
        if (!syncedIds.has(l.id) || pendingCompletionUploadIds.has(l.id)) {
          newToUpload.push(l);
        }
      } else {
        const wasSyncedBefore = syncedIds.has(l.id);
        const isPendingUpload = pendingCompletionUploadIds.has(l.id);

        if (deletions.has(l.id)) {
          removePendingWrite('completion', l.id);
          Storage.unmarkSynced(l.id);
        } else if (!wasSyncedBefore || isPendingUpload) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const purgeCloudDemoItems = async (
  userId: string,
  rawHabits: Habit[],
  rawCompletions: HabitCompletion[],
  rawTodos: Todo[],
  rawSleepLogs?: SleepLog[]
) => {
  if (!userId) return;
  for (const h of rawHabits || []) {
    if (h && DEMO_HABIT_IDS.has(h.id)) {
      try {
        await deleteHabitFromCloud(userId, h.id);
      } catch {}
    }
  }
  for (const c of rawCompletions || []) {
    if (c && (DEMO_COMPLETION_IDS.has(c.id) || DEMO_HABIT_IDS.has(c.habitId))) {
      try {
        await deleteCompletionFromCloud(userId, c.id);
      } catch {}
    }
  }
  for (const t of rawTodos || []) {
    if (t && DEMO_TODO_IDS.has(t.id)) {
      try {
        await deleteTodoFromCloud(userId, t.id);
      } catch {}
    }
  }
  // If user has real custom sleep logs, purge any stale seed sleep logs that were previously pushed
  const hasRealSleep = (rawSleepLogs || []).some((s) => s && !s.id.startsWith('seed_sleep_'));
  if (hasRealSleep) {
    for (const s of rawSleepLogs || []) {
      if (s && s.id.startsWith('seed_sleep_')) {
        try {
          await deleteSleepLogFromCloud(userId, s.id, false);
        } catch {}
      }
    }
  }
};
import { getTodayKey, addDays } from '@/lib/date-utils';
import {
  calculateDayProgress,
  calculateHabitStreak,
  calculateOverallStreaks,
} from '@/lib/streak-service';
import confetti from 'canvas-confetti';
import {
  auth,
  signInWithGoogle,
  logoutUser,
  onAuthStateChanged,
  User,
} from '@/lib/firebase';
import {
  saveUserProfile,
  syncHabitToCloud,
  deleteHabitFromCloud,
  syncCompletionToCloud,
  deleteCompletionFromCloud,
  syncTodoToCloud,
  deleteTodoFromCloud,
  syncGoalToCloud,
  deleteGoalFromCloud,
  syncSleepLogToCloud,
  deleteSleepLogFromCloud,
  syncSavingsGoalToCloud,
  deleteSavingsGoalFromCloud,
  syncSavingsTransactionToCloud,
  deleteSavingsTransactionFromCloud,
  syncSavingsSettingsToCloud,
  syncSettingsToCloud,
  uploadInitialDataToCloud,
  checkHasCloudData,
  subscribeToUserCloudData,
  syncAllLocalDataToCloud,
  fetchAllCloudData,
  flushPendingCloudWrites,
  getPendingWriteIds,
  removePendingWrite,
  syncNotificationToCloud,
  updateNotificationInCloud,
  deleteNotificationFromCloud,
  deleteNotificationsBatchFromCloud,
  deleteAllNotificationsFromCloud,
  markAllNotificationsReadInCloud,
  syncDismissedNotificationsToCloud,
  syncReminderToCloud,
  deleteReminderFromCloud,
  syncNotificationSettingsToCloud,
  syncAIBriefingToCloud,
} from '@/lib/firestore-service';
import {
  NotificationRecord,
  ReminderDefinition,
  NotificationSettings,
  AIDailyBriefing,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/lib/notification-types';
import {
  isQuietHoursActive,
  pruneExpiredNotifications,
  playNotificationSound,
  requestAIDailyBriefing,
} from '@/lib/notification-service';
import {
  evaluateAllReminders,
  ReminderEvaluationContext,
  getNotificationDismissalKeys,
  isNotificationDismissed,
} from '@/lib/reminder-engine';
import firebaseConfig from '@/firebase-applet-config.json';

interface LifeOSContextType {
  // Auth & Cloud State
  user: User | null;
  authLoading: boolean;
  isCloudConnected: boolean;
  cloudDbName: string;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  syncNow: () => Promise<void>;
  pullFromCloud: () => Promise<void>;

  // Data State
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  goals: Goal[];
  dailyContributions: DailyGoalContribution[];
  settings: UserSettings;
  activeTab: ActiveTab;
  selectedDate: string;
  toasts: ToastMessage[];
  isLoaded: boolean;

  // Navigation
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedDate: (dateKey: string) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;

  // Habit Operations
  createHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string };
  updateHabit: (id: string, updates: Partial<Habit>) => { success: boolean; error?: string };
  deleteHabit: (id: string) => void;
  togglePauseHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, dateKey?: string) => void;
  convertHabitToTodo: (habitId: string, targetDate?: string) => void;
  getHabitStreakInfo: (habit: Habit) => HabitStreakInfo;

  // Todo Operations
  createTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => { success: boolean; error?: string };
  updateTodo: (id: string, updates: Partial<Todo>) => { success: boolean; error?: string };
  deleteTodo: (id: string) => void;
  toggleTodoCompletion: (id: string) => void;
  reorderTodos: (dateKey: string, sourceIndex: number, destIndex: number) => void;
  getTodosForDate: (dateKey: string) => Todo[];

  // Goal & Roadmap Operations
  createGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => { success: boolean; error?: string; goal?: Goal };
  createGoalSimple: (name: string, deadline: string, category?: string, description?: string, timeHorizon?: GoalTimeHorizon) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => { success: boolean; error?: string };
  deleteGoal: (id: string) => void;
  toggleGoalTask: (goalId: string, milestoneId: string, taskId: string) => void;
  toggleGoalMilestone: (goalId: string, milestoneId: string) => void;
  toggleGoalChapter: (goalId: string, chapterId: string) => void;
  updateGoalChapterDays: (goalId: string, chapterId: string, days: number) => void;
  toggleGoalChapterTask: (goalId: string, chapterId: string, taskId: string) => void;
  quickAddTarget: (goalId: string, targetTitle: string, monthLabel?: string) => void;
  quickAddTask: (goalId: string, milestoneId: string, taskTitle: string, priority?: 1 | 2 | 3) => void;
  replanGoalSchedule: (goalId: string) => void;
  applyAIPlan: (plan: AIPlanGeneratedResult, createTasks?: boolean, createHabits?: boolean) => void;
  applyAIReplan: (goalId: string, replanResult: AIReplanGeneratedResult) => void;

  // Sleep Operations & State
  sleepLogs: SleepLog[];
  activeSleepSession: ActiveSleepSession | null;
  sleepSettings: SleepSettings;
  sleepAnalytics: SleepAnalyticsSummary;
  addSleepLog: (log: Omit<SleepLog, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SleepLog>;
  updateSleepLog: (id: string, updates: Partial<SleepLog>) => Promise<void>;
  deleteSleepLog: (id: string) => Promise<void>;
  startSleepSession: () => void;
  stopSleepSessionAndLog: (
    quality?: SleepQuality,
    factors?: string[],
    notes?: string,
    mood?: WakeMood
  ) => Promise<SleepLog | null>;
  cancelSleepSession: () => void;
  updateSleepSettings: (settings: Partial<SleepSettings>) => void;

  // Savings Operations & State
  savingsGoals: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  savingsSettings: SavingsSettings;
  savingsAnalytics: SavingsAnalyticsSummary;
  createSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'> & { initialDeposit?: number }) => { success: boolean; error?: string; goal?: SavingsGoal };
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => { success: boolean; error?: string };
  deleteSavingsGoal: (id: string, reallocateToGeneral?: boolean) => void;
  addSavingsTransaction: (tx: Omit<SavingsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; error?: string; transaction?: SavingsTransaction };
  updateSavingsTransaction: (id: string, updates: Partial<SavingsTransaction>) => { success: boolean; error?: string };
  deleteSavingsTransaction: (id: string) => void;
  transferSavings: (amount: number, sourceGoalId: string | null, destGoalId: string | null, notes?: string) => { success: boolean; error?: string };
  updateSavingsSettings: (settings: Partial<SavingsSettings>) => void;

  // Stats & Progress
  todayProgress: DayProgress;
  selectedDateProgress: DayProgress;
  overallStreaks: OverallStreakInfo;
  getDayProgress: (dateKey: string) => DayProgress;

  // Settings & Storage
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetDataToDefaults: () => void;
  clearData: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;

  // Feedback & UI
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  triggerCelebration: () => void;

  // Notification State & Operations
  notifications: NotificationRecord[];
  unreadNotificationsCount: number;
  customReminders: ReminderDefinition[];
  notificationSettings: NotificationSettings;
  aiBriefings: AIDailyBriefing[];
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllReadNotifications: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  snoozeNotification: (id: string, minutes: number) => Promise<void>;
  dispatchNotification: (notif: Omit<NotificationRecord, 'id' | 'createdAt'>) => Promise<NotificationRecord>;
  createReminder: (reminder: Omit<ReminderDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ReminderDefinition>;
  updateReminder: (id: string, updates: Partial<ReminderDefinition>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  generateAIDailyBriefing: (forceRefresh?: boolean) => Promise<AIDailyBriefing | null>;
  evaluateNotificationHeartbeat: () => Promise<void>;
}

const LifeOSContext = createContext<LifeOSContextType | null>(null);

export function LifeOSProvider({ children }: { children: React.ReactNode }) {
  const isLoaded = true;

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const cloudDbName = firebaseConfig.firestoreDatabaseId || 'LifeOS Cloud Database';

  // Core data state initialized empty with no demo items
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [activeSleepSession, setActiveSleepSession] = useState<ActiveSleepSession | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<SavingsTransaction[]>([]);
  const [savingsSettings, setSavingsSettings] = useState<SavingsSettings>(DEFAULT_SAVINGS_SETTINGS);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  // Notification state
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [customReminders, setCustomReminders] = useState<ReminderDefinition[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [aiBriefings, setAIBriefings] = useState<AIDailyBriefing[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State refs to guarantee fresh data in asynchronous callbacks
  const userRef = useRef<User | null>(null);
  const habitsRef = useRef<Habit[]>(habits);
  const completionsRef = useRef<HabitCompletion[]>(completions);
  const todosRef = useRef<Todo[]>(todos);
  const goalsRef = useRef<Goal[]>(goals);
  const sleepLogsRef = useRef<SleepLog[]>(sleepLogs);
  const savingsGoalsRef = useRef<SavingsGoal[]>(savingsGoals);
  const savingsTransactionsRef = useRef<SavingsTransaction[]>(savingsTransactions);
  const savingsSettingsRef = useRef<SavingsSettings>(savingsSettings);
  const settingsRef = useRef<UserSettings>(settings);
  const notificationsRef = useRef<NotificationRecord[]>(notifications);
  const customRemindersRef = useRef<ReminderDefinition[]>(customReminders);
  const notificationSettingsRef = useRef<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const aiBriefingsRef = useRef<AIDailyBriefing[]>(aiBriefings);
  const isWakingRef = useRef<boolean>(false);
  const deletionsRef = useRef<Map<string, string>>(new Map());
  const pendingDeletedNotifIdsRef = useRef<Set<string>>(new Set());
  const dismissedNotifKeysRef = useRef<Set<string>>(new Set());
  const notificationsClearedAtRef = useRef<string | null>(null);
  const authResolvedRef = useRef<boolean>(false);
  const cloudNotifsHydratedRef = useRef<boolean>(false);
  const cloudDismissedHydratedRef = useRef<boolean>(false);
  const notifDeleteInFlightRef = useRef<boolean>(false);
  const evaluateHeartbeatRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);
  useEffect(() => { completionsRef.current = completions; }, [completions]);
  useEffect(() => { todosRef.current = todos; }, [todos]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { sleepLogsRef.current = sleepLogs; }, [sleepLogs]);
  useEffect(() => { savingsGoalsRef.current = savingsGoals; }, [savingsGoals]);
  useEffect(() => { savingsTransactionsRef.current = savingsTransactions; }, [savingsTransactions]);
  useEffect(() => { savingsSettingsRef.current = savingsSettings; }, [savingsSettings]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { customRemindersRef.current = customReminders; }, [customReminders]);
  useEffect(() => { notificationSettingsRef.current = notificationSettings || DEFAULT_NOTIFICATION_SETTINGS; }, [notificationSettings]);
  useEffect(() => { aiBriefingsRef.current = aiBriefings; }, [aiBriefings]);

  const persistGoals = useCallback((newGoals: Goal[]) => {
    setGoals(newGoals);
    Storage.saveGoals(newGoals);
  }, []);

  const persistSleepLogs = useCallback((newLogs: SleepLog[]) => {
    setSleepLogs(newLogs);
    Storage.saveSleepLogs(newLogs);
  }, []);

  const persistSavingsGoals = useCallback((newGoals: SavingsGoal[]) => {
    setSavingsGoals(newGoals);
    Storage.saveSavingsGoals(newGoals);
  }, []);

  const persistSavingsTransactions = useCallback((newTransactions: SavingsTransaction[]) => {
    setSavingsTransactions(newTransactions);
    Storage.saveSavingsTransactions(newTransactions);
  }, []);

  const persistSavingsSettings = useCallback((newSettings: SavingsSettings) => {
    setSavingsSettings(newSettings);
    Storage.saveSavingsSettings(newSettings);
  }, []);

  const savingsAnalytics = useMemo(() => {
    return calculateSavingsAnalytics(savingsGoals, savingsTransactions, savingsSettings);
  }, [savingsGoals, savingsTransactions, savingsSettings]);

  const dailyContributions = useMemo(() => {
    return computeDailyGoalContributions(goals, habits, completions, todos, selectedDate);
  }, [goals, habits, completions, todos, selectedDate]);

  // Synchronize with client-side localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedHabits = Storage.getHabits();
        const savedCompletions = Storage.getCompletions();
        const savedTodos = Storage.getTodos();
        const savedGoals = Storage.getGoals();
        const savedSleepLogs = Storage.getSleepLogs();
        const savedSession = Storage.getActiveSleepSession();
        const savedSavingsGoals = Storage.getSavingsGoals();
        const savedSavingsTransactions = Storage.getSavingsTransactions();
        const savedSavingsSettings = Storage.getSavingsSettings();
        const savedSettings = Storage.getSettings();

        setHabits(savedHabits);
        setCompletions(savedCompletions);
        setTodos(savedTodos);
        setGoals(savedGoals);
        setSleepLogs(savedSleepLogs);
        setActiveSleepSession(savedSession);
        setSavingsGoals(savedSavingsGoals);
        setSavingsTransactions(savedSavingsTransactions);
        setSavingsSettings(savedSavingsSettings);
        setSettings(savedSettings);

        try {
          const initialUid = auth.currentUser?.uid || Storage.getCachedUserId() || undefined;
          const dismissed = Storage.getDismissedNotificationKeys(initialUid);
          const clearedAt = Storage.getNotificationsClearedAt(initialUid);
          dismissedNotifKeysRef.current = dismissed;
          notificationsClearedAtRef.current = clearedAt;

          const storedNotifs = Storage.getNotifications(initialUid);
          const filteredNotifs = storedNotifs.filter(
            (n) => n && !pendingDeletedNotifIdsRef.current.has(n.id) && !isNotificationDismissed(n, dismissed, clearedAt, initialUid)
          );
          setNotifications(filteredNotifs);
          notificationsRef.current = filteredNotifs;

          const storedReminders = Storage.getReminders(initialUid);
          setCustomReminders(storedReminders);
          customRemindersRef.current = storedReminders;

          const storedNotifSettings = Storage.getNotificationSettings(initialUid);
          if (storedNotifSettings) {
            const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...storedNotifSettings };
            setNotificationSettings(merged);
            notificationSettingsRef.current = merged;
          }

          const storedBriefings = Storage.getAIBriefings(initialUid);
          setAIBriefings(storedBriefings);
          aiBriefingsRef.current = storedBriefings;
        } catch {}
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Lightweight heartbeat: ensures offline writes are flushed without locking the client
  useEffect(() => {
    if (!user || !isOnline) return;

    const interval = setInterval(() => {
      const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
      if (uid && navigator.onLine) {
        flushPendingCloudWrites(uid).catch(() => {});
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [user, isOnline]);

  // Toast helper
  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Broadcast channel for instantaneous cross-tab synchronization
  const broadcastLocalChange = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('lifeos_cloud_sync');
        bc.postMessage({ type: 'CHANGE_MADE', timestamp: Date.now() });
        bc.close();
      }
    } catch {}
  }, []);

  // Firebase Auth State Listener & Immediate Real-time Cloud Sync
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let subscribedUid: string | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      authResolvedRef.current = true;
      setUser(currentUser);
      userRef.current = currentUser;
      setAuthLoading(false);

      if (currentUser) {
        const cachedUid = Storage.getCachedUserId();
        const lastSignOutUid = typeof window !== 'undefined' ? localStorage.getItem('lifeos_last_signed_out_uid') : null;
        const isAccountSwitch = (cachedUid && cachedUid !== currentUser.uid) || (lastSignOutUid && lastSignOutUid !== currentUser.uid);
        let isAccountSwitchActive = isAccountSwitch;

        // Always purge un-scoped guest notification storage when signed in so guest alerts never leak into Gmail accounts
        Storage.clearGuestNotificationStorage();

        if (isAccountSwitch) {
          // Account switch detected: clear in-memory state and un-scoped cache to prevent cross-account data leakage
          Storage.clearLocalUserData(cachedUid || lastSignOutUid || undefined);
          setHabits([]);
          habitsRef.current = [];
          setCompletions([]);
          completionsRef.current = [];
          setTodos([]);
          todosRef.current = [];
          setGoals([]);
          goalsRef.current = [];
          const seeds = getInitialSeedSleepLogs();
          setSleepLogs(seeds);
          sleepLogsRef.current = seeds;
          setSavingsGoals([]);
          savingsGoalsRef.current = [];
          setSavingsTransactions([]);
          savingsTransactionsRef.current = [];
          setSavingsSettings(DEFAULT_SAVINGS_SETTINGS);
          savingsSettingsRef.current = DEFAULT_SAVINGS_SETTINGS;
          setSettings(INITIAL_SETTINGS);
          settingsRef.current = INITIAL_SETTINGS;
          setNotifications([]);
          notificationsRef.current = [];
          setCustomReminders([]);
          customRemindersRef.current = [];
          setAIBriefings([]);
          aiBriefingsRef.current = [];
          setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
          notificationSettingsRef.current = DEFAULT_NOTIFICATION_SETTINGS;
          deletionsRef.current = new Map();
          pendingDeletedNotifIdsRef.current.clear();
          dismissedNotifKeysRef.current.clear();
          notificationsClearedAtRef.current = null;
          cloudNotifsHydratedRef.current = false;
          cloudDismissedHydratedRef.current = false;
          notifDeleteInFlightRef.current = false;
        }

        // Load this specific Gmail user's local dismissal keys and watermark immediately
        dismissedNotifKeysRef.current = Storage.getDismissedNotificationKeys(currentUser.uid);
        notificationsClearedAtRef.current = Storage.getNotificationsClearedAt(currentUser.uid);

        Storage.setCachedUserId(currentUser.uid);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lifeos_last_signed_out_uid');
        }
        Storage.clearDeletedIds();

        if (subscribedUid === currentUser.uid && unsubscribeFirestore) {
          return;
        }
        subscribedUid = currentUser.uid;
        cloudNotifsHydratedRef.current = false;
        cloudDismissedHydratedRef.current = false;

        // 1. Immediately subscribe to real-time updates from Firestore with non-destructive merge
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }

        unsubscribeFirestore = subscribeToUserCloudData(currentUser.uid, {
          onDeletions: (map) => {
            deletionsRef.current = map;
          },
          onHabits: (cloudHabits, meta) => {
            if (!cloudHabits) return;
            // Ignore optimistic local snapshots to prevent recursive write feedback loops
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingHabits = getPendingWriteIds('habit', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (habitsRef.current.length > 0 ? habitsRef.current : Storage.getHabits());
            const { merged, newToUpload } = mergeRemoteHabits(
              currentLocal,
              cloudHabits,
              synced,
              pendingHabits,
              isAuthoritative,
              deletionsRef.current
            );
            setHabits(merged);
            habitsRef.current = merged;
            Storage.saveHabits(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((h) => h.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((h) => syncHabitToCloud(currentUser.uid, h));
            }
          },
          onCompletions: (cloudCompletions, meta) => {
            if (!cloudCompletions) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingCompletions = getPendingWriteIds('completion', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (completionsRef.current.length > 0 ? completionsRef.current : Storage.getCompletions());
            const { merged, newToUpload } = mergeRemoteCompletions(
              currentLocal,
              cloudCompletions,
              synced,
              pendingCompletions,
              isAuthoritative,
              deletionsRef.current
            );
            setCompletions(merged);
            completionsRef.current = merged;
            Storage.saveCompletions(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((c) => c.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((c) => syncCompletionToCloud(currentUser.uid, c));
            }
          },
          onTodos: (cloudTodos, meta) => {
            if (!cloudTodos) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingTodos = getPendingWriteIds('todo', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (todosRef.current.length > 0 ? todosRef.current : Storage.getTodos());
            const { merged, newToUpload } = mergeRemoteTodos(
              currentLocal,
              cloudTodos,
              synced,
              pendingTodos,
              isAuthoritative,
              deletionsRef.current
            );
            setTodos(merged);
            todosRef.current = merged;
            Storage.saveTodos(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((t) => t.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((t) => syncTodoToCloud(currentUser.uid, t));
            }
          },
          onGoals: (cloudGoals, meta) => {
            if (!cloudGoals) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingGoals = getPendingWriteIds('goal', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (goalsRef.current.length > 0 ? goalsRef.current : Storage.getGoals());
            const { merged, newToUpload } = mergeRemoteGoals(
              currentLocal,
              cloudGoals,
              synced,
              pendingGoals,
              isAuthoritative,
              deletionsRef.current
            );
            setGoals(merged);
            goalsRef.current = merged;
            Storage.saveGoals(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((g) => g.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((g) => syncGoalToCloud(currentUser.uid, g));
            }
          },
          onSleepLogs: (cloudSleepLogs, meta) => {
            if (!cloudSleepLogs) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingSleepIds = getPendingWriteIds('sleep', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (sleepLogsRef.current.length > 0 ? sleepLogsRef.current : Storage.getSleepLogs());
            const { merged, newToUpload } = mergeRemoteSleepLogs(
              currentLocal,
              cloudSleepLogs,
              synced,
              pendingSleepIds,
              isAuthoritative,
              deletionsRef.current
            );
            setSleepLogs(merged);
            sleepLogsRef.current = merged;
            Storage.saveSleepLogs(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((s) => s.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((s) => syncSleepLogToCloud(currentUser.uid, s));
            }
          },
          onSettings: (cloudSettings, meta) => {
            if (!cloudSettings) return;
            if (meta?.hasPendingWrites) return;
            const currentLocalSettings = settingsRef.current || Storage.getSettings();
            const mergedSettings: UserSettings = {
              ...INITIAL_SETTINGS,
              ...currentLocalSettings,
              ...cloudSettings,
              sleepSettings: {
                ...DEFAULT_SLEEP_SETTINGS,
                ...(currentLocalSettings.sleepSettings || {}),
                ...(cloudSettings.sleepSettings || {}),
              },
            };
            setSettings(mergedSettings);
            settingsRef.current = mergedSettings;
            Storage.saveSettings(mergedSettings);
            setLastSyncedAt(new Date());
          },
          onSavingsGoals: (cloudSavingsGoals, meta) => {
            if (!cloudSavingsGoals) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingGoals = getPendingWriteIds('savings_goal', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (savingsGoalsRef.current.length > 0 ? savingsGoalsRef.current : Storage.getSavingsGoals());
            const { merged, newToUpload } = mergeRemoteSavingsGoals(
              currentLocal,
              cloudSavingsGoals,
              synced,
              pendingGoals,
              isAuthoritative,
              deletionsRef.current
            );
            setSavingsGoals(merged);
            savingsGoalsRef.current = merged;
            Storage.saveSavingsGoals(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((g) => g.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((g) => syncSavingsGoalToCloud(currentUser.uid, g));
            }
          },
          onSavingsTransactions: (cloudSavingsTx, meta) => {
            if (!cloudSavingsTx) return;
            if (meta?.hasPendingWrites) return;
            const isAuthoritative = !meta?.fromCache;
            const synced = Storage.getSyncedIds(currentUser.uid);
            const pendingTx = getPendingWriteIds('savings_transaction', currentUser.uid);
            const currentLocal = isAccountSwitchActive ? [] : (savingsTransactionsRef.current.length > 0 ? savingsTransactionsRef.current : Storage.getSavingsTransactions());
            const { merged, newToUpload } = mergeRemoteSavingsTransactions(
              currentLocal,
              cloudSavingsTx,
              synced,
              pendingTx,
              isAuthoritative,
              deletionsRef.current
            );
            setSavingsTransactions(merged);
            savingsTransactionsRef.current = merged;
            Storage.saveSavingsTransactions(merged);
            if (isAuthoritative) {
              Storage.markSynced(merged.map((t) => t.id), currentUser.uid);
            }
            setLastSyncedAt(new Date());

            if (isAuthoritative && newToUpload.length > 0 && !isAccountSwitchActive) {
              newToUpload.forEach((t) => syncSavingsTransactionToCloud(currentUser.uid, t));
            }
          },
          onSavingsSettings: (cloudSavingsSettings, meta) => {
            if (!cloudSavingsSettings) return;
            if (meta?.hasPendingWrites) return;
            const currentLocal = savingsSettingsRef.current || Storage.getSavingsSettings();
            const merged = {
              ...DEFAULT_SAVINGS_SETTINGS,
              ...currentLocal,
              ...cloudSavingsSettings,
            };
            setSavingsSettings(merged);
            savingsSettingsRef.current = merged;
            Storage.saveSavingsSettings(merged);
          },
          onDismissedNotifications: (cloudDismissed, meta) => {
            cloudDismissedHydratedRef.current = true;
            const mergedKeys = new Set<string>([
              ...Array.from(dismissedNotifKeysRef.current),
              ...Array.from(Storage.getDismissedNotificationKeys(currentUser.uid)),
              ...(Array.isArray(cloudDismissed?.keys) ? cloudDismissed.keys : []),
            ]);
            dismissedNotifKeysRef.current = mergedKeys;
            Storage.saveDismissedNotificationKeys(mergedKeys, currentUser.uid);

            const localCleared = notificationsClearedAtRef.current || Storage.getNotificationsClearedAt(currentUser.uid);
            const cloudCleared = cloudDismissed?.clearedAllAt || null;
            let latestCleared: string | null = localCleared;
            if (cloudCleared && (!latestCleared || Date.parse(cloudCleared) > Date.parse(latestCleared))) {
              latestCleared = cloudCleared;
            }
            notificationsClearedAtRef.current = latestCleared;
            Storage.setNotificationsClearedAt(latestCleared, currentUser.uid);

            // Immediately prune any matching notifications already in memory
            if (notificationsRef.current.length > 0) {
              const kept: NotificationRecord[] = [];
              const staleIds: string[] = [];
              for (const n of notificationsRef.current) {
                if (pendingDeletedNotifIdsRef.current.has(n.id) || isNotificationDismissed(n, mergedKeys, latestCleared, currentUser.uid)) {
                  staleIds.push(n.id);
                } else {
                  kept.push(n);
                }
              }
              if (staleIds.length > 0) {
                notificationsRef.current = kept;
                setNotifications(kept);
                Storage.saveNotifications(kept, currentUser.uid);
                if (!meta?.fromCache && !meta?.hasPendingWrites && !notifDeleteInFlightRef.current) {
                  deleteNotificationsBatchFromCloud(currentUser.uid, staleIds).catch(() => {});
                }
              }
            }

            if (cloudNotifsHydratedRef.current) {
              setTimeout(() => {
                evaluateHeartbeatRef.current().catch(() => {});
              }, 300);
            }
          },
          onNotifications: (cloudNotifs, meta) => {
            if (!cloudNotifs) return;
            cloudNotifsHydratedRef.current = true;

            // Ignore intermediate snapshot churn while a bulk/single delete batch is in-flight
            if (notifDeleteInFlightRef.current) {
              return;
            }

            const isAuthoritative = !meta?.fromCache && !meta?.hasPendingWrites;
            const dismissed = new Set<string>([
              ...Array.from(dismissedNotifKeysRef.current),
              ...Array.from(Storage.getDismissedNotificationKeys(currentUser.uid)),
            ]);
            dismissedNotifKeysRef.current = dismissed;
            const clearedAt = notificationsClearedAtRef.current || Storage.getNotificationsClearedAt(currentUser.uid);

            const cloudIdSet = new Set(cloudNotifs.map((n) => n.id));
            if (isAuthoritative && pendingDeletedNotifIdsRef.current.size > 0) {
              for (const pendingId of Array.from(pendingDeletedNotifIdsRef.current)) {
                if (!cloudIdSet.has(pendingId)) {
                  pendingDeletedNotifIdsRef.current.delete(pendingId);
                }
              }
            }

            const kept: NotificationRecord[] = [];
            const orphansToDelete: string[] = [];

            for (const n of cloudNotifs) {
              if (!n || !n.id) continue;
              if (pendingDeletedNotifIdsRef.current.has(n.id)) {
                if (isAuthoritative) orphansToDelete.push(n.id);
                continue;
              }
              if (isNotificationDismissed(n, dismissed, clearedAt, currentUser.uid)) {
                if (isAuthoritative) orphansToDelete.push(n.id);
                continue;
              }
              kept.push(n);
            }

            // Silently purge any leftover orphaned/dismissed cloud notification docs
            if (isAuthoritative && orphansToDelete.length > 0) {
              orphansToDelete.forEach((oid) => pendingDeletedNotifIdsRef.current.add(oid));
              deleteNotificationsBatchFromCloud(currentUser.uid, orphansToDelete).catch(() => {});
            }

            setNotifications(kept);
            notificationsRef.current = kept;
            Storage.saveNotifications(kept, currentUser.uid);

            if (cloudDismissedHydratedRef.current) {
              setTimeout(() => {
                evaluateHeartbeatRef.current().catch(() => {});
              }, 300);
            }
          },
          onReminders: (cloudReminders) => {
            if (!cloudReminders) return;
            setCustomReminders(cloudReminders);
            customRemindersRef.current = cloudReminders;
            Storage.saveReminders(cloudReminders, currentUser.uid);
          },
          onNotificationSettings: (cloudSettings) => {
            if (!cloudSettings) return;
            const merged = { ...DEFAULT_NOTIFICATION_SETTINGS, ...cloudSettings };
            setNotificationSettings(merged);
            notificationSettingsRef.current = merged;
            Storage.saveNotificationSettings(merged, currentUser.uid);
          },
          onAIBriefings: (cloudBriefings) => {
            if (!cloudBriefings) return;
            setAIBriefings(cloudBriefings);
            aiBriefingsRef.current = cloudBriefings;
            Storage.saveAIBriefings(cloudBriefings, currentUser.uid);
          },
        });

        // 2. In background, save profile & flush any queued offline writes
        saveUserProfile(currentUser).catch(() => {});
        flushPendingCloudWrites(currentUser.uid).catch(() => {});
      } else {
        subscribedUid = null;
        cloudNotifsHydratedRef.current = false;
        cloudDismissedHydratedRef.current = false;
        notifDeleteInFlightRef.current = false;
        pendingDeletedNotifIdsRef.current.clear();
        dismissedNotifKeysRef.current.clear();
        notificationsClearedAtRef.current = null;

        const currentUid = userRef.current?.uid || Storage.getCachedUserId();
        if (currentUid && typeof window !== 'undefined') {
          localStorage.setItem('lifeos_last_signed_out_uid', currentUid);
        }
        Storage.setCachedUserId(null);
        Storage.clearLocalUserData(currentUid || undefined);
        setHabits([]);
        habitsRef.current = [];
        setCompletions([]);
        completionsRef.current = [];
        setTodos([]);
        todosRef.current = [];
        setGoals([]);
        goalsRef.current = [];
        const seeds = getInitialSeedSleepLogs();
        setSleepLogs(seeds);
        sleepLogsRef.current = seeds;
        setSavingsGoals([]);
        savingsGoalsRef.current = [];
        setSavingsTransactions([]);
        savingsTransactionsRef.current = [];
        setSavingsSettings(DEFAULT_SAVINGS_SETTINGS);
        savingsSettingsRef.current = DEFAULT_SAVINGS_SETTINGS;
        setSettings(INITIAL_SETTINGS);
        settingsRef.current = INITIAL_SETTINGS;

        // Clean user notifications on sign out
        setNotifications([]);
        notificationsRef.current = [];
        setCustomReminders([]);
        customRemindersRef.current = [];
        setAIBriefings([]);
        aiBriefingsRef.current = [];
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        notificationSettingsRef.current = DEFAULT_NOTIFICATION_SETTINGS;

        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
    });

    // Cross-tab broadcast listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('lifeos_cloud_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'CHANGE_MADE') {
            const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
            if (uid) {
              flushPendingCloudWrites(uid).catch(() => {});
              handleForegroundWake();
            }
          }
        };
      }
    } catch {}

    // Resilient lifecycle listeners: device unlock, mobile foreground, tab focus, network recovery
    const handleForegroundWake = async () => {
      if (isWakingRef.current) return;
      const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
      if (uid && navigator.onLine) {
        isWakingRef.current = true;
        try {
          await flushPendingCloudWrites(uid);
          const cloudData = await fetchAllCloudData(uid);
          if (cloudData) {
            const synced = Storage.getSyncedIds(uid);
            const deletions = cloudData.deletions || new Map();
            const pendingSleep = getPendingWriteIds('sleep', uid);
            const pendingHabits = getPendingWriteIds('habit', uid);
            const pendingTodos = getPendingWriteIds('todo', uid);
            const pendingGoals = getPendingWriteIds('goal', uid);
            const pendingCompletions = getPendingWriteIds('completion', uid);

            if (cloudData.sleepLogs !== null) {
              const sleepMerge = mergeRemoteSleepLogs(sleepLogsRef.current, cloudData.sleepLogs, synced, pendingSleep, true, deletions);
              setSleepLogs(sleepMerge.merged);
              sleepLogsRef.current = sleepMerge.merged;
              Storage.saveSleepLogs(sleepMerge.merged);
              Storage.markSynced(sleepMerge.merged.map((s) => s.id), uid);
              if (sleepMerge.newToUpload.length > 0) {
                sleepMerge.newToUpload.forEach((s) => syncSleepLogToCloud(uid, s));
              }
            }
            if (cloudData.habits !== null) {
              const habitsMerge = mergeRemoteHabits(habitsRef.current, cloudData.habits, synced, pendingHabits, true, deletions);
              setHabits(habitsMerge.merged);
              habitsRef.current = habitsMerge.merged;
              Storage.saveHabits(habitsMerge.merged);
              Storage.markSynced(habitsMerge.merged.map((h) => h.id), uid);
              if (habitsMerge.newToUpload.length > 0) {
                habitsMerge.newToUpload.forEach((h) => syncHabitToCloud(uid, h));
              }
            }
            if (cloudData.todos !== null) {
              const todosMerge = mergeRemoteTodos(todosRef.current, cloudData.todos, synced, pendingTodos, true, deletions);
              setTodos(todosMerge.merged);
              todosRef.current = todosMerge.merged;
              Storage.saveTodos(todosMerge.merged);
              Storage.markSynced(todosMerge.merged.map((t) => t.id), uid);
              if (todosMerge.newToUpload.length > 0) {
                todosMerge.newToUpload.forEach((t) => syncTodoToCloud(uid, t));
              }
            }
            if (cloudData.goals !== null) {
              const goalsMerge = mergeRemoteGoals(goalsRef.current, cloudData.goals, synced, pendingGoals, true, deletions);
              setGoals(goalsMerge.merged);
              goalsRef.current = goalsMerge.merged;
              Storage.saveGoals(goalsMerge.merged);
              Storage.markSynced(goalsMerge.merged.map((g) => g.id), uid);
              if (goalsMerge.newToUpload.length > 0) {
                goalsMerge.newToUpload.forEach((g) => syncGoalToCloud(uid, g));
              }
            }
            if (cloudData.completions !== null) {
              const compMerge = mergeRemoteCompletions(completionsRef.current, cloudData.completions, synced, pendingCompletions, true, deletions);
              setCompletions(compMerge.merged);
              completionsRef.current = compMerge.merged;
              Storage.saveCompletions(compMerge.merged);
              Storage.markSynced(compMerge.merged.map((c) => c.id), uid);
              if (compMerge.newToUpload.length > 0) {
                compMerge.newToUpload.forEach((c) => syncCompletionToCloud(uid, c));
              }
            }
            if (cloudData.settings) {
              const currentLocalSettings = settingsRef.current || Storage.getSettings();
              const mergedSettings: UserSettings = {
                ...INITIAL_SETTINGS,
                ...currentLocalSettings,
                ...cloudData.settings,
                sleepSettings: {
                  ...DEFAULT_SLEEP_SETTINGS,
                  ...(currentLocalSettings.sleepSettings || {}),
                  ...(cloudData.settings.sleepSettings || {}),
                },
              };
              setSettings(mergedSettings);
              settingsRef.current = mergedSettings;
              Storage.saveSettings(mergedSettings);
            }
            setLastSyncedAt(new Date());
          }
        } catch {
          // ignore silent wake update error
        } finally {
          isWakingRef.current = false;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleForegroundWake();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      handleForegroundWake();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Active real-time cross-device background heartbeat (every 25 seconds when online and active)
    const livePollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
        handleForegroundWake();
      }
    }, 25000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleForegroundWake);
    window.addEventListener('pageshow', handleForegroundWake);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(livePollTimer);
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      bc?.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleForegroundWake);
      window.removeEventListener('pageshow', handleForegroundWake);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sign in with Google (Gmail)
  const loginWithGoogle = useCallback(async () => {
    try {
      setAuthLoading(true);
      const signedInUser = await signInWithGoogle();
      userRef.current = signedInUser;
      setUser(signedInUser);
      Storage.setCachedUserId(signedInUser.uid);
      await saveUserProfile(signedInUser);

      // Flush any queued offline writes
      flushPendingCloudWrites(signedInUser.uid).catch(() => {});

      // Instantly pull all cloud data to populate device immediately
      try {
        const rawCloudData = await fetchAllCloudData(signedInUser.uid);
        if (rawCloudData) {
          await purgeCloudDemoItems(
            signedInUser.uid,
            rawCloudData.habits || [],
            rawCloudData.completions || [],
            rawCloudData.todos || [],
            rawCloudData.sleepLogs || []
          );

          if (rawCloudData.habits && rawCloudData.habits.length > 0) {
            const cleanHabits = filterCleanHabits(rawCloudData.habits);
            setHabits(cleanHabits);
            habitsRef.current = cleanHabits;
            Storage.saveHabits(cleanHabits);
            Storage.markSynced(cleanHabits.map((h) => h.id), signedInUser.uid);
          }
          if (rawCloudData.completions && rawCloudData.completions.length > 0) {
            const cleanCompletions = filterCleanCompletions(rawCloudData.completions);
            setCompletions(cleanCompletions);
            completionsRef.current = cleanCompletions;
            Storage.saveCompletions(cleanCompletions);
            Storage.markSynced(cleanCompletions.map((c) => c.id), signedInUser.uid);
          }
          if (rawCloudData.todos && rawCloudData.todos.length > 0) {
            const cleanTodos = filterCleanTodos(rawCloudData.todos);
            setTodos(cleanTodos);
            todosRef.current = cleanTodos;
            Storage.saveTodos(cleanTodos);
            Storage.markSynced(cleanTodos.map((t) => t.id), signedInUser.uid);
          }
          if (rawCloudData.goals && rawCloudData.goals.length > 0) {
            setGoals(rawCloudData.goals);
            goalsRef.current = rawCloudData.goals;
            Storage.saveGoals(rawCloudData.goals);
            Storage.markSynced(rawCloudData.goals.map((g) => g.id), signedInUser.uid);
          }
          if (rawCloudData.sleepLogs && rawCloudData.sleepLogs.length > 0) {
            const cleanSleep = rawCloudData.sleepLogs.filter((s) => s && !s.id.startsWith('seed_sleep_'));
            const logsToSet = cleanSleep.length > 0 ? cleanSleep : rawCloudData.sleepLogs;
            setSleepLogs(logsToSet);
            sleepLogsRef.current = logsToSet;
            Storage.saveSleepLogs(logsToSet);
            Storage.markSynced(logsToSet.map((s) => s.id), signedInUser.uid);
          }
          if (rawCloudData.settings) {
            setSettings(rawCloudData.settings);
            settingsRef.current = rawCloudData.settings;
            Storage.saveSettings(rawCloudData.settings);
          }
          if (rawCloudData.savingsGoals && rawCloudData.savingsGoals.length > 0) {
            setSavingsGoals(rawCloudData.savingsGoals);
            savingsGoalsRef.current = rawCloudData.savingsGoals;
            Storage.saveSavingsGoals(rawCloudData.savingsGoals);
            Storage.markSynced(rawCloudData.savingsGoals.map((g) => g.id), signedInUser.uid);
          }
          if (rawCloudData.savingsTransactions && rawCloudData.savingsTransactions.length > 0) {
            setSavingsTransactions(rawCloudData.savingsTransactions);
            savingsTransactionsRef.current = rawCloudData.savingsTransactions;
            Storage.saveSavingsTransactions(rawCloudData.savingsTransactions);
            Storage.markSynced(rawCloudData.savingsTransactions.map((t) => t.id), signedInUser.uid);
          }
          if (rawCloudData.savingsSettings) {
            setSavingsSettings(rawCloudData.savingsSettings);
            savingsSettingsRef.current = rawCloudData.savingsSettings;
            Storage.saveSavingsSettings(rawCloudData.savingsSettings);
          }
        }
      } catch (e) {
        console.warn('Initial cloud pull on login error:', e);
      }

      showToast({
        type: 'success',
        title: 'Gmail Connected & Auto-Synced',
        message: `Welcome, ${signedInUser.displayName || signedInUser.email}! Changes will now sync instantly across all devices.`,
      });
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        console.info('Sign in cancelled by user.');
        showToast({
          type: 'info',
          title: 'Sign In Cancelled',
          message: 'Google sign-in popup was closed before completing.',
        });
        return;
      }
      console.error('Sign in failed:', error);
      let errorMsg = 'Failed to sign in with Google. Please try again.';
      if (error?.code === 'auth/popup-blocked') {
        errorMsg = 'Sign-in popup was blocked by browser. Please enable popups or open the app in a new tab.';
      } else if (error?.code === 'auth/unauthorized-domain') {
        errorMsg = 'This domain is not authorized in Firebase Console. Add this domain under Authentication > Settings > Authorized domains.';
      } else if (error?.message) {
        errorMsg = error.message.replace('Firebase: ', '');
      }
      showToast({
        type: 'error',
        title: 'Sign In Failed',
        message: errorMsg,
      });
    } finally {
      setAuthLoading(false);
    }
  }, [showToast]);

  // Sign out
  const logout = useCallback(async () => {
    try {
      const currentUid = userRef.current?.uid || Storage.getCachedUserId();
      if (currentUid && typeof window !== 'undefined') {
        localStorage.setItem('lifeos_last_signed_out_uid', currentUid);
      }
      cloudNotifsHydratedRef.current = false;
      cloudDismissedHydratedRef.current = false;
      notifDeleteInFlightRef.current = false;
      pendingDeletedNotifIdsRef.current.clear();
      dismissedNotifKeysRef.current.clear();
      notificationsClearedAtRef.current = null;
      await logoutUser();
      setUser(null);
      userRef.current = null;
      Storage.setCachedUserId(null);
      Storage.clearLocalUserData(currentUid || undefined);
      setHabits([]);
      habitsRef.current = [];
      setCompletions([]);
      completionsRef.current = [];
      setTodos([]);
      todosRef.current = [];
      setGoals([]);
      goalsRef.current = [];
      const seeds = getInitialSeedSleepLogs();
      setSleepLogs(seeds);
      sleepLogsRef.current = seeds;
      setSavingsGoals([]);
      savingsGoalsRef.current = [];
      setSavingsTransactions([]);
      savingsTransactionsRef.current = [];
      setSavingsSettings(DEFAULT_SAVINGS_SETTINGS);
      savingsSettingsRef.current = DEFAULT_SAVINGS_SETTINGS;
      setSettings(INITIAL_SETTINGS);
      settingsRef.current = INITIAL_SETTINGS;
      setNotifications([]);
      notificationsRef.current = [];
      setCustomReminders([]);
      customRemindersRef.current = [];
      setAIBriefings([]);
      aiBriefingsRef.current = [];
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      notificationSettingsRef.current = DEFAULT_NOTIFICATION_SETTINGS;

      showToast({
        type: 'info',
        title: 'Signed Out',
        message: 'You have signed out of your Life OS account.',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      showToast({
        type: 'error',
        title: 'Sign Out Error',
        message: 'An error occurred while signing out.',
      });
    }
  }, [showToast]);

  // Background sync worker function
  const isPerformingSyncRef = useRef<boolean>(false);
  const performBackgroundSync = useCallback(async (silent: boolean = true) => {
    if (!userRef.current || (typeof window !== 'undefined' && !navigator.onLine)) return;
    if (isPerformingSyncRef.current) return;

    isPerformingSyncRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      const currentHabits = Storage.getHabits();
      const currentCompletions = Storage.getCompletions();
      const currentTodos = Storage.getTodos();
      const currentGoals = Storage.getGoals();
      const currentSleepLogs = Storage.getSleepLogs();
      const currentSettings = Storage.getSettings();

      await flushPendingCloudWrites(userRef.current.uid);

      const success = await syncAllLocalDataToCloud(
        userRef.current.uid,
        currentHabits,
        currentCompletions,
        currentTodos,
        currentSettings,
        currentGoals,
        currentSleepLogs
      );

      if (success) {
        setLastSyncedAt(new Date());
      }
    } catch (err) {
      console.warn('Background sync error:', err);
    } finally {
      isPerformingSyncRef.current = false;
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Request Service Worker Background Sync if supported
  const requestServiceWorkerBackgroundSync = useCallback(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg: any) => {
          if (reg && reg.sync) {
            reg.sync.register('sync-lifeos-data').catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, []);

  // Manual trigger to force cloud sync
  const syncNow = useCallback(async () => {
    const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
    if (!uid) {
      showToast({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in with your Google account to synchronize across devices.',
      });
      return;
    }
    if (typeof window !== 'undefined' && !navigator.onLine) {
      showToast({
        type: 'info',
        title: 'Currently Offline',
        message: 'You are offline. Your data is stored locally and will sync automatically when you reconnect.',
      });
      return;
    }

    setIsSyncing(true);
    try {
      await flushPendingCloudWrites(uid);

      // 1. Fetch latest state from cloud
      const cloudData = await fetchAllCloudData(uid);
      if (cloudData) {
        await purgeCloudDemoItems(
          uid,
          cloudData.habits || [],
          cloudData.completions || [],
          cloudData.todos || [],
          cloudData.sleepLogs || []
        );

        const synced = Storage.getSyncedIds(uid);
        const deletions = cloudData.deletions || new Map();
        const pendingHabits = getPendingWriteIds('habit', uid);
        const pendingTodos = getPendingWriteIds('todo', uid);
        const pendingGoals = getPendingWriteIds('goal', uid);
        const pendingSleep = getPendingWriteIds('sleep', uid);
        const pendingCompletions = getPendingWriteIds('completion', uid);

        const newUploadOps: Promise<any>[] = [];

        // Bidirectional merge with authoritative check and deletion conflict resolution
        if (cloudData.habits !== null) {
          const habitsMerge = mergeRemoteHabits(habitsRef.current, cloudData.habits, synced, pendingHabits, true, deletions);
          setHabits(habitsMerge.merged);
          habitsRef.current = habitsMerge.merged;
          Storage.saveHabits(habitsMerge.merged);
          Storage.markSynced(habitsMerge.merged.map((h) => h.id), uid);
          habitsMerge.newToUpload.forEach((h) => newUploadOps.push(syncHabitToCloud(uid, h)));
        }

        if (cloudData.completions !== null) {
          const completionsMerge = mergeRemoteCompletions(completionsRef.current, cloudData.completions, synced, pendingCompletions, true, deletions);
          setCompletions(completionsMerge.merged);
          completionsRef.current = completionsMerge.merged;
          Storage.saveCompletions(completionsMerge.merged);
          Storage.markSynced(completionsMerge.merged.map((c) => c.id), uid);
          completionsMerge.newToUpload.forEach((c) => newUploadOps.push(syncCompletionToCloud(uid, c)));
        }

        if (cloudData.todos !== null) {
          const todosMerge = mergeRemoteTodos(todosRef.current, cloudData.todos, synced, pendingTodos, true, deletions);
          setTodos(todosMerge.merged);
          todosRef.current = todosMerge.merged;
          Storage.saveTodos(todosMerge.merged);
          Storage.markSynced(todosMerge.merged.map((t) => t.id), uid);
          todosMerge.newToUpload.forEach((t) => newUploadOps.push(syncTodoToCloud(uid, t)));
        }

        if (cloudData.goals !== null) {
          const goalsMerge = mergeRemoteGoals(goalsRef.current, cloudData.goals, synced, pendingGoals, true, deletions);
          setGoals(goalsMerge.merged);
          goalsRef.current = goalsMerge.merged;
          Storage.saveGoals(goalsMerge.merged);
          Storage.markSynced(goalsMerge.merged.map((g) => g.id), uid);
          goalsMerge.newToUpload.forEach((g) => newUploadOps.push(syncGoalToCloud(uid, g)));
        }

        if (cloudData.sleepLogs !== null) {
          const sleepMerge = mergeRemoteSleepLogs(sleepLogsRef.current, cloudData.sleepLogs, synced, pendingSleep, true, deletions);
          setSleepLogs(sleepMerge.merged);
          sleepLogsRef.current = sleepMerge.merged;
          Storage.saveSleepLogs(sleepMerge.merged);
          Storage.markSynced(sleepMerge.merged.map((s) => s.id), uid);
          sleepMerge.newToUpload.forEach((s) => newUploadOps.push(syncSleepLogToCloud(uid, s)));
        }

        if (cloudData.settings) {
          const mergedSettings: UserSettings = {
            ...INITIAL_SETTINGS,
            ...settingsRef.current,
            ...cloudData.settings,
            sleepSettings: {
              ...DEFAULT_SLEEP_SETTINGS,
              ...(settingsRef.current.sleepSettings || {}),
              ...(cloudData.settings.sleepSettings || {}),
            },
          };
          setSettings(mergedSettings);
          settingsRef.current = mergedSettings;
          Storage.saveSettings(mergedSettings);
        }

        if (newUploadOps.length > 0) {
          await Promise.allSettled(newUploadOps);
        }
      } else {
        // First-time cloud upload from local
        const currentHabits = Storage.getHabits();
        const currentCompletions = Storage.getCompletions();
        const currentTodos = Storage.getTodos();
        const currentGoals = Storage.getGoals();
        const currentSleepLogs = Storage.getSleepLogs();
        const currentSettings = Storage.getSettings();

        await syncAllLocalDataToCloud(
          uid,
          currentHabits,
          currentCompletions,
          currentTodos,
          currentSettings,
          currentGoals,
          currentSleepLogs
        );
      }

      setLastSyncedAt(new Date());
      broadcastLocalChange();

      showToast({
        type: 'success',
        title: 'Synced Across All Devices',
        message: 'Your sleep records, habits, to-dos, goals, and settings are up to date with Google Cloud.',
      });
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast({
        type: 'error',
        title: 'Sync Error',
        message: 'Could not connect to cloud server. Will retry automatically.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [showToast, broadcastLocalChange]);

  // Pull latest data from Gmail cloud
  const pullFromCloud = useCallback(async () => {
    if (!userRef.current) {
      showToast({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in with your Gmail account to restore your cloud data.',
      });
      return;
    }
    if (typeof window !== 'undefined' && !navigator.onLine) {
      showToast({
        type: 'info',
        title: 'Currently Offline',
        message: 'You are offline. Please connect to the internet to restore from cloud.',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const rawCloudData = await fetchAllCloudData(userRef.current.uid);
      if (rawCloudData) {
        await purgeCloudDemoItems(
          userRef.current.uid,
          rawCloudData.habits || [],
          rawCloudData.completions || [],
          rawCloudData.todos || [],
          rawCloudData.sleepLogs || []
        );

        const cleanHabits = filterCleanHabits(rawCloudData.habits || []);
        const cleanCompletions = filterCleanCompletions(rawCloudData.completions || []);
        const cleanTodos = filterCleanTodos(rawCloudData.todos || []);

        setHabits(cleanHabits);
        Storage.saveHabits(cleanHabits);

        setCompletions(cleanCompletions);
        Storage.saveCompletions(cleanCompletions);

        const sortedTodos = [...cleanTodos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setTodos(sortedTodos);
        Storage.saveTodos(sortedTodos);

        if (Array.isArray(rawCloudData.goals)) {
          setGoals(rawCloudData.goals);
          Storage.saveGoals(rawCloudData.goals);
        }

        if (Array.isArray(rawCloudData.sleepLogs)) {
          const cleanSleep = rawCloudData.sleepLogs.filter((s) => s && !s.id.startsWith('seed_sleep_'));
          const logsToSet = cleanSleep.length > 0 ? cleanSleep : rawCloudData.sleepLogs;
          setSleepLogs(logsToSet);
          sleepLogsRef.current = logsToSet;
          Storage.saveSleepLogs(logsToSet);
        }

        if (rawCloudData.settings) {
          setSettings(rawCloudData.settings);
          settingsRef.current = rawCloudData.settings;
          Storage.saveSettings(rawCloudData.settings);
        }

        Storage.markSynced(
          [
            ...cleanHabits.map((h) => h.id),
            ...cleanCompletions.map((c) => c.id),
            ...sortedTodos.map((t) => t.id),
            ...(Array.isArray(rawCloudData.goals) ? rawCloudData.goals.map((g) => g.id) : []),
            ...(Array.isArray(rawCloudData.sleepLogs) ? rawCloudData.sleepLogs.map((s) => s.id) : []),
          ],
          userRef.current.uid
        );

        showToast({
          type: 'success',
          title: 'Cloud Data Restored',
          message: 'Successfully pulled and restored your habits, goals, sleep records, and settings from your Gmail account!',
        });
      } else {
        showToast({
          type: 'info',
          title: 'No Cloud Data Found',
          message: 'No saved cloud records were found for this account.',
        });
      }
    } catch (err) {
      console.error('Pull from cloud error:', err);
      showToast({
        type: 'error',
        title: 'Restore Failed',
        message: 'Could not fetch data from the cloud.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

  // Sync theme
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const applyTheme = () => {
      if (settings.theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else if (settings.theme === 'light') {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      } else {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        if (media.matches) {
          root.classList.add('dark');
          root.style.colorScheme = 'dark';
        } else {
          root.classList.remove('dark');
          root.style.colorScheme = 'light';
        }
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  // Confetti celebration
  const triggerCelebration = useCallback(() => {
    if (typeof window === 'undefined' || !settings.animationsEnabled) return;
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#16a34a', '#eab308', '#ec4899', '#6366f1'],
      });
    } catch {
      // ignore
    }
  }, [settings.animationsEnabled]);

  // Local persistence helpers
  const persistHabits = useCallback((newHabits: Habit[]) => {
    setHabits(newHabits);
    Storage.saveHabits(newHabits);
    requestServiceWorkerBackgroundSync();
  }, [requestServiceWorkerBackgroundSync]);

  const persistCompletions = useCallback((newCompletions: HabitCompletion[]) => {
    setCompletions(newCompletions);
    Storage.saveCompletions(newCompletions);
    requestServiceWorkerBackgroundSync();
  }, [requestServiceWorkerBackgroundSync]);

  const persistTodos = useCallback((newTodos: Todo[]) => {
    setTodos(newTodos);
    Storage.saveTodos(newTodos);
    requestServiceWorkerBackgroundSync();
  }, [requestServiceWorkerBackgroundSync]);

  const persistSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    Storage.saveSettings(newSettings);
    requestServiceWorkerBackgroundSync();
  }, [requestServiceWorkerBackgroundSync]);

  // Navigation handlers
  const goToToday = useCallback(() => {
    setSelectedDate(getTodayKey());
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  // Dedicated helper for instant cloud push with status & cross-tab broadcast
  const syncToCloudNow = useCallback(
    (action: (uid: string) => Promise<any> | void) => {
      const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
      if (uid) {
        Promise.resolve(action(uid))
          .then(() => {
            setLastSyncedAt(new Date());
            broadcastLocalChange();
          })
          .catch((err) => {
            console.warn('Sync push error (preserved in pending queue):', err);
          });
      }
    },
    [broadcastLocalChange]
  );

  // HABIT OPERATIONS
  const createHabit = useCallback(
    (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!habitData.name.trim()) {
        return { success: false, error: 'Habit name cannot be empty.' };
      }

      const newHabit: Habit = {
        ...habitData,
        name: habitData.name.trim(),
        id: `habit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      Storage.unmarkDeleted(newHabit.id);
      const updated = [newHabit, ...habits];
      persistHabits(updated);

      syncToCloudNow((uid) => syncHabitToCloud(uid, newHabit));

      showToast({
        type: 'success',
        title: 'Habit Created',
        message: `"${newHabit.name}" has been added to your schedule.`,
      });
      return { success: true };
    },
    [habits, showToast, persistHabits, syncToCloudNow]
  );

  const updateHabit = useCallback(
    (id: string, updates: Partial<Habit>) => {
      if (updates.name !== undefined && !updates.name.trim()) {
        return { success: false, error: 'Habit name cannot be empty.' };
      }

      let modifiedHabit: Habit | null = null;
      const updated = habits.map((h) => {
        if (h.id === id) {
          modifiedHabit = {
            ...h,
            ...updates,
            name: updates.name !== undefined ? updates.name.trim() : h.name,
            updatedAt: new Date().toISOString(),
          };
          return modifiedHabit;
        }
        return h;
      });

      persistHabits(updated);

      if (modifiedHabit) {
        syncToCloudNow((uid) => syncHabitToCloud(uid, modifiedHabit!));
      }

      showToast({
        type: 'info',
        title: 'Habit Updated',
        message: 'Your habit changes have been saved.',
      });
      return { success: true };
    },
    [habits, showToast, persistHabits, syncToCloudNow]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      Storage.unmarkSynced(id);
      Storage.markDeleted(id);
      const target = habits.find((h) => h.id === id);
      const updated = habits.filter((h) => h.id !== id);
      const updatedCompletions = completions.filter((c) => c.habitId !== id);

      persistHabits(updated);
      persistCompletions(updatedCompletions);

      syncToCloudNow((uid) => deleteHabitFromCloud(uid, id));

      showToast({
        type: 'info',
        title: 'Habit Deleted',
        message: target ? `"${target.name}" was removed.` : 'Habit removed.',
      });
    },
    [habits, completions, showToast, persistHabits, persistCompletions, syncToCloudNow]
  );

  const togglePauseHabit = useCallback(
    (id: string) => {
      const target = habits.find((h) => h.id === id);
      if (!target) return;
      const nextStatus: 'active' | 'paused' = target.status === 'active' ? 'paused' : 'active';
      let modified: Habit | null = null;
      const updated = habits.map((h) => {
        if (h.id === id) {
          modified = { ...h, status: nextStatus, updatedAt: new Date().toISOString() };
          return modified;
        }
        return h;
      });
      persistHabits(updated);

      if (modified) {
        syncToCloudNow((uid) => syncHabitToCloud(uid, modified!));
      }

      showToast({
        type: 'info',
        title: nextStatus === 'paused' ? 'Habit Paused' : 'Habit Resumed',
        message: `"${target.name}" is now ${nextStatus}.`,
      });
    },
    [habits, showToast, persistHabits, syncToCloudNow]
  );

  const toggleHabitCompletion = useCallback(
    (habitId: string, dateKey: string = selectedDate) => {
      const existing = completions.find((c) => c.habitId === habitId && c.date === dateKey);

      let newCompletions: HabitCompletion[];
      if (existing) {
        // Toggle OFF
        Storage.unmarkSynced(existing.id);
        Storage.markDeleted(existing.id);
        newCompletions = completions.filter((c) => c.id !== existing.id);
        persistCompletions(newCompletions);

        syncToCloudNow((uid) => deleteCompletionFromCloud(uid, existing.id));
      } else {
        // Toggle ON
        const newCompletion: HabitCompletion = {
          id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          habitId,
          date: dateKey,
          completedAt: new Date().toISOString(),
        };
        Storage.unmarkDeleted(newCompletion.id);
        newCompletions = [...completions, newCompletion];
        persistCompletions(newCompletions);

        syncToCloudNow((uid) => syncCompletionToCloud(uid, newCompletion));

        const prog = calculateDayProgress(dateKey, habits, newCompletions, todos);
        if (prog.isFullyCompleted) {
          triggerCelebration();
          showToast({
            type: 'success',
            title: 'Day Complete! 🎉',
            message: 'All scheduled habits and to-dos for today are done!',
          });
        }
      }
    },
    [habits, completions, todos, selectedDate, triggerCelebration, showToast, persistCompletions, syncToCloudNow]
  );

  const getHabitStreakInfo = useCallback(
    (habit: Habit) => {
      return calculateHabitStreak(habit, completions, getTodayKey());
    },
    [completions]
  );

  // CONVERT HABIT TO TO-DO / TASK
  const convertHabitToTodo = useCallback(
    (habitId: string, targetDate: string = selectedDate) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;

      const dateTodos = todos.filter((t) => t.date === targetDate);
      const maxOrder = dateTodos.reduce((max, t) => Math.max(max, t.order ?? 0), -1);

      const newTodo: Todo = {
        id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: habit.name,
        date: targetDate,
        priority: 'medium',
        dueTime: habit.reminderTime || undefined,
        notes: habit.description ? `From habit: ${habit.description}` : `From recurring habit: ${habit.name}`,
        completed: false,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [newTodo, ...todos];
      persistTodos(updated);

      syncToCloudNow((uid) => syncTodoToCloud(uid, newTodo));

      showToast({
        type: 'success',
        title: 'Added to To-Dos',
        message: `"${habit.name}" was added to your task list for ${targetDate === getTodayKey() ? 'Today' : targetDate}.`,
      });
    },
    [habits, todos, selectedDate, showToast, persistTodos, syncToCloudNow]
  );

  // TODO OPERATIONS
  const createTodo = useCallback(
    (todoData: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
      if (!todoData.title.trim()) {
        return { success: false, error: 'To-Do title cannot be empty.' };
      }

      const dateTodos = todos.filter((t) => t.date === todoData.date);
      const maxOrder = dateTodos.reduce((max, t) => Math.max(max, t.order ?? 0), -1);

      const newTodo: Todo = {
        ...todoData,
        title: todoData.title.trim(),
        id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      Storage.unmarkDeleted(newTodo.id);
      const updated = [newTodo, ...todos];
      persistTodos(updated);

      syncToCloudNow((uid) => syncTodoToCloud(uid, newTodo));

      showToast({
        type: 'success',
        title: 'To-Do Added',
        message: `"${newTodo.title}" added to ${todoData.date === getTodayKey() ? 'Today' : todoData.date}.`,
      });
      return { success: true };
    },
    [todos, showToast, persistTodos, syncToCloudNow]
  );

  const updateTodo = useCallback(
    (id: string, updates: Partial<Todo>) => {
      if (updates.title !== undefined && !updates.title.trim()) {
        return { success: false, error: 'To-Do title cannot be empty.' };
      }

      let modified: Todo | null = null;
      const updated = todos.map((t) => {
        if (t.id === id) {
          modified = {
            ...t,
            ...updates,
            title: updates.title !== undefined ? updates.title.trim() : t.title,
            updatedAt: new Date().toISOString(),
          };
          return modified;
        }
        return t;
      });

      persistTodos(updated);

      if (modified) {
        syncToCloudNow((uid) => syncTodoToCloud(uid, modified!));
      }

      showToast({
        type: 'info',
        title: 'To-Do Updated',
        message: 'Your task has been updated.',
      });
      return { success: true };
    },
    [todos, showToast, persistTodos, syncToCloudNow]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      Storage.unmarkSynced(id);
      Storage.markDeleted(id);
      const target = todos.find((t) => t.id === id);
      const updated = todos.filter((t) => t.id !== id);
      persistTodos(updated);

      syncToCloudNow((uid) => deleteTodoFromCloud(uid, id));

      showToast({
        type: 'info',
        title: 'To-Do Removed',
        message: target ? `"${target.title}" was deleted.` : 'Task deleted.',
      });
    },
    [todos, showToast, persistTodos, syncToCloudNow]
  );

  const toggleTodoCompletion = useCallback(
    (id: string) => {
      const target = todos.find((t) => t.id === id);
      if (!target) return;
      const nextCompleted = !target.completed;

      let modified: Todo | null = null;
      const updated = todos.map((t) => {
        if (t.id === id) {
          modified = { ...t, completed: nextCompleted, updatedAt: new Date().toISOString() };
          return modified;
        }
        return t;
      });
      persistTodos(updated);

      if (modified) {
        syncToCloudNow((uid) => syncTodoToCloud(uid, modified!));
      }

      if (nextCompleted) {
        const prog = calculateDayProgress(target.date, habits, completions, updated);
        if (prog.isFullyCompleted) {
          triggerCelebration();
          showToast({
            type: 'success',
            title: 'Day Complete! 🎉',
            message: 'All tasks and scheduled habits are finished!',
          });
        }
      }
    },
    [todos, habits, completions, triggerCelebration, showToast, persistTodos, syncToCloudNow]
  );

  const reorderTodos = useCallback(
    (dateKey: string, sourceIndex: number, destIndex: number) => {
      const dateTodos = todos.filter((t) => t.date === dateKey).sort((a, b) => a.order - b.order);
      const [moved] = dateTodos.splice(sourceIndex, 1);
      if (!moved) return;
      dateTodos.splice(destIndex, 0, moved);

      const updatedDateTodos = dateTodos.map((t, idx) => ({ ...t, order: idx }));
      const otherTodos = todos.filter((t) => t.date !== dateKey);
      const fullList = [...otherTodos, ...updatedDateTodos];
      persistTodos(fullList);

      syncToCloudNow(async (uid) => {
        for (const t of updatedDateTodos) {
          await syncTodoToCloud(uid, t);
        }
      });
    },
    [todos, persistTodos, syncToCloudNow]
  );

  const getTodosForDate = useCallback(
    (dateKey: string) => {
      return todos
        .filter((t) => t.date === dateKey)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    [todos]
  );

  // GOALS & ROADMAP OPERATIONS
  const createGoal = useCallback(
    (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'progress'>) => {
      try {
        const id = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();
        const progress = calculateGoalProgress({ milestones: goalData.milestones || [] });
        const newGoal: Goal = {
          ...goalData,
          id,
          progress,
          createdAt: now,
          updatedAt: now,
        };

        Storage.unmarkDeleted(id);
        const updated = [newGoal, ...goals];
        persistGoals(updated);

        syncToCloudNow((uid) => syncGoalToCloud(uid, newGoal));

        showToast({
          type: 'success',
          title: 'Goal Created',
          message: `"${newGoal.title}" roadmap is active!`,
        });

        return { success: true, goal: newGoal };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create goal' };
      }
    },
    [goals, persistGoals, showToast, syncToCloudNow]
  );

  const createGoalSimple = useCallback(
    async (
      name: string,
      deadline: string,
      category: string = 'Study',
      description?: string,
      timeHorizon: GoalTimeHorizon = '3_months'
    ) => {
      const milestones = generateInstantAutoPlan(name, deadline, category, description);
      const res = createGoal({
        title: name,
        description: description || '',
        category: category || 'Study',
        priority: 'high',
        startDate: getTodayKey(),
        deadline: deadline,
        targetDate: deadline,
        status: 'in_progress',
        durationType: timeHorizon,
        timeHorizon,
        measurementType: 'percentage',
        targetValue: 100,
        currentValue: 0,
        plannedProgress: 0,
        actualProgress: 0,
        progressDifference: 0,
        bufferPreference: 'normal',
        bufferDays: 3,
        milestones,
        relatedTasks: [],
        relatedHabits: [],
        relatedTrackers: [],
      });
      return res.goal!;
    },
    [createGoal]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => {
      try {
        let modifiedGoal: Goal | null = null;
        const updated = goals.map((g) => {
          if (g.id !== id) return g;
          const merged: Goal = {
            ...g,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          merged.progress = calculateGoalProgress(merged);
          merged.status = determineGoalStatus(merged, getTodayKey());
          modifiedGoal = merged;
          return merged;
        });

        persistGoals(updated);

        if (modifiedGoal) {
          syncToCloudNow((uid) => syncGoalToCloud(uid, modifiedGoal!));
        }

        showToast({
          type: 'success',
          title: 'Goal Updated',
          message: 'Changes saved.',
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update goal' };
      }
    },
    [goals, persistGoals, showToast, syncToCloudNow]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      Storage.unmarkSynced(id);
      Storage.markDeleted(id);
      const target = goals.find((g) => g.id === id);
      const updated = goals.filter((g) => g.id !== id);
      persistGoals(updated);

      syncToCloudNow((uid) => deleteGoalFromCloud(uid, id));

      showToast({
        type: 'info',
        title: 'Goal Removed',
        message: target ? `"${target.title}" was deleted.` : undefined,
      });
    },
    [goals, persistGoals, showToast, syncToCloudNow]
  );

  const toggleGoalTask = useCallback(
    (goalId: string, milestoneId: string, taskId: string) => {
      const { updatedGoals, updatedGoal, taskTitle, completed } = toggleTaskInGoal(
        goals,
        goalId,
        milestoneId,
        taskId
      );

      persistGoals(updatedGoals);

      if (updatedGoal) {
        syncToCloudNow((uid) => syncGoalToCloud(uid, updatedGoal!));
      }

      if (completed) {
        triggerCelebration();
      }

      showToast({
        type: 'success',
        title: completed ? 'Task Completed' : 'Task Incomplete',
        message: taskTitle ? `"${taskTitle}" updated.` : undefined,
      });
    },
    [goals, persistGoals, showToast, triggerCelebration, syncToCloudNow]
  );

  const toggleGoalMilestone = useCallback(
    (goalId: string, milestoneId: string) => {
      const { updatedGoals, updatedGoal, milestoneTitle, completed } = toggleMilestoneInGoal(
        goals,
        goalId,
        milestoneId
      );

      persistGoals(updatedGoals);

      if (updatedGoal) {
        syncToCloudNow((uid) => syncGoalToCloud(uid, updatedGoal!));
      }

      if (completed) {
        triggerCelebration();
      }

      showToast({
        type: 'success',
        title: completed ? 'Milestone Completed!' : 'Milestone Reopened',
        message: milestoneTitle ? `"${milestoneTitle}" updated.` : undefined,
      });
    },
    [goals, persistGoals, showToast, triggerCelebration, syncToCloudNow]
  );

  const toggleGoalChapter = useCallback(
    (goalId: string, chapterId: string) => {
      const { updatedGoals, updatedGoal, chapterTitle, completed } = toggleChapterInGoal(
        goals,
        goalId,
        chapterId
      );

      persistGoals(updatedGoals);

      if (updatedGoal) {
        syncToCloudNow((uid) => syncGoalToCloud(uid, updatedGoal!));
      }

      if (completed) {
        triggerCelebration();
      }

      showToast({
        type: 'success',
        title: completed ? 'Chapter Completed! 🎉' : 'Chapter Reopened',
        message: chapterTitle ? `"${chapterTitle}" progress recorded.` : undefined,
      });
    },
    [goals, persistGoals, showToast, triggerCelebration, syncToCloudNow]
  );

  const updateGoalChapterDays = useCallback(
    (goalId: string, chapterId: string, days: number) => {
      const { updatedGoals, updatedGoal } = updateChapterInGoal(goals, goalId, chapterId, {
        assignedDays: Math.max(1, Math.min(60, days)),
      });

      persistGoals(updatedGoals);

      if (updatedGoal) {
        syncToCloudNow((uid) => syncGoalToCloud(uid, updatedGoal!));
      }

      showToast({
        type: 'info',
        title: 'Timeline Recalibrated',
        message: `Chapter schedule updated to ${days} days.`,
      });
    },
    [goals, persistGoals, showToast, syncToCloudNow]
  );

  const toggleGoalChapterTask = useCallback(
    (goalId: string, chapterId: string, taskId: string) => {
      const { updatedGoals, updatedGoal, taskTitle, completed } = toggleChapterTaskInGoal(
        goals,
        goalId,
        chapterId,
        taskId
      );

      persistGoals(updatedGoals);

      if (updatedGoal) {
        syncToCloudNow((uid) => syncGoalToCloud(uid, updatedGoal!));
      }

      if (completed) {
        triggerCelebration();
      }

      showToast({
        type: 'success',
        title: completed ? 'Task Completed!' : 'Task Reopened',
        message: taskTitle ? `"${taskTitle}" updated.` : undefined,
      });
    },
    [goals, persistGoals, showToast, triggerCelebration, syncToCloudNow]
  );

  const quickAddTarget = useCallback(
    (goalId: string, targetTitle: string, monthLabel?: string) => {
      if (!targetTitle.trim()) return;
      const targetGoal = goals.find((g) => g.id === goalId);
      if (!targetGoal) return;

      const newMilestone = {
        id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: targetTitle.trim(),
        month: monthLabel || 'Current Month',
        week: 'This Week',
        deadline: targetGoal.targetDate || getTodayKey(),
        status: 'not_started' as const,
        progress: 0,
        tasks: [
          {
            id: `gt_${Date.now()}_1`,
            title: `Execute initial step for ${targetTitle.trim()}`,
            completed: false,
            priority: 1 as const,
          },
        ],
      };

      const updatedMilestones = [...(targetGoal.milestones || []), newMilestone];
      updateGoal(goalId, { milestones: updatedMilestones });

      showToast({
        type: 'success',
        title: 'Target Added',
        message: `Added target to "${targetGoal.title}".`,
      });
    },
    [goals, updateGoal, showToast]
  );

  const quickAddTask = useCallback(
    (goalId: string, milestoneId: string, taskTitle: string, priority: 1 | 2 | 3 = 1) => {
      if (!taskTitle.trim()) return;
      const targetGoal = goals.find((g) => g.id === goalId);
      if (!targetGoal) return;

      const updatedMilestones = (targetGoal.milestones || []).map((m) => {
        if (m.id !== milestoneId) return m;
        const newTask = {
          id: `gt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: taskTitle.trim(),
          completed: false,
          priority: priority as any,
        };
        const tasks = [...(m.tasks || []), newTask];
        return {
          ...m,
          tasks,
        };
      });

      updateGoal(goalId, { milestones: updatedMilestones });

      showToast({
        type: 'success',
        title: 'Task Added',
        message: `Added task "${taskTitle.trim()}".`,
      });
    },
    [goals, updateGoal, showToast]
  );

  const replanGoalSchedule = useCallback(
    (goalId: string) => {
      const targetGoal = goals.find((g) => g.id === goalId);
      if (!targetGoal) return;

      const todayKey = getTodayKey();
      const targetDate = targetGoal.targetDate || todayKey;
      const daysRemaining = Math.max(
        1,
        Math.round((new Date(targetDate).getTime() - new Date(todayKey).getTime()) / (1000 * 60 * 60 * 24))
      );

      const replan = generateLocalReplan(
        targetGoal,
        'Recalibrated pacing for target date',
        daysRemaining
      );

      updateGoal(goalId, {
        milestones: replan.adjustedMilestones,
        status: replan.revisedStatus,
      });

      showToast({
        type: 'info',
        title: 'Pacing Recalibrated',
        message: `Adjusted milestone deadlines across remaining ${daysRemaining} days.`,
      });
    },
    [goals, updateGoal, showToast]
  );

  const applyAIPlan = useCallback(
    (plan: AIPlanGeneratedResult, createTasks: boolean = true, createHabits: boolean = true) => {
      const newMilestones = (plan.milestones || []).map((m, idx) => ({
        id: m.id || `ms_${Date.now()}_${idx}`,
        title: m.title,
        description: m.description,
        month: plan.monthlyTargets?.[idx] || 'Month 1',
        week: plan.weeklyTargets?.[idx] || 'Week 1',
        deadline: m.deadline || plan.targetDate,
        status: m.status || (idx === 0 ? 'in_progress' : 'not_started'),
        progress: m.progress || 0,
        tasks: [
          {
            id: `gt_${Date.now()}_${idx}_1`,
            title: `Execute foundational phase for ${m.title}`,
            completed: false,
            priority: 1 as const,
          },
        ],
      }));

      createGoal({
        title: plan.title,
        description: plan.description,
        category: plan.category || 'Study',
        priority: 'high',
        startDate: getTodayKey(),
        deadline: plan.targetDate || addDays(getTodayKey(), 90),
        targetDate: plan.targetDate || addDays(getTodayKey(), 90),
        status: 'in_progress',
        durationType: plan.timeHorizon || '3_months',
        timeHorizon: plan.timeHorizon || '3_months',
        measurementType: plan.measurementType || 'percentage',
        targetValue: plan.targetValue || 100,
        currentValue: plan.currentValue || 0,
        plannedProgress: 0,
        actualProgress: 0,
        progressDifference: 0,
        bufferPreference: 'normal',
        bufferDays: 3,
        unit: plan.unit,
        milestones: newMilestones,
        relatedTasks: [],
        relatedHabits: [],
        relatedTrackers: (plan.suggestedTrackers || []).map((t, tIdx) => ({
          id: `trk_${Date.now()}_${tIdx}`,
          type: t.type,
          name: t.name,
          target: t.target,
          current: t.current,
          unit: t.unit,
        })),
        academicMetadata: plan.academicMetadata,
        notes: plan.strategicAdvice,
      });

      // Optionally auto-create suggested tasks as todos
      if (createTasks && plan.suggestedTasks && plan.suggestedTasks.length > 0) {
        const today = getTodayKey();
        plan.suggestedTasks.slice(0, 5).forEach((taskTitle, idx) => {
          createTodo({
            title: taskTitle,
            date: addDays(today, idx),
            priority: 'high',
            completed: false,
          });
        });
      }

      // Optionally auto-create suggested habits
      if (createHabits && plan.suggestedHabits && plan.suggestedHabits.length > 0) {
        plan.suggestedHabits.slice(0, 3).forEach((sh) => {
          createHabit({
            name: sh.name,
            icon: sh.icon || 'Sparkles',
            color: sh.color || '#0284c7',
            frequency: sh.frequency || 'daily',
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startDate: getTodayKey(),
            status: 'active',
            category: sh.category || plan.category,
          });
        });
      }

      showToast({
        type: 'success',
        title: 'AI Roadmap Adopted',
        message: `"${plan.title}" added to your Life OS.`,
      });
    },
    [createGoal, createTodo, createHabit, showToast]
  );

  const applyAIReplan = useCallback(
    (goalId: string, replanResult: AIReplanGeneratedResult) => {
      updateGoal(goalId, {
        milestones: replanResult.adjustedMilestones,
        status: replanResult.revisedStatus,
      });

      showToast({
        type: 'success',
        title: 'Schedule Adjusted',
        message: replanResult.pacingSummary || 'Adjusted milestones applied.',
      });
    },
    [updateGoal, showToast]
  );

  // SLEEP TRACKER OPERATIONS
  const addSleepLog = useCallback(
    async (logData: Omit<SleepLog, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = `sleep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const durationMinutes =
        logData.durationMinutes || calculateSleepDuration(logData.bedtime, logData.wakeTime);
      const efficiencyScore =
        logData.efficiencyScore ||
        calculateSleepEfficiency(
          durationMinutes,
          logData.awakeningsCount,
          logData.timeToFallAsleepMinutes
        );
      const deepSleepMinutes = logData.deepSleepMinutes || Math.round(durationMinutes * 0.22);
      const remSleepMinutes = logData.remSleepMinutes || Math.round(durationMinutes * 0.23);
      const lightSleepMinutes =
        logData.lightSleepMinutes ||
        Math.max(0, durationMinutes - deepSleepMinutes - remSleepMinutes);

      const newLog: SleepLog = {
        ...logData,
        id,
        durationMinutes,
        efficiencyScore,
        deepSleepMinutes,
        remSleepMinutes,
        lightSleepMinutes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      Storage.unmarkDeleted(newLog.id);
      const filtered = sleepLogs.filter((l) => l.id !== newLog.id && l.date !== newLog.date);
      const updated = [newLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      persistSleepLogs(updated);

      syncToCloudNow((uid) => syncSleepLogToCloud(uid, newLog));

      showToast({
        type: 'success',
        title: 'Sleep Logged',
        message: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m recorded for ${newLog.date}.`,
      });
      return newLog;
    },
    [sleepLogs, persistSleepLogs, syncToCloudNow, showToast]
  );

  const updateSleepLog = useCallback(
    async (id: string, updates: Partial<SleepLog>) => {
      const existing = sleepLogs.find((l) => l.id === id);
      if (!existing) return;

      Storage.unmarkDeleted(id);

      const bedtime = updates.bedtime || existing.bedtime;
      const wakeTime = updates.wakeTime || existing.wakeTime;
      const durationMinutes = updates.durationMinutes || calculateSleepDuration(bedtime, wakeTime);

      // If this was an initial seed sleep log, promote it to a real user sleep ID so it persists permanently
      const isSeed = id.startsWith('seed_sleep_');
      const promotedId = isSeed
        ? `sleep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        : id;

      const updatedLog: SleepLog = {
        ...existing,
        ...updates,
        id: promotedId,
        durationMinutes,
        updatedAt: new Date().toISOString(),
      };

      const updatedList = sleepLogs
        .map((l) => (l.id === id ? updatedLog : l))
        .sort((a, b) => b.date.localeCompare(a.date));
      persistSleepLogs(updatedList);

      syncToCloudNow(async (uid) => {
        if (isSeed) {
          await deleteSleepLogFromCloud(uid, id, false).catch(() => {});
        }
        await syncSleepLogToCloud(uid, updatedLog);
      });

      showToast({
        type: 'info',
        title: 'Sleep Record Updated',
        message: `Sleep log for ${updatedLog.date} has been updated.`,
      });
    },
    [sleepLogs, persistSleepLogs, syncToCloudNow, showToast]
  );

  const deleteSleepLog = useCallback(
    async (id: string) => {
      Storage.unmarkSynced(id);
      Storage.markDeleted(id);
      const target = sleepLogs.find((l) => l.id === id);
      const updated = sleepLogs.filter((l) => l.id !== id);
      persistSleepLogs(updated);

      syncToCloudNow((uid) => deleteSleepLogFromCloud(uid, id));

      showToast({
        type: 'info',
        title: 'Sleep Log Deleted',
        message: target ? `Sleep entry for ${target.date} removed.` : 'Sleep entry removed.',
      });
    },
    [sleepLogs, persistSleepLogs, syncToCloudNow, showToast]
  );

  const startSleepSession = useCallback(() => {
    const session: ActiveSleepSession = {
      startTime: new Date().toISOString(),
      targetWakeTime: settings.sleepSettings?.targetWakeTime || DEFAULT_SLEEP_SETTINGS.targetWakeTime,
    };
    setActiveSleepSession(session);
    Storage.saveActiveSleepSession(session);
    showToast({
      type: 'info',
      title: 'Sleep Session Started',
      message: 'Ambient night mode active. Sleep well!',
    });
  }, [settings.sleepSettings, showToast]);

  const stopSleepSessionAndLog = useCallback(
    async (
      quality: SleepQuality = 4,
      factors: string[] = [],
      notes = '',
      mood: WakeMood = 'refreshed'
    ): Promise<SleepLog | null> => {
      if (!activeSleepSession) return null;
      const now = new Date();
      const startDate = new Date(activeSleepSession.startTime);
      const durationMinutes = Math.max(10, Math.round((now.getTime() - startDate.getTime()) / 60000));

      const bedHours = String(startDate.getHours()).padStart(2, '0');
      const bedMins = String(startDate.getMinutes()).padStart(2, '0');
      const wakeHours = String(now.getHours()).padStart(2, '0');
      const wakeMins = String(now.getMinutes()).padStart(2, '0');

      const dateKey = getTodayKey();
      const newLog = await addSleepLog({
        date: dateKey,
        bedtime: `${bedHours}:${bedMins}`,
        wakeTime: `${wakeHours}:${wakeMins}`,
        durationMinutes,
        qualityRating: quality,
        wakeMood: mood,
        factors,
        notes: notes || activeSleepSession.notes,
        source: 'timer',
      });

      setActiveSleepSession(null);
      Storage.clearActiveSleepSession();
      return newLog;
    },
    [activeSleepSession, addSleepLog]
  );

  const cancelSleepSession = useCallback(() => {
    setActiveSleepSession(null);
    Storage.clearActiveSleepSession();
    showToast({
      type: 'info',
      title: 'Sleep Session Cancelled',
    });
  }, [showToast]);

  const updateSleepSettings = useCallback(
    (newSettings: Partial<SleepSettings>) => {
      const current = settingsRef.current || settings;
      const mergedSettings: SleepSettings = {
        ...(current.sleepSettings || DEFAULT_SLEEP_SETTINGS),
        ...newSettings,
      };
      const updatedUser: UserSettings = {
        ...current,
        sleepSettings: mergedSettings,
      };
      persistSettings(updatedUser);
      syncToCloudNow((uid) => syncSettingsToCloud(uid, updatedUser));
      showToast({
        type: 'success',
        title: 'Sleep Target Saved',
        message: `Target set to ${mergedSettings.targetHours}h per night.`,
      });
    },
    [settings, persistSettings, syncToCloudNow, showToast]
  );

  const sleepAnalytics = useMemo(() => {
    return calculateSleepAnalytics(
      sleepLogs,
      settings.sleepSettings || DEFAULT_SLEEP_SETTINGS,
      completions,
      habits
    );
  }, [sleepLogs, settings.sleepSettings, completions, habits]);

  // PROGRESS & STREAKS
  const getDayProgress = useCallback(
    (dateKey: string) => {
      return calculateDayProgress(dateKey, habits, completions, todos);
    },
    [habits, completions, todos]
  );

  const todayKey = getTodayKey();

  const todayProgress = useMemo(() => {
    return calculateDayProgress(todayKey, habits, completions, todos);
  }, [todayKey, habits, completions, todos]);

  const selectedDateProgress = useMemo(() => {
    return calculateDayProgress(selectedDate, habits, completions, todos);
  }, [selectedDate, habits, completions, todos]);

  const overallStreaks = useMemo(() => {
    return calculateOverallStreaks(habits, completions, todos, todayKey);
  }, [habits, completions, todos, todayKey]);

  // SETTINGS & STORAGE
  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      const updated = { ...settings, ...updates };
      persistSettings(updated);

      syncToCloudNow((uid) => syncSettingsToCloud(uid, updated));

      showToast({
        type: 'info',
        title: 'Settings Saved',
        message: 'Your preferences have been updated.',
      });
    },
    [settings, showToast, persistSettings, syncToCloudNow]
  );

  const resetDataToDefaults = useCallback(() => {
    const seed = Storage.resetToSeed();
    const seedSleep = Storage.getSleepLogs();
    setHabits(seed.habits);
    setCompletions(seed.completions);
    setTodos(seed.todos);
    setSettings(seed.settings);
    setGoals([]);
    setSleepLogs(seedSleep);
    setActiveSleepSession(null);
    Storage.saveGoals([]);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      uploadInitialDataToCloud(
        userRef.current.uid,
        seed.habits,
        seed.completions,
        seed.todos,
        seed.settings,
        [],
        seedSleep
      );
    }

    showToast({
      type: 'success',
      title: 'Reset Completed',
      message: 'Sample starter habits and tasks have been restored.',
    });
  }, [showToast]);

  const clearData = useCallback(() => {
    Storage.clearAllData();
    setHabits([]);
    setCompletions([]);
    setTodos([]);
    setGoals([]);
    setSleepLogs([]);
    setActiveSleepSession(null);
    setSettings(INITIAL_SETTINGS);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      habits.forEach((h) => deleteHabitFromCloud(userRef.current!.uid, h.id));
      completions.forEach((c) => deleteCompletionFromCloud(userRef.current!.uid, c.id));
      todos.forEach((t) => deleteTodoFromCloud(userRef.current!.uid, t.id));
      goals.forEach((g) => deleteGoalFromCloud(userRef.current!.uid, g.id));
      sleepLogs.forEach((s) => deleteSleepLogFromCloud(userRef.current!.uid, s.id));
    }

    showToast({
      type: 'warning',
      title: 'Data Cleared',
      message: 'All habits, to-dos, goals, and sleep records have been cleared.',
    });
  }, [habits, completions, todos, goals, sleepLogs, showToast]);

  const exportDataJson = useCallback(() => {
    return Storage.exportBackupJson();
  }, []);

  const importDataJson = useCallback(
    (json: string) => {
      const success = Storage.importBackupJson(json);
      if (success) {
        const loadedHabits = Storage.getHabits();
        const loadedCompletions = Storage.getCompletions();
        const loadedTodos = Storage.getTodos();
        const loadedGoals = Storage.getGoals();
        const loadedSettings = Storage.getSettings();

        setHabits(loadedHabits);
        setCompletions(loadedCompletions);
        setTodos(loadedTodos);
        setGoals(loadedGoals);
        setSettings(loadedSettings);

        if (userRef.current) {
          uploadInitialDataToCloud(
            userRef.current.uid,
            loadedHabits,
            loadedCompletions,
            loadedTodos,
            loadedSettings,
            loadedGoals
          );
        }

        showToast({
          type: 'success',
          title: 'Import Successful',
          message: 'Your data has been restored from backup.',
        });
        return true;
      } else {
        showToast({
          type: 'error',
          title: 'Import Failed',
          message: 'Invalid backup file format.',
        });
        return false;
      }
    },
    [showToast]
  );

  // ==========================================
  // SAVINGS OPERATIONS
  // ==========================================

  const createSavingsGoal = useCallback(
    (goalInput: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt' | 'currentAmount'> & { initialDeposit?: number }) => {
      const { initialDeposit, ...goalData } = goalInput;
      if (!goalData.name || !goalData.name.trim()) {
        return { success: false, error: 'Goal name is required' };
      }
      if (goalData.targetAmount <= 0) {
        return { success: false, error: 'Target amount must be greater than 0' };
      }

      const id = `goal_sav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const depositAmount = Math.max(0, Number(initialDeposit) || 0);

      const newGoal: SavingsGoal = {
        ...goalData,
        id,
        currentAmount: depositAmount,
        createdAt: now,
        updatedAt: now,
      };

      const updatedGoals = [...savingsGoalsRef.current, newGoal];
      persistSavingsGoals(updatedGoals);
      savingsGoalsRef.current = updatedGoals;

      syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, newGoal));

      if (depositAmount > 0) {
        const txId = `tx_sav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const initialTx: SavingsTransaction = {
          id: txId,
          type: 'deposit',
          amount: depositAmount,
          date: getTodayKey(),
          goalId: id,
          category: 'Salary',
          notes: `Initial opening deposit for "${newGoal.name}"`,
          createdAt: now,
          updatedAt: now,
        };
        const updatedTx = [initialTx, ...savingsTransactionsRef.current];
        persistSavingsTransactions(updatedTx);
        savingsTransactionsRef.current = updatedTx;
        syncToCloudNow((uid) => syncSavingsTransactionToCloud(uid, initialTx));
      }

      showToast({
        type: 'success',
        title: 'Savings Goal Created',
        message: `Target "${newGoal.name}" established with ${formatCurrency(newGoal.targetAmount, savingsSettings.currency)} goal.`,
      });

      return { success: true, goal: newGoal };
    },
    [persistSavingsGoals, persistSavingsTransactions, savingsSettings.currency, showToast, syncToCloudNow]
  );

  const updateSavingsGoal = useCallback(
    (id: string, updates: Partial<SavingsGoal>) => {
      const existing = savingsGoalsRef.current.find((g) => g.id === id);
      if (!existing) return { success: false, error: 'Goal not found' };

      Storage.unmarkDeleted(id);
      const now = new Date().toISOString();
      const updatedGoal: SavingsGoal = {
        ...existing,
        ...updates,
        id,
        updatedAt: now,
      };

      const updatedList = savingsGoalsRef.current.map((g) => (g.id === id ? updatedGoal : g));
      persistSavingsGoals(updatedList);
      savingsGoalsRef.current = updatedList;

      syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, updatedGoal));

      showToast({
        type: 'info',
        title: 'Goal Updated',
        message: `"${updatedGoal.name}" updated successfully.`,
      });

      return { success: true };
    },
    [persistSavingsGoals, showToast, syncToCloudNow]
  );

  const deleteSavingsGoal = useCallback(
    (id: string, reallocateToGeneral = true) => {
      const existing = savingsGoalsRef.current.find((g) => g.id === id);
      if (!existing) return;

      Storage.unmarkSynced(id);
      Storage.markDeleted(id);

      const updatedGoals = savingsGoalsRef.current.filter((g) => g.id !== id);
      persistSavingsGoals(updatedGoals);
      savingsGoalsRef.current = updatedGoals;

      syncToCloudNow((uid) => deleteSavingsGoalFromCloud(uid, id));

      if (reallocateToGeneral) {
        let hasChanges = false;
        const now = new Date().toISOString();
        const updatedTx = savingsTransactionsRef.current.map((t) => {
          if (t.goalId === id) {
            hasChanges = true;
            const updated = {
              ...t,
              goalId: null,
              notes: `${t.notes || ''} (reallocated from deleted goal "${existing.name}")`.trim(),
              updatedAt: now,
            };
            syncToCloudNow((uid) => syncSavingsTransactionToCloud(uid, updated));
            return updated;
          }
          return t;
        });

        if (hasChanges) {
          persistSavingsTransactions(updatedTx);
          savingsTransactionsRef.current = updatedTx;
        }
      }

      showToast({
        type: 'info',
        title: 'Goal Removed',
        message: `Savings target "${existing.name}" removed.${reallocateToGeneral ? ' Allocated funds returned to General Savings.' : ''}`,
      });
    },
    [persistSavingsGoals, persistSavingsTransactions, showToast, syncToCloudNow]
  );

  const addSavingsTransaction = useCallback(
    (txInput: Omit<SavingsTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!txInput.amount || txInput.amount <= 0) {
        return { success: false, error: 'Transaction amount must be greater than 0' };
      }

      const id = `tx_sav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newTx: SavingsTransaction = {
        ...txInput,
        id,
        createdAt: now,
        updatedAt: now,
      };

      const updatedTx = [newTx, ...savingsTransactionsRef.current].sort((a, b) => b.date.localeCompare(a.date));
      persistSavingsTransactions(updatedTx);
      savingsTransactionsRef.current = updatedTx;

      if (newTx.goalId && newTx.goalId !== 'general') {
        const targetGoal = savingsGoalsRef.current.find((g) => g.id === newTx.goalId);
        if (targetGoal) {
          let updatedAmount = targetGoal.currentAmount;
          if (newTx.type === 'deposit') {
            updatedAmount += newTx.amount;
          } else if (newTx.type === 'withdrawal') {
            updatedAmount = Math.max(0, updatedAmount - newTx.amount);
          }
          const updatedGoal = { ...targetGoal, currentAmount: updatedAmount, updatedAt: now };
          const updatedGoals = savingsGoalsRef.current.map((g) => (g.id === targetGoal.id ? updatedGoal : g));
          persistSavingsGoals(updatedGoals);
          savingsGoalsRef.current = updatedGoals;
          syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, updatedGoal));
        }
      }

      syncToCloudNow((uid) => syncSavingsTransactionToCloud(uid, newTx));

      showToast({
        type: 'success',
        title: newTx.type === 'deposit' ? 'Money Saved' : 'Withdrawal Logged',
        message: `${formatCurrency(newTx.amount, savingsSettings.currency)} logged under ${newTx.category}.`,
      });

      return { success: true, transaction: newTx };
    },
    [persistSavingsGoals, persistSavingsTransactions, savingsSettings.currency, showToast, syncToCloudNow]
  );

  const updateSavingsTransaction = useCallback(
    (id: string, updates: Partial<SavingsTransaction>) => {
      const existing = savingsTransactionsRef.current.find((t) => t.id === id);
      if (!existing) return { success: false, error: 'Transaction not found' };

      Storage.unmarkDeleted(id);
      const now = new Date().toISOString();
      const updatedTx: SavingsTransaction = {
        ...existing,
        ...updates,
        id,
        updatedAt: now,
      };

      const oldGoalId = existing.goalId;
      const newGoalId = updatedTx.goalId;
      const oldAmount = existing.amount;
      const newAmount = updatedTx.amount;
      const oldType = existing.type;
      const newType = updatedTx.type;

      let goalsNeedUpdate = false;
      const newGoalsList = [...savingsGoalsRef.current];

      if (oldGoalId && oldGoalId !== 'general') {
        const g = newGoalsList.find((x) => x.id === oldGoalId);
        if (g) {
          const delta = oldType === 'deposit' ? -oldAmount : oldAmount;
          g.currentAmount = Math.max(0, g.currentAmount + delta);
          goalsNeedUpdate = true;
        }
      }

      if (newGoalId && newGoalId !== 'general') {
        const g = newGoalsList.find((x) => x.id === newGoalId);
        if (g) {
          const delta = newType === 'deposit' ? newAmount : -newAmount;
          g.currentAmount = Math.max(0, g.currentAmount + delta);
          goalsNeedUpdate = true;
        }
      }

      if (goalsNeedUpdate) {
        persistSavingsGoals(newGoalsList);
        savingsGoalsRef.current = newGoalsList;
        newGoalsList.forEach((g) => syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, g)));
      }

      const updatedList = savingsTransactionsRef.current
        .map((t) => (t.id === id ? updatedTx : t))
        .sort((a, b) => b.date.localeCompare(a.date));

      persistSavingsTransactions(updatedList);
      savingsTransactionsRef.current = updatedList;

      syncToCloudNow((uid) => syncSavingsTransactionToCloud(uid, updatedTx));

      showToast({
        type: 'info',
        title: 'Transaction Updated',
        message: 'Savings transaction successfully modified.',
      });

      return { success: true };
    },
    [persistSavingsGoals, persistSavingsTransactions, showToast, syncToCloudNow]
  );

  const deleteSavingsTransaction = useCallback(
    (id: string) => {
      const existing = savingsTransactionsRef.current.find((t) => t.id === id);
      if (!existing) return;

      Storage.unmarkSynced(id);
      Storage.markDeleted(id);

      if (existing.goalId && existing.goalId !== 'general') {
        const goal = savingsGoalsRef.current.find((g) => g.id === existing.goalId);
        if (goal) {
          const delta = existing.type === 'deposit' ? -existing.amount : existing.amount;
          const updatedGoal = {
            ...goal,
            currentAmount: Math.max(0, goal.currentAmount + delta),
            updatedAt: new Date().toISOString(),
          };
          const updatedGoals = savingsGoalsRef.current.map((g) => (g.id === goal.id ? updatedGoal : g));
          persistSavingsGoals(updatedGoals);
          savingsGoalsRef.current = updatedGoals;
          syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, updatedGoal));
        }
      }

      const updatedList = savingsTransactionsRef.current.filter((t) => t.id !== id);
      persistSavingsTransactions(updatedList);
      savingsTransactionsRef.current = updatedList;

      syncToCloudNow((uid) => deleteSavingsTransactionFromCloud(uid, id));

      showToast({
        type: 'info',
        title: 'Transaction Removed',
        message: 'The transaction has been deleted.',
      });
    },
    [persistSavingsGoals, persistSavingsTransactions, showToast, syncToCloudNow]
  );

  const transferSavings = useCallback(
    (amount: number, sourceGoalId: string | null, destGoalId: string | null, notes?: string) => {
      if (amount <= 0) return { success: false, error: 'Transfer amount must be positive' };
      if (sourceGoalId === destGoalId) return { success: false, error: 'Source and destination must differ' };

      const now = new Date().toISOString();
      const updatedGoals = [...savingsGoalsRef.current];

      if (sourceGoalId && sourceGoalId !== 'general') {
        const src = updatedGoals.find((g) => g.id === sourceGoalId);
        if (!src) return { success: false, error: 'Source goal not found' };
        if (src.currentAmount < amount) {
          return { success: false, error: `Insufficient funds in "${src.name}". Available: ${formatCurrency(src.currentAmount, savingsSettings.currency)}` };
        }
        src.currentAmount -= amount;
        src.updatedAt = now;
        syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, src));
      }

      if (destGoalId && destGoalId !== 'general') {
        const dst = updatedGoals.find((g) => g.id === destGoalId);
        if (!dst) return { success: false, error: 'Destination goal not found' };
        dst.currentAmount += amount;
        dst.updatedAt = now;
        syncToCloudNow((uid) => syncSavingsGoalToCloud(uid, dst));
      }

      persistSavingsGoals(updatedGoals);
      savingsGoalsRef.current = updatedGoals;

      const txId = `tx_sav_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const transferTx: SavingsTransaction = {
        id: txId,
        type: 'transfer',
        amount,
        date: getTodayKey(),
        goalId: sourceGoalId,
        destinationGoalId: destGoalId,
        category: 'Transfer',
        notes: notes || 'Funds reallocated between savings buckets',
        createdAt: now,
        updatedAt: now,
      };

      const updatedTx = [transferTx, ...savingsTransactionsRef.current];
      persistSavingsTransactions(updatedTx);
      savingsTransactionsRef.current = updatedTx;

      syncToCloudNow((uid) => syncSavingsTransactionToCloud(uid, transferTx));

      showToast({
        type: 'success',
        title: 'Funds Transferred',
        message: `${formatCurrency(amount, savingsSettings.currency)} successfully reallocated.`,
      });

      return { success: true };
    },
    [persistSavingsGoals, persistSavingsTransactions, savingsSettings.currency, showToast, syncToCloudNow]
  );

  const updateSavingsSettings = useCallback(
    (newSettings: Partial<SavingsSettings>) => {
      const merged: SavingsSettings = {
        ...savingsSettingsRef.current,
        ...newSettings,
      };
      persistSavingsSettings(merged);
      savingsSettingsRef.current = merged;

      syncToCloudNow((uid) => syncSavingsSettingsToCloud(uid, merged));

      showToast({
        type: 'success',
        title: 'Savings Settings Saved',
        message: 'Your currency and target preferences were updated.',
      });
    },
    [persistSavingsSettings, showToast, syncToCloudNow]
  );

  // -------------------------------------------------------------
  // NOTIFICATION & REMINDER OPERATIONS
  // -------------------------------------------------------------
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => {
      if (n.read) return false;
      if (n.snoozeUntil && currentTimestamp > 0 && new Date(n.snoozeUntil).getTime() > currentTimestamp) return false;
      return true;
    }).length;
  }, [notifications, currentTimestamp]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    if (pendingDeletedNotifIdsRef.current.has(id)) return;
    const uid = userRef.current?.uid;
    const now = new Date().toISOString();
    const updated = notificationsRef.current.map((n) =>
      n.id === id ? { ...n, read: true, readAt: n.readAt || now } : n
    );
    notificationsRef.current = updated;
    setNotifications(updated);
    Storage.saveNotifications(updated, uid);

    if (uid) {
      await updateNotificationInCloud(uid, id, { read: true, readAt: now });
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const uid = userRef.current?.uid;
    const now = new Date().toISOString();
    const currentList = notificationsRef.current;
    const unreadIds = currentList
      .filter((n) => !n.read && !pendingDeletedNotifIdsRef.current.has(n.id))
      .map((n) => n.id);
    if (unreadIds.length === 0) return;

    const updated = currentList.map((n) =>
      n.read ? n : { ...n, read: true, readAt: n.readAt || now }
    );
    notificationsRef.current = updated;
    setNotifications(updated);
    Storage.saveNotifications(updated, uid);

    if (uid) {
      await markAllNotificationsReadInCloud(uid, unreadIds);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const uid = userRef.current?.uid;
    const today = getTodayKey();
    const target = notificationsRef.current.find((n) => n.id === id);

    pendingDeletedNotifIdsRef.current.add(id);
    const keysToDismiss = getNotificationDismissalKeys(target || { id }, uid, today);
    for (const k of keysToDismiss) {
      dismissedNotifKeysRef.current.add(k);
    }
    Storage.saveDismissedNotificationKeys(dismissedNotifKeysRef.current, uid);

    const updated = notificationsRef.current.filter((n) => n.id !== id);
    notificationsRef.current = updated;
    setNotifications(updated);
    Storage.saveNotifications(updated, uid);

    if (uid) {
      notifDeleteInFlightRef.current = true;
      try {
        await syncDismissedNotificationsToCloud(
          uid,
          Array.from(dismissedNotifKeysRef.current),
          notificationsClearedAtRef.current
        );
        await deleteNotificationFromCloud(uid, id);
      } finally {
        notifDeleteInFlightRef.current = false;
      }
    }
  }, []);

  const clearAllReadNotifications = useCallback(async () => {
    const uid = userRef.current?.uid;
    const today = getTodayKey();
    const currentList = notificationsRef.current;
    const readItems = currentList.filter((n) => n.read);
    if (readItems.length === 0) return;

    const readIds = readItems.map((n) => n.id);
    const readIdSet = new Set(readIds);
    for (const item of readItems) {
      pendingDeletedNotifIdsRef.current.add(item.id);
      for (const k of getNotificationDismissalKeys(item, uid, today)) {
        dismissedNotifKeysRef.current.add(k);
      }
    }
    Storage.saveDismissedNotificationKeys(dismissedNotifKeysRef.current, uid);

    const remaining = currentList.filter((n) => !readIdSet.has(n.id));
    notificationsRef.current = remaining;
    setNotifications(remaining);
    Storage.saveNotifications(remaining, uid);

    if (uid) {
      notifDeleteInFlightRef.current = true;
      try {
        await syncDismissedNotificationsToCloud(
          uid,
          Array.from(dismissedNotifKeysRef.current),
          notificationsClearedAtRef.current
        );
        await deleteNotificationsBatchFromCloud(uid, readIds);
      } finally {
        notifDeleteInFlightRef.current = false;
      }
    }

    showToast({
      title: 'Notifications Cleared',
      message: `${readItems.length} read notification${readItems.length > 1 ? 's' : ''} removed`,
      type: 'info',
    });
  }, [showToast]);

  const clearAllNotifications = useCallback(async () => {
    const uid = userRef.current?.uid;
    const today = getTodayKey();
    const currentList = notificationsRef.current;
    const allIds = currentList.map((n) => n.id);

    const clearedAt = new Date().toISOString();
    notificationsClearedAtRef.current = clearedAt;
    Storage.setNotificationsClearedAt(clearedAt, uid);

    for (const item of currentList) {
      pendingDeletedNotifIdsRef.current.add(item.id);
      for (const k of getNotificationDismissalKeys(item, uid, today)) {
        dismissedNotifKeysRef.current.add(k);
      }
    }
    Storage.saveDismissedNotificationKeys(dismissedNotifKeysRef.current, uid);

    notificationsRef.current = [];
    setNotifications([]);
    Storage.saveNotifications([], uid);

    if (uid) {
      notifDeleteInFlightRef.current = true;
      try {
        await syncDismissedNotificationsToCloud(
          uid,
          Array.from(dismissedNotifKeysRef.current),
          clearedAt
        );
        await deleteAllNotificationsFromCloud(uid, allIds);
      } finally {
        notifDeleteInFlightRef.current = false;
      }
    }

    showToast({
      title: 'All Notifications Cleared',
      message: 'All notifications have been removed',
      type: 'info',
    });
  }, [showToast]);

  const snoozeNotification = useCallback(async (id: string, minutes: number) => {
    if (pendingDeletedNotifIdsRef.current.has(id)) return;
    const uid = userRef.current?.uid;
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    const updated = notificationsRef.current.map((n) =>
      n.id === id ? { ...n, snoozeUntil } : n
    );
    notificationsRef.current = updated;
    setNotifications(updated);
    Storage.saveNotifications(updated, uid);

    if (uid) {
      await updateNotificationInCloud(uid, id, { snoozeUntil });
    }
    showToast({
      title: 'Reminder Snoozed',
      message: `Snoozed for ${minutes} minute${minutes > 1 ? 's' : ''}`,
      type: 'info',
    });
  }, [showToast]);

  const dispatchNotification = useCallback(async (notifInput: Omit<NotificationRecord, 'id' | 'createdAt'>) => {
    const uid = userRef.current?.uid;
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newNotif: NotificationRecord = {
      ...notifInput,
      userId: notifInput.userId || uid,
      id,
      createdAt: new Date().toISOString(),
    };

    const current = notificationsRef.current;
    const isDuplicate =
      (newNotif.idempotencyKey && current.some((n) => n.idempotencyKey === newNotif.idempotencyKey)) ||
      (newNotif.deduplicationKey && current.some((n) => n.deduplicationKey === newNotif.deduplicationKey));

    if (!isDuplicate && !isNotificationDismissed(newNotif, dismissedNotifKeysRef.current, null, uid)) {
      const updated = [newNotif, ...current];
      notificationsRef.current = updated;
      setNotifications(updated);
      Storage.saveNotifications(updated, uid);

      if (uid) {
        syncNotificationToCloud(uid, newNotif);
      }

      const currentSettings = notificationSettingsRef.current || DEFAULT_NOTIFICATION_SETTINGS;
      if (currentSettings.soundEnabled && !isQuietHoursActive(currentSettings.quietHours)) {
        playNotificationSound();
      }
    }

    return newNotif;
  }, []);

  const createReminder = useCallback(async (reminderInput: Omit<ReminderDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    const uid = userRef.current?.uid;
    const nowIso = new Date().toISOString();
    const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newRem: ReminderDefinition = {
      ...reminderInput,
      userId: uid,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newRem, ...customRemindersRef.current];
    customRemindersRef.current = updated;
    setCustomReminders(updated);
    Storage.saveReminders(updated, uid);

    if (uid) {
      syncReminderToCloud(uid, newRem);
    }

    showToast({
      title: 'Reminder Created',
      message: `"${newRem.title}" scheduled for ${newRem.timeOfDay || newRem.targetTime}`,
      type: 'success',
    });

    return newRem;
  }, [showToast]);

  const updateReminder = useCallback(async (id: string, updates: Partial<ReminderDefinition>) => {
    const uid = userRef.current?.uid;
    const nowIso = new Date().toISOString();
    const target = customRemindersRef.current.find((r) => r.id === id);
    const updated = customRemindersRef.current.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: nowIso } : r
    );
    customRemindersRef.current = updated;
    setCustomReminders(updated);
    Storage.saveReminders(updated, uid);

    if (uid && target) {
      syncReminderToCloud(uid, { ...target, ...updates, updatedAt: nowIso });
    }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const uid = userRef.current?.uid;
    const updated = customRemindersRef.current.filter((r) => r.id !== id);
    customRemindersRef.current = updated;
    setCustomReminders(updated);
    Storage.saveReminders(updated, uid);

    if (uid) {
      deleteReminderFromCloud(uid, id);
    }

    showToast({
      title: 'Reminder Deleted',
      message: 'The reminder schedule was removed',
      type: 'info',
    });
  }, [showToast]);

  const updateNotificationSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    const uid = userRef.current?.uid;
    const base = notificationSettingsRef.current || DEFAULT_NOTIFICATION_SETTINGS;
    const merged = { ...base, ...updates };
    notificationSettingsRef.current = merged;
    setNotificationSettings(merged);
    Storage.saveNotificationSettings(merged, uid);

    if (uid) {
      syncNotificationSettingsToCloud(uid, merged);
    }

    showToast({
      title: 'Preferences Updated',
      message: 'Your notification settings have been saved',
      type: 'success',
    });
  }, [showToast]);

  const generateAIDailyBriefing = useCallback(async (forceRefresh = false): Promise<AIDailyBriefing | null> => {
    const uid = userRef.current?.uid;
    const today = getTodayKey();
    const existing = aiBriefingsRef.current.find((b) => b.date === today || b.dateKey === today);
    if (existing && !forceRefresh) {
      return existing;
    }

    const pendingTasks = todosRef.current.filter((t) => !t.completed);
    const activeHabits = habitsRef.current.filter((h) => h.status !== 'paused');
    const completedTodayHabits = completionsRef.current.filter((c) => (c as any).dateKey === today || (c as any).date === today);
    const completedHabitCount = activeHabits.filter((h) => completedTodayHabits.some((c) => c.habitId === h.id)).length;
    const activeGoalsList = goalsRef.current.filter((g) => g.status === 'in_progress');

    const result = await requestAIDailyBriefing({
      userId: uid || 'local_user',
      dateKey: today,
      date: today,
      pendingTasksCount: pendingTasks.length,
      highPriorityTasks: pendingTasks.filter((t) => t.priority === 'high').map((t) => t.title),
      habitsDueCount: activeHabits.length,
      habitsCompletedCount: completedHabitCount,
      activeGoalsCount: activeGoalsList.length,
      focusGoalTitle: activeGoalsList[0]?.title,
      totalSavingsBalance: savingsAnalytics?.totalSavings,
      lastNightSleepHours: sleepLogsRef.current.length > 0 ? sleepLogsRef.current[0].durationMinutes / 60 : undefined,
      todayTasks: pendingTasks.slice(0, 5).map((t) => ({ title: t.title, priority: String(t.priority), completed: false })),
      todayHabits: activeHabits.slice(0, 5).map((h) => ({ name: h.name, completed: completedTodayHabits.some((c) => c.habitId === h.id) })),
    });

    if (result.briefing) {
      const filteredBriefings = aiBriefingsRef.current.filter(
        (b) => b.id !== result.briefing!.id && b.date !== result.briefing!.date && b.dateKey !== result.briefing!.dateKey
      );
      const updatedBriefings = [result.briefing!, ...filteredBriefings];
      aiBriefingsRef.current = updatedBriefings;
      setAIBriefings(updatedBriefings);
      Storage.saveAIBriefings(updatedBriefings, uid);

      if (uid) {
        syncAIBriefingToCloud(uid, result.briefing);
      }

      const briefingNotif: NotificationRecord = {
        id: `briefing_notif_${Date.now()}`,
        userId: uid,
        category: 'ai_briefing',
        title: result.briefing.headline || `Daily Briefing • ${today}`,
        message: result.briefing.summary,
        type: 'ai_briefing',
        priority: 'high',
        deepLink: '/?tab=notifications',
        read: false,
        sourceType: 'ai_briefing',
        sourceId: result.briefing.id,
        idempotencyKey: `ai_briefing_${today}`,
        deduplicationKey: `ai_briefing_${today}`,
        createdAt: new Date().toISOString(),
      };

      const alreadyPresent = notificationsRef.current.some(
        (n) =>
          n.idempotencyKey === briefingNotif.idempotencyKey ||
          n.deduplicationKey === briefingNotif.deduplicationKey
      );
      const wasDismissed = !forceRefresh && isNotificationDismissed(briefingNotif, dismissedNotifKeysRef.current, null, uid);

      if (!alreadyPresent && !wasDismissed) {
        const updatedNotifs = [briefingNotif, ...notificationsRef.current];
        notificationsRef.current = updatedNotifs;
        setNotifications(updatedNotifs);
        Storage.saveNotifications(updatedNotifs, uid);

        if (uid) {
          syncNotificationToCloud(uid, briefingNotif);
        }
      }

      showToast({
        title: 'Morning Briefing Ready',
        message: result.briefing.headline || 'Your daily briefing is ready',
        type: 'success',
      });

      return result.briefing;
    }

    return null;
  }, [savingsAnalytics, showToast]);

  const evaluateNotificationHeartbeat = useCallback(async () => {
    // Wait until Firebase auth has resolved and, if signed in, cloud notifications & dismissed keys are hydrated
    if (!authResolvedRef.current) return;
    const currentUser = userRef.current;
    if (currentUser && (!cloudNotifsHydratedRef.current || !cloudDismissedHydratedRef.current)) {
      return;
    }
    if (notifDeleteInFlightRef.current) return;

    const uid = currentUser?.uid;
    const currentSettings = notificationSettingsRef.current || DEFAULT_NOTIFICATION_SETTINGS;
    if (currentSettings.enabled === false && !currentSettings.inAppEnabled && !currentSettings.pushEnabled) {
      return;
    }

    const now = new Date();
    const currentDateKey = getTodayKey();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dismissedKeys = new Set<string>([
      ...Array.from(dismissedNotifKeysRef.current),
      ...Array.from(Storage.getDismissedNotificationKeys(uid)),
    ]);

    const ctx: ReminderEvaluationContext = {
      userId: uid || 'local_user',
      settings: currentSettings,
      todos: todosRef.current || [],
      tasks: todosRef.current || [],
      habits: habitsRef.current || [],
      habitCompletions: completionsRef.current || [],
      goals: goalsRef.current || [],
      customReminders: customRemindersRef.current || [],
      existingNotifications: notificationsRef.current || [],
      dismissedKeys,
      currentDateKey,
      currentTimeStr,
      currentDate: now,
    };

    const newReminders = evaluateAllReminders(ctx);
    if (!newReminders || newReminders.length === 0) return;

    const validReminders = newReminders.filter(
      (n) =>
        !pendingDeletedNotifIdsRef.current.has(n.id) &&
        !isNotificationDismissed(n, dismissedKeys, null, uid)
    );
    if (validReminders.length === 0) return;

    const merged = [...validReminders, ...notificationsRef.current];
    const pruned = pruneExpiredNotifications(merged, 30);
    notificationsRef.current = pruned;
    setNotifications(pruned);
    Storage.saveNotifications(pruned, uid);

    if (uid) {
      validReminders.forEach((n) => syncNotificationToCloud(uid, n));
    }

    if (currentSettings.soundEnabled && !isQuietHoursActive(currentSettings.quietHours)) {
      playNotificationSound();
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const topNotif = validReminders[0];
        if (document.hidden && topNotif) {
          new Notification(topNotif.title, {
            body: topNotif.message,
            icon: '/icon-192.png',
            tag: topNotif.idempotencyKey || topNotif.deduplicationKey,
          });
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    evaluateHeartbeatRef.current = evaluateNotificationHeartbeat;
  }, [evaluateNotificationHeartbeat]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      evaluateNotificationHeartbeat();
    }, 3000);

    const interval = setInterval(() => {
      evaluateNotificationHeartbeat();
    }, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        evaluateNotificationHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [evaluateNotificationHeartbeat]);

  const value: LifeOSContextType = {
    user,
    authLoading,
    isCloudConnected: !!user,
    cloudDbName,
    isOnline,
    isSyncing,
    lastSyncedAt,
    loginWithGoogle,
    logout,
    syncNow,
    pullFromCloud,

    habits,
    completions,
    todos,
    goals,
    dailyContributions,
    settings,
    activeTab,
    selectedDate,
    toasts,
    isLoaded,

    setActiveTab,
    setSelectedDate,
    goToToday,
    goToPrevDay,
    goToNextDay,

    createHabit,
    updateHabit,
    deleteHabit,
    togglePauseHabit,
    toggleHabitCompletion,
    convertHabitToTodo,
    getHabitStreakInfo,

    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoCompletion,
    reorderTodos,
    getTodosForDate,

    createGoal,
    createGoalSimple,
    updateGoal,
    deleteGoal,
    toggleGoalTask,
    toggleGoalMilestone,
    toggleGoalChapter,
    updateGoalChapterDays,
    toggleGoalChapterTask,
    quickAddTarget,
    quickAddTask,
    replanGoalSchedule,
    applyAIPlan,
    applyAIReplan,

    sleepLogs,
    activeSleepSession,
    sleepSettings: settings.sleepSettings || DEFAULT_SLEEP_SETTINGS,
    sleepAnalytics,
    addSleepLog,
    updateSleepLog,
    deleteSleepLog,
    startSleepSession,
    stopSleepSessionAndLog,
    cancelSleepSession,
    updateSleepSettings,

    // Savings State & Operations
    savingsGoals,
    savingsTransactions,
    savingsSettings,
    savingsAnalytics,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsTransaction,
    updateSavingsTransaction,
    deleteSavingsTransaction,
    transferSavings,
    updateSavingsSettings,

    todayProgress,
    selectedDateProgress,
    overallStreaks,
    getDayProgress,

    updateSettings,
    resetDataToDefaults,
    clearData,
    exportDataJson,
    importDataJson,

    showToast,
    removeToast,
    triggerCelebration,

    // Notifications & Reminders
    notifications,
    unreadNotificationsCount,
    customReminders,
    notificationSettings,
    aiBriefings,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllReadNotifications,
    clearAllNotifications,
    snoozeNotification,
    dispatchNotification,
    createReminder,
    updateReminder,
    deleteReminder,
    updateNotificationSettings,
    generateAIDailyBriefing,
    evaluateNotificationHeartbeat,
  };

  return <LifeOSContext.Provider value={value}>{children}</LifeOSContext.Provider>;
}

export function useLifeOS() {
  const context = useContext(LifeOSContext);
  if (!context) {
    throw new Error('useLifeOS must be used within a LifeOSProvider');
  }
  return context;
}
