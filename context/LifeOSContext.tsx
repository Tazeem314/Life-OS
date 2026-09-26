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
} from '@/lib/types';
import { Storage, INITIAL_SETTINGS, getInitialSeedData } from '@/lib/storage';
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
  syncSettingsToCloud,
  uploadInitialDataToCloud,
  checkHasCloudData,
  subscribeToUserCloudData,
  syncAllLocalDataToCloud,
  fetchAllCloudData,
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
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => new Date());
  const cloudDbName = firebaseConfig.firestoreDatabaseId || 'LifeOS Cloud Database';

  // Core data state initialized deterministically to prevent hydration mismatch
  const [habits, setHabits] = useState<Habit[]>(() => getInitialSeedData().habits);
  const [completions, setCompletions] = useState<HabitCompletion[]>(() => getInitialSeedData().completions);
  const [todos, setTodos] = useState<Todo[]>(() => getInitialSeedData().todos);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Synchronize with client-side localStorage on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedHabits = Storage.getHabits();
        const savedCompletions = Storage.getCompletions();
        const savedTodos = Storage.getTodos();
        const savedSettings = Storage.getSettings();

        setHabits(savedHabits);
        setCompletions(savedCompletions);
        setTodos(savedTodos);
        setSettings(savedSettings);
      } catch (err) {
        console.warn('Failed to load local storage state:', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ref to track active user for callback closures
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Debounced auto-sync helper that synchronizes all local data to Firestore
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerDebouncedAutoSync = useCallback(() => {
    if (!userRef.current || (typeof window !== 'undefined' && !navigator.onLine)) return;
    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }
    autoSyncTimeoutRef.current = setTimeout(async () => {
      if (!userRef.current) return;
      try {
        const currentHabits = Storage.getHabits();
        const currentCompletions = Storage.getCompletions();
        const currentTodos = Storage.getTodos();
        const currentSettings = Storage.getSettings();

        const success = await syncAllLocalDataToCloud(
          userRef.current.uid,
          currentHabits,
          currentCompletions,
          currentTodos,
          currentSettings
        );
        if (success) {
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.warn('Debounced auto-sync error:', err);
      }
    }, 1200);
  }, []);

  // Periodic heartbeat auto-sync (every 25 seconds) when user is authenticated & online
  useEffect(() => {
    if (!user || !isOnline) return;

    const interval = setInterval(async () => {
      if (!userRef.current) return;
      try {
        const currentHabits = Storage.getHabits();
        const currentCompletions = Storage.getCompletions();
        const currentTodos = Storage.getTodos();
        const currentSettings = Storage.getSettings();

        const ok = await syncAllLocalDataToCloud(
          userRef.current.uid,
          currentHabits,
          currentCompletions,
          currentTodos,
          currentSettings
        );
        if (ok) {
          setLastSyncedAt(new Date());
        }
      } catch (err) {
        console.warn('Heartbeat auto-sync skipped:', err);
      }
    }, 25000);

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

  // Firebase Auth State Listener & Cloud Sync
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Save profile
        await saveUserProfile(currentUser);

        // Fetch cloud data for this user to check if cloud already has saved records
        const cloudData = await fetchAllCloudData(currentUser.uid);
        const currentHabits = Storage.getHabits();
        const currentCompletions = Storage.getCompletions();
        const currentTodos = Storage.getTodos();
        const currentSettings = Storage.getSettings();

        const hasAnyCloudData = cloudData && (
          cloudData.habits.length > 0 ||
          cloudData.todos.length > 0 ||
          cloudData.completions.length > 0
        );

        if (hasAnyCloudData && cloudData) {
          // Cloud is authoritative for authenticated accounts: adopt cloud data directly
          setHabits(cloudData.habits);
          Storage.saveHabits(cloudData.habits);

          setCompletions(cloudData.completions);
          Storage.saveCompletions(cloudData.completions);

          const sortedTodos = [...cloudData.todos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setTodos(sortedTodos);
          Storage.saveTodos(sortedTodos);

          if (cloudData.settings) {
            setSettings(cloudData.settings);
            Storage.saveSettings(cloudData.settings);
          }
          setLastSyncedAt(new Date());
        } else {
          // Brand new cloud account: seed cloud with current local items
          await uploadInitialDataToCloud(
            currentUser.uid,
            currentHabits,
            currentCompletions,
            currentTodos,
            currentSettings
          );
          setLastSyncedAt(new Date());
        }

        // Subscribe to real-time updates from Firestore
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
        }

        unsubscribeFirestore = subscribeToUserCloudData(currentUser.uid, {
          onHabits: (cloudHabits) => {
            if (!cloudHabits) return;
            setHabits(cloudHabits);
            Storage.saveHabits(cloudHabits);
            setLastSyncedAt(new Date());
          },
          onCompletions: (cloudCompletions) => {
            if (!cloudCompletions) return;
            setCompletions(cloudCompletions);
            Storage.saveCompletions(cloudCompletions);
            setLastSyncedAt(new Date());
          },
          onTodos: (cloudTodos) => {
            if (!cloudTodos) return;
            const sorted = [...cloudTodos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setTodos(sorted);
            Storage.saveTodos(sorted);
            setLastSyncedAt(new Date());
          },
          onSettings: (cloudSettings) => {
            if (!cloudSettings) return;
            setSettings(cloudSettings);
            Storage.saveSettings(cloudSettings);
            setLastSyncedAt(new Date());
          },
        });
      } else {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // Sign in with Google (Gmail)
  const loginWithGoogle = useCallback(async () => {
    try {
      setAuthLoading(true);
      const signedInUser = await signInWithGoogle();
      await saveUserProfile(signedInUser);

      // Explicitly pull cloud data for the signed-in user and merge
      const cloudData = await fetchAllCloudData(signedInUser.uid);
      const currentHabits = Storage.getHabits();
      const currentCompletions = Storage.getCompletions();
      const currentTodos = Storage.getTodos();
      const currentSettings = Storage.getSettings();

      if (cloudData && (cloudData.habits.length > 0 || cloudData.todos.length > 0 || cloudData.completions.length > 0)) {
        setHabits(cloudData.habits);
        Storage.saveHabits(cloudData.habits);

        setCompletions(cloudData.completions);
        Storage.saveCompletions(cloudData.completions);

        const sortedTodos = [...cloudData.todos].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setTodos(sortedTodos);
        Storage.saveTodos(sortedTodos);

        if (cloudData.settings) {
          setSettings(cloudData.settings);
          Storage.saveSettings(cloudData.settings);
        }
        setLastSyncedAt(new Date());
      } else {
        await uploadInitialDataToCloud(
          signedInUser.uid,
          currentHabits,
          currentCompletions,
          currentTodos,
          currentSettings
        );
        setLastSyncedAt(new Date());
      }

      showToast({
        type: 'success',
        title: 'Gmail Connected & Synced',
        message: `Welcome, ${signedInUser.displayName || signedInUser.email}! Your habits & tasks are synced across all devices.`,
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
      const currentSettings = Storage.getSettings();

      const success = await syncAllLocalDataToCloud(
        userRef.current.uid,
        currentHabits,
        currentCompletions,
        currentTodos,
        currentSettings
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

  // Connectivity, Focus, Tab Visibility, and Service Worker Background Sync listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      setIsOnline(true);
      if (userRef.current) {
        setIsSyncing(true);
        try {
          await performBackgroundSync(true);
          showToast({
            type: 'success',
            title: 'Back Online & Synced',
            message: 'Your offline habits and to-dos were automatically synced to the cloud in the background.',
          });
        } finally {
          setIsSyncing(false);
        }
      } else {
        showToast({
          type: 'info',
          title: 'Internet Restored',
          message: 'You are back online. All changes are stored locally on your device.',
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast({
        type: 'info',
        title: 'Offline Mode Active',
        message: 'No internet connection. You can continue using LifeOS normally — everything is saved on your device and will auto-sync when you reconnect.',
      });
    };

    // When user unlocks device, brings app to foreground, or focuses the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && userRef.current) {
        performBackgroundSync(true);
      }
    };

    const handleFocus = () => {
      if (navigator.onLine && userRef.current) {
        performBackgroundSync(true);
      }
    };

    // Service Worker message listener (for background sync trigger)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
        if (navigator.onLine && userRef.current) {
          performBackgroundSync(true);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [showToast, performBackgroundSync]);

  // Periodic heartbeat background auto-sync (every 20 seconds) when user is authenticated & online
  useEffect(() => {
    if (!user || !isOnline) return;

    const interval = setInterval(() => {
      if (userRef.current && navigator.onLine) {
        performBackgroundSync(true);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [user, isOnline, performBackgroundSync]);

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
      const currentSettings = Storage.getSettings();

      const success = await syncAllLocalDataToCloud(
        userRef.current.uid,
        currentHabits,
        currentCompletions,
        currentTodos,
        currentSettings
      );

      if (success) {
        showToast({
          type: 'success',
          title: 'Cloud Sync Complete',
          message: 'All your habits, to-dos, and streaks are up to date in the cloud.',
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
      const cloudData = await fetchAllCloudData(userRef.current.uid);
      if (cloudData) {
        if (cloudData.habits && cloudData.habits.length > 0) {
          setHabits(cloudData.habits);
          Storage.saveHabits(cloudData.habits);
        }
        if (cloudData.completions) {
          setCompletions(cloudData.completions);
          Storage.saveCompletions(cloudData.completions);
        }
        if (cloudData.todos) {
          setTodos(cloudData.todos);
          Storage.saveTodos(cloudData.todos);
        }
        if (cloudData.settings) {
          setSettings(cloudData.settings);
          Storage.saveSettings(cloudData.settings);
        }
        showToast({
          type: 'success',
          title: 'Cloud Data Restored',
          message: 'Successfully pulled and restored your latest habits and tasks from your Gmail account!',
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
    triggerDebouncedAutoSync();
    requestServiceWorkerBackgroundSync();
  }, [triggerDebouncedAutoSync, requestServiceWorkerBackgroundSync]);

  const persistCompletions = useCallback((newCompletions: HabitCompletion[]) => {
    setCompletions(newCompletions);
    Storage.saveCompletions(newCompletions);
    triggerDebouncedAutoSync();
    requestServiceWorkerBackgroundSync();
  }, [triggerDebouncedAutoSync, requestServiceWorkerBackgroundSync]);

  const persistTodos = useCallback((newTodos: Todo[]) => {
    setTodos(newTodos);
    Storage.saveTodos(newTodos);
    triggerDebouncedAutoSync();
    requestServiceWorkerBackgroundSync();
  }, [triggerDebouncedAutoSync, requestServiceWorkerBackgroundSync]);

  const persistSettings = useCallback((newSettings: UserSettings) => {
    setSettings(newSettings);
    Storage.saveSettings(newSettings);
    triggerDebouncedAutoSync();
    requestServiceWorkerBackgroundSync();
  }, [triggerDebouncedAutoSync, requestServiceWorkerBackgroundSync]);

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

      const updated = [newHabit, ...habits];
      persistHabits(updated);

      if (userRef.current) {
        syncHabitToCloud(userRef.current.uid, newHabit);
      }

      showToast({
        type: 'success',
        title: 'Habit Created',
        message: `"${newHabit.name}" has been added to your schedule.`,
      });
      return { success: true };
    },
    [habits, showToast, persistHabits]
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

      if (userRef.current && modifiedHabit) {
        syncHabitToCloud(userRef.current.uid, modifiedHabit);
      }

      showToast({
        type: 'info',
        title: 'Habit Updated',
        message: 'Your habit changes have been saved.',
      });
      return { success: true };
    },
    [habits, showToast, persistHabits]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      const target = habits.find((h) => h.id === id);
      const updated = habits.filter((h) => h.id !== id);
      const updatedCompletions = completions.filter((c) => c.habitId !== id);

      persistHabits(updated);
      persistCompletions(updatedCompletions);

      if (userRef.current) {
        try {
          await deleteHabitFromCloud(userRef.current.uid, id);
        } catch (err) {
          console.error('Failed to delete habit from cloud:', err);
        }
      }

      showToast({
        type: 'info',
        title: 'Habit Deleted',
        message: target ? `"${target.name}" was removed.` : 'Habit removed.',
      });
    },
    [habits, completions, showToast, persistHabits, persistCompletions]
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

      if (userRef.current && modified) {
        syncHabitToCloud(userRef.current.uid, modified);
      }

      showToast({
        type: 'info',
        title: nextStatus === 'paused' ? 'Habit Paused' : 'Habit Resumed',
        message: `"${target.name}" is now ${nextStatus}.`,
      });
    },
    [habits, showToast, persistHabits]
  );

  const toggleHabitCompletion = useCallback(
    (habitId: string, dateKey: string = selectedDate) => {
      const existing = completions.find((c) => c.habitId === habitId && c.date === dateKey);

      let newCompletions: HabitCompletion[];
      if (existing) {
        // Toggle OFF
        newCompletions = completions.filter((c) => c.id !== existing.id);
        persistCompletions(newCompletions);

        if (userRef.current) {
          deleteCompletionFromCloud(userRef.current.uid, existing.id);
        }
      } else {
        // Toggle ON
        const newCompletion: HabitCompletion = {
          id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          habitId,
          date: dateKey,
          completedAt: new Date().toISOString(),
        };
        newCompletions = [...completions, newCompletion];
        persistCompletions(newCompletions);

        if (userRef.current) {
          syncCompletionToCloud(userRef.current.uid, newCompletion);
        }

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
    [habits, completions, todos, selectedDate, triggerCelebration, showToast, persistCompletions]
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

      if (userRef.current) {
        syncTodoToCloud(userRef.current.uid, newTodo);
      }

      showToast({
        type: 'success',
        title: 'Added to To-Dos',
        message: `"${habit.name}" was added to your task list for ${targetDate === getTodayKey() ? 'Today' : targetDate}.`,
      });
    },
    [habits, todos, selectedDate, showToast, persistTodos]
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

      const updated = [newTodo, ...todos];
      persistTodos(updated);

      if (userRef.current) {
        syncTodoToCloud(userRef.current.uid, newTodo);
      }

      showToast({
        type: 'success',
        title: 'To-Do Added',
        message: `"${newTodo.title}" added to ${todoData.date === getTodayKey() ? 'Today' : todoData.date}.`,
      });
      return { success: true };
    },
    [todos, showToast, persistTodos]
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

      if (userRef.current && modified) {
        syncTodoToCloud(userRef.current.uid, modified);
      }

      showToast({
        type: 'info',
        title: 'To-Do Updated',
        message: 'Your task has been updated.',
      });
      return { success: true };
    },
    [todos, showToast, persistTodos]
  );

  const deleteTodo = useCallback(
    (id: string) => {
      const target = todos.find((t) => t.id === id);
      const updated = todos.filter((t) => t.id !== id);
      persistTodos(updated);

      if (userRef.current) {
        deleteTodoFromCloud(userRef.current.uid, id);
      }

      showToast({
        type: 'info',
        title: 'To-Do Removed',
        message: target ? `"${target.title}" was deleted.` : 'Task deleted.',
      });
    },
    [todos, showToast, persistTodos]
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

      if (userRef.current && modified) {
        syncTodoToCloud(userRef.current.uid, modified);
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
    [todos, habits, completions, triggerCelebration, showToast, persistTodos]
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

      if (userRef.current) {
        updatedDateTodos.forEach((t) => syncTodoToCloud(userRef.current!.uid, t));
      }
    },
    [todos, persistTodos]
  );

  const getTodosForDate = useCallback(
    (dateKey: string) => {
      return todos
        .filter((t) => t.date === dateKey)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    [todos]
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

      if (userRef.current) {
        syncSettingsToCloud(userRef.current.uid, updated);
      }

      showToast({
        type: 'info',
        title: 'Settings Saved',
        message: 'Your preferences have been updated.',
      });
    },
    [settings, showToast, persistSettings]
  );

  const resetDataToDefaults = useCallback(() => {
    const seed = Storage.resetToSeed();
    setHabits(seed.habits);
    setCompletions(seed.completions);
    setTodos(seed.todos);
    setSettings(seed.settings);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      uploadInitialDataToCloud(
        userRef.current.uid,
        seed.habits,
        seed.completions,
        seed.todos,
        seed.settings
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
    setSettings(INITIAL_SETTINGS);
    setSelectedDate(getTodayKey());

    if (userRef.current) {
      habits.forEach((h) => deleteHabitFromCloud(userRef.current!.uid, h.id));
      completions.forEach((c) => deleteCompletionFromCloud(userRef.current!.uid, c.id));
      todos.forEach((t) => deleteTodoFromCloud(userRef.current!.uid, t.id));
    }

    showToast({
      type: 'warning',
      title: 'Data Cleared',
      message: 'All habits, to-dos, and streaks have been cleared.',
    });
  }, [habits, completions, todos, showToast]);

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
        const loadedSettings = Storage.getSettings();

        setHabits(loadedHabits);
        setCompletions(loadedCompletions);
        setTodos(loadedTodos);
        setSettings(loadedSettings);

        if (userRef.current) {
          uploadInitialDataToCloud(
            userRef.current.uid,
            loadedHabits,
            loadedCompletions,
            loadedTodos,
            loadedSettings
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
