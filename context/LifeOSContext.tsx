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
} from '@/lib/types';
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
  deletedIds: Set<string>
): { merged: Habit[]; newToUpload: Habit[] } => {
  const map = new Map<string, Habit>();
  const newToUpload: Habit[] = [];

  for (const h of remote || []) {
    if (h && h.id && !deletedIds.has(h.id) && !DEMO_HABIT_IDS.has(h.id)) {
      map.set(h.id, h);
    }
  }

  for (const l of local || []) {
    if (l && l.id && !deletedIds.has(l.id) && !DEMO_HABIT_IDS.has(l.id)) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
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
  deletedIds: Set<string>
): { merged: Todo[]; newToUpload: Todo[] } => {
  const map = new Map<string, Todo>();
  const newToUpload: Todo[] = [];

  for (const t of remote || []) {
    if (t && t.id && !deletedIds.has(t.id) && !DEMO_TODO_IDS.has(t.id)) {
      map.set(t.id, t);
    }
  }

  for (const l of local || []) {
    if (l && l.id && !deletedIds.has(l.id) && !DEMO_TODO_IDS.has(l.id)) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
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
  deletedIds: Set<string>
): { merged: Goal[]; newToUpload: Goal[] } => {
  const map = new Map<string, Goal>();
  const newToUpload: Goal[] = [];

  for (const g of remote || []) {
    if (g && g.id && !deletedIds.has(g.id)) {
      map.set(g.id, g);
    }
  }

  for (const l of local || []) {
    if (l && l.id && !deletedIds.has(l.id)) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      } else {
        const r = map.get(l.id)!;
        if (l.updatedAt && r.updatedAt && new Date(l.updatedAt).getTime() > new Date(r.updatedAt).getTime()) {
          map.set(l.id, l);
          newToUpload.push(l);
        }
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const mergeRemoteCompletions = (
  local: HabitCompletion[],
  remote: HabitCompletion[],
  deletedIds: Set<string>
): { merged: HabitCompletion[]; newToUpload: HabitCompletion[] } => {
  const map = new Map<string, HabitCompletion>();
  const newToUpload: HabitCompletion[] = [];

  for (const c of remote || []) {
    if (c && c.id && !deletedIds.has(c.id) && !DEMO_COMPLETION_IDS.has(c.id)) {
      map.set(c.id, c);
    }
  }

  for (const l of local || []) {
    if (l && l.id && !deletedIds.has(l.id) && !DEMO_COMPLETION_IDS.has(l.id)) {
      if (!map.has(l.id)) {
        map.set(l.id, l);
        newToUpload.push(l);
      }
    }
  }

  return { merged: Array.from(map.values()), newToUpload };
};

const purgeCloudDemoItems = async (
  userId: string,
  rawHabits: Habit[],
  rawCompletions: HabitCompletion[],
  rawTodos: Todo[]
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
  reconnectFirestore,
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
  syncSettingsToCloud,
  uploadInitialDataToCloud,
  checkHasCloudData,
  subscribeToUserCloudData,
  syncAllLocalDataToCloud,
  fetchAllCloudData,
  flushPendingCloudWrites,
} from '@/lib/firestore-service';
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
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const persistGoals = useCallback((newGoals: Goal[]) => {
    setGoals(newGoals);
    Storage.saveGoals(newGoals);
  }, []);

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
        const savedSettings = Storage.getSettings();

        setHabits(savedHabits);
        setCompletions(savedCompletions);
        setTodos(savedTodos);
        setGoals(savedGoals);
        setSettings(savedSettings);
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // State refs to guarantee fresh data in asynchronous callbacks
  const userRef = useRef<User | null>(null);
  const habitsRef = useRef<Habit[]>(habits);
  const completionsRef = useRef<HabitCompletion[]>(completions);
  const todosRef = useRef<Todo[]>(todos);
  const goalsRef = useRef<Goal[]>(goals);
  const settingsRef = useRef<UserSettings>(settings);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);
  useEffect(() => { completionsRef.current = completions; }, [completions]);
  useEffect(() => { todosRef.current = todos; }, [todos]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

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

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      userRef.current = currentUser;
      setAuthLoading(false);

      if (currentUser) {
        Storage.setCachedUserId(currentUser.uid);

        // 1. Immediately subscribe to real-time updates from Firestore with non-destructive merge
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }

        unsubscribeFirestore = subscribeToUserCloudData(currentUser.uid, {
          onHabits: (cloudHabits) => {
            if (!cloudHabits) return;
            const deleted = Storage.getDeletedIds();
            const currentLocal = habitsRef.current.length > 0 ? habitsRef.current : Storage.getHabits();
            const { merged, newToUpload } = mergeRemoteHabits(currentLocal, cloudHabits, deleted);
            setHabits(merged);
            Storage.saveHabits(merged);
            setLastSyncedAt(new Date());

            if (newToUpload.length > 0) {
              newToUpload.forEach((h) => syncHabitToCloud(currentUser.uid, h));
            }
          },
          onCompletions: (cloudCompletions) => {
            if (!cloudCompletions) return;
            const deleted = Storage.getDeletedIds();
            const currentLocal = completionsRef.current.length > 0 ? completionsRef.current : Storage.getCompletions();
            const { merged, newToUpload } = mergeRemoteCompletions(currentLocal, cloudCompletions, deleted);
            setCompletions(merged);
            Storage.saveCompletions(merged);
            setLastSyncedAt(new Date());

            if (newToUpload.length > 0) {
              newToUpload.forEach((c) => syncCompletionToCloud(currentUser.uid, c));
            }
          },
          onTodos: (cloudTodos) => {
            if (!cloudTodos) return;
            const deleted = Storage.getDeletedIds();
            const currentLocal = todosRef.current.length > 0 ? todosRef.current : Storage.getTodos();
            const { merged, newToUpload } = mergeRemoteTodos(currentLocal, cloudTodos, deleted);
            setTodos(merged);
            Storage.saveTodos(merged);
            setLastSyncedAt(new Date());

            if (newToUpload.length > 0) {
              newToUpload.forEach((t) => syncTodoToCloud(currentUser.uid, t));
            }
          },
          onGoals: (cloudGoals) => {
            if (!cloudGoals) return;
            const deleted = Storage.getDeletedIds();
            const currentLocal = goalsRef.current.length > 0 ? goalsRef.current : Storage.getGoals();
            const { merged, newToUpload } = mergeRemoteGoals(currentLocal, cloudGoals, deleted);
            setGoals(merged);
            Storage.saveGoals(merged);
            setLastSyncedAt(new Date());

            if (newToUpload.length > 0) {
              newToUpload.forEach((g) => syncGoalToCloud(currentUser.uid, g));
            }
          },
          onSettings: (cloudSettings) => {
            if (!cloudSettings) return;
            setSettings(cloudSettings);
            Storage.saveSettings(cloudSettings);
            setLastSyncedAt(new Date());
          },
        });

        // 2. In background, save profile & flush any queued offline writes
        saveUserProfile(currentUser).catch(() => {});
        flushPendingCloudWrites(currentUser.uid).catch(() => {});
      } else {
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
              reconnectFirestore();
              flushPendingCloudWrites(uid).catch(() => {});
            }
          }
        };
      }
    } catch {}

    // Resilient lifecycle listeners: device unlock, mobile foreground, tab focus, network recovery
    const handleForegroundWake = () => {
      const uid = auth.currentUser?.uid || userRef.current?.uid || Storage.getCachedUserId();
      if (uid) {
        reconnectFirestore();
        flushPendingCloudWrites(uid).catch(() => {});
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

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleForegroundWake);
    window.addEventListener('pageshow', handleForegroundWake);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
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
      await saveUserProfile(signedInUser);

      // Trigger immediate network reconnect and flush
      reconnectFirestore();
      flushPendingCloudWrites(signedInUser.uid).catch(() => {});

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
      await logoutUser();
      setUser(null);
      userRef.current = null;
      Storage.setCachedUserId(null);
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
      const currentSettings = Storage.getSettings();

      await flushPendingCloudWrites(userRef.current.uid);

      const success = await syncAllLocalDataToCloud(
        userRef.current.uid,
        currentHabits,
        currentCompletions,
        currentTodos,
        currentSettings,
        currentGoals
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
    if (!userRef.current) {
      showToast({
        type: 'info',
        title: 'Sign In Required',
        message: 'Please sign in with Google to synchronize your habits and to-dos to the cloud.',
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
      const currentHabits = Storage.getHabits();
      const currentCompletions = Storage.getCompletions();
      const currentTodos = Storage.getTodos();
      const currentGoals = Storage.getGoals();
      const currentSettings = Storage.getSettings();

      await flushPendingCloudWrites(userRef.current.uid);

      const success = await syncAllLocalDataToCloud(
        userRef.current.uid,
        currentHabits,
        currentCompletions,
        currentTodos,
        currentSettings,
        currentGoals
      );

      if (success) {
        showToast({
          type: 'success',
          title: 'Cloud Sync Complete',
          message: 'All your habits, to-dos, goals, and streaks are up to date in the cloud.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Sync Incomplete',
          message: 'Could not sync all items. Will retry automatically.',
        });
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast({
        type: 'error',
        title: 'Sync Failed',
        message: 'An error occurred during synchronization.',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [showToast]);

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
        await purgeCloudDemoItems(userRef.current.uid, rawCloudData.habits, rawCloudData.completions, rawCloudData.todos);

        const cleanHabits = filterCleanHabits(rawCloudData.habits);
        const cleanCompletions = filterCleanCompletions(rawCloudData.completions);
        const cleanTodos = filterCleanTodos(rawCloudData.todos);

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

        if (rawCloudData.settings) {
          setSettings(rawCloudData.settings);
          Storage.saveSettings(rawCloudData.settings);
        }
        showToast({
          type: 'success',
          title: 'Cloud Data Restored',
          message: 'Successfully pulled and restored your latest habits, goals, and tasks from your Gmail account!',
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
    setHabits(seed.habits);
    setCompletions(seed.completions);
    setTodos(seed.todos);
    setSettings(seed.settings);
    setGoals([]);
    Storage.saveGoals([]);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      uploadInitialDataToCloud(
        userRef.current.uid,
        seed.habits,
        seed.completions,
        seed.todos,
        seed.settings,
        []
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
    setSettings(INITIAL_SETTINGS);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      habits.forEach((h) => deleteHabitFromCloud(userRef.current!.uid, h.id));
      completions.forEach((c) => deleteCompletionFromCloud(userRef.current!.uid, c.id));
      todos.forEach((t) => deleteTodoFromCloud(userRef.current!.uid, t.id));
      goals.forEach((g) => deleteGoalFromCloud(userRef.current!.uid, g.id));
    }

    showToast({
      type: 'warning',
      title: 'Data Cleared',
      message: 'All habits, to-dos, and streaks have been cleared.',
    });
  }, [habits, completions, todos, goals, showToast]);

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
