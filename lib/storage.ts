import { Habit, HabitCompletion, Todo, UserSettings, Goal, SleepLog, ActiveSleepSession, SavingsGoal, SavingsTransaction, SavingsSettings } from './types';
import { NotificationRecord, ReminderDefinition, NotificationSettings, AIDailyBriefing } from './notification-types';
import { getInitialSeedSleepLogs, DEFAULT_SLEEP_SETTINGS } from './sleep-service';
import { DEFAULT_SAVINGS_SETTINGS } from './savings-service';

const HABITS_STORAGE_KEY = 'life_os_habits_v1';
const COMPLETIONS_STORAGE_KEY = 'life_os_completions_v1';
const TODOS_STORAGE_KEY = 'life_os_todos_v1';
const GOALS_STORAGE_KEY = 'life_os_goals_v1';
const SETTINGS_STORAGE_KEY = 'life_os_settings_v1';
const SLEEP_LOGS_STORAGE_KEY = 'life_os_sleep_logs_v1';
const ACTIVE_SLEEP_SESSION_KEY = 'life_os_active_sleep_session_v1';
const SAVINGS_GOALS_STORAGE_KEY = 'life_os_savings_goals_v1';
const SAVINGS_TRANSACTIONS_STORAGE_KEY = 'life_os_savings_transactions_v1';
const SAVINGS_SETTINGS_STORAGE_KEY = 'life_os_savings_settings_v1';
const INITIALIZED_KEY = 'life_os_initialized_v2';
const CACHED_USER_KEY = 'life_os_cached_uid';
const DELETED_IDS_KEY = 'lifeos_deleted_ids_v1';
const SYNCED_IDS_KEY = 'lifeos_synced_record_ids_v1';

export const DEMO_HABIT_IDS = new Set(['habit_1', 'habit_2', 'habit_3', 'habit_4']);
export const DEMO_TODO_IDS = new Set(['todo_1', 'todo_2', 'todo_3', 'todo_prev_1']);
export const DEMO_COMPLETION_IDS = new Set([
  'c_1', 'c_2', 'c_3', 'c_4', 'c_5', 'c_6', 'c_7', 'c_8', 'c_9', 'c_10', 'c_11', 'c_12', 'c_13'
]);

export const INITIAL_SETTINGS: UserSettings = {
  theme: 'light',
  animationsEnabled: true,
  reminderNotifications: false,
  userName: 'Productive Achiever',
  sleepSettings: DEFAULT_SLEEP_SETTINGS,
};

export function getInitialSeedData(): {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  settings: UserSettings;
} {
  return {
    habits: [],
    completions: [],
    todos: [],
    settings: INITIAL_SETTINGS,
  };
}

export const Storage = {
  isInitialized(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(INITIALIZED_KEY) === 'true';
  },

  initSeedDataIfEmpty(): void {
    if (typeof window === 'undefined') return;
    if (!this.isInitialized()) {
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
  },

  getHabits(): Habit[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(HABITS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: Habit[] = JSON.parse(data);
      const cleaned = parsed.filter((h) => !DEMO_HABIT_IDS.has(h.id));
      if (cleaned.length !== parsed.length) {
        this.saveHabits(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveHabits(habits: Habit[]): void {
    if (typeof window === 'undefined') return;
    try {
      const cleaned = habits.filter((h) => !DEMO_HABIT_IDS.has(h.id));
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(cleaned));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save habits to localStorage', e);
    }
  },

  getCompletions(): HabitCompletion[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(COMPLETIONS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: HabitCompletion[] = JSON.parse(data);
      const cleaned = parsed.filter((c) => !DEMO_COMPLETION_IDS.has(c.id) && !DEMO_HABIT_IDS.has(c.habitId));
      if (cleaned.length !== parsed.length) {
        this.saveCompletions(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveCompletions(completions: HabitCompletion[]): void {
    if (typeof window === 'undefined') return;
    try {
      const cleaned = completions.filter((c) => !DEMO_COMPLETION_IDS.has(c.id) && !DEMO_HABIT_IDS.has(c.habitId));
      localStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(cleaned));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save completions to localStorage', e);
    }
  },

  getTodos(): Todo[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(TODOS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: Todo[] = JSON.parse(data);
      const cleaned = parsed.filter((t) => !DEMO_TODO_IDS.has(t.id));
      if (cleaned.length !== parsed.length) {
        this.saveTodos(cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  saveTodos(todos: Todo[]): void {
    if (typeof window === 'undefined') return;
    try {
      const cleaned = todos.filter((t) => !DEMO_TODO_IDS.has(t.id));
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(cleaned));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save todos to localStorage', e);
    }
  },

  getSettings(): UserSettings {
    if (typeof window === 'undefined') return INITIAL_SETTINGS;
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) {
        this.saveSettings(INITIAL_SETTINGS);
        return INITIAL_SETTINGS;
      }
      const parsed = JSON.parse(data);
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        sleepSettings: {
          ...DEFAULT_SLEEP_SETTINGS,
          ...(parsed?.sleepSettings || {}),
        },
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  },

  getGoals(): Goal[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(GOALS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: Goal[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveGoals(goals: Goal[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save goals to localStorage', e);
    }
  },

  getSavingsGoals(): SavingsGoal[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(SAVINGS_GOALS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: SavingsGoal[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSavingsGoals(goals: SavingsGoal[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SAVINGS_GOALS_STORAGE_KEY, JSON.stringify(goals));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save savings goals to localStorage', e);
    }
  },

  getSavingsTransactions(): SavingsTransaction[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(SAVINGS_TRANSACTIONS_STORAGE_KEY);
      if (data === null) return [];
      const parsed: SavingsTransaction[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSavingsTransactions(transactions: SavingsTransaction[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SAVINGS_TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save savings transactions to localStorage', e);
    }
  },

  getSavingsSettings(): SavingsSettings {
    if (typeof window === 'undefined') return DEFAULT_SAVINGS_SETTINGS;
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(SAVINGS_SETTINGS_STORAGE_KEY);
      if (!data) return DEFAULT_SAVINGS_SETTINGS;
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SAVINGS_SETTINGS,
        ...(parsed || {}),
      };
    } catch {
      return DEFAULT_SAVINGS_SETTINGS;
    }
  },

  saveSavingsSettings(settings: SavingsSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SAVINGS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save savings settings to localStorage', e);
    }
  },

  getSleepLogs(): SleepLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(SLEEP_LOGS_STORAGE_KEY);
      if (data === null) {
        // Provide initial realistic sleep logs on first initialization
        const seeds = getInitialSeedSleepLogs();
        this.saveSleepLogs(seeds);
        return seeds;
      }
      const parsed: SleepLog[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveSleepLogs(logs: SleepLog[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SLEEP_LOGS_STORAGE_KEY, JSON.stringify(logs));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save sleep logs to localStorage', e);
    }
  },

  getActiveSleepSession(): ActiveSleepSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(ACTIVE_SLEEP_SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveActiveSleepSession(session: ActiveSleepSession): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACTIVE_SLEEP_SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save active sleep session', e);
    }
  },

  clearActiveSleepSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(ACTIVE_SLEEP_SESSION_KEY);
    } catch {}
  },

  saveSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(INITIALIZED_KEY, 'true');
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  },

  clearAll(): void {
    this.clearAllData();
  },

  clearAllData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SLEEP_LOGS_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem(ACTIVE_SLEEP_SESSION_KEY);
    localStorage.setItem(SAVINGS_GOALS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SAVINGS_TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(SAVINGS_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SAVINGS_SETTINGS));
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(INITIALIZED_KEY, 'true');
  },

  resetToDefaults(): {
    habits: Habit[];
    completions: HabitCompletion[];
    todos: Todo[];
    settings: UserSettings;
  } {
    return this.resetToSeed();
  },

  resetToSeed(): {
    habits: Habit[];
    completions: HabitCompletion[];
    todos: Todo[];
    settings: UserSettings;
  } {
    this.clearAllData();
    const seedSleep = getInitialSeedSleepLogs();
    this.saveSleepLogs(seedSleep);
    return getInitialSeedData();
  },

  exportBackupJson(): string {
    return JSON.stringify(
      {
        version: '2.2',
        exportedAt: new Date().toISOString(),
        habits: this.getHabits(),
        completions: this.getCompletions(),
        todos: this.getTodos(),
        goals: this.getGoals(),
        sleepLogs: this.getSleepLogs(),
        savingsGoals: this.getSavingsGoals(),
        savingsTransactions: this.getSavingsTransactions(),
        savingsSettings: this.getSavingsSettings(),
        settings: this.getSettings(),
      },
      null,
      2
    );
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.habits) && Array.isArray(parsed.todos)) {
        this.saveHabits(parsed.habits);
        this.saveCompletions(parsed.completions || []);
        this.saveTodos(parsed.todos);
        if (Array.isArray(parsed.goals)) {
          this.saveGoals(parsed.goals);
        }
        if (Array.isArray(parsed.sleepLogs)) {
          this.saveSleepLogs(parsed.sleepLogs);
        }
        if (Array.isArray(parsed.savingsGoals)) {
          this.saveSavingsGoals(parsed.savingsGoals);
        }
        if (Array.isArray(parsed.savingsTransactions)) {
          this.saveSavingsTransactions(parsed.savingsTransactions);
        }
        if (parsed.savingsSettings) {
          this.saveSavingsSettings(parsed.savingsSettings);
        }
        if (parsed.settings) {
          this.saveSettings(parsed.settings);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getCachedUserId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(CACHED_USER_KEY) || null;
    } catch {
      return null;
    }
  },

  setCachedUserId(uid: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (uid) {
        localStorage.setItem(CACHED_USER_KEY, uid);
      } else {
        localStorage.removeItem(CACHED_USER_KEY);
      }
    } catch {}
  },

  getDeletedIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(DELETED_IDS_KEY);
      if (!raw) return new Set();
      const list: string[] = JSON.parse(raw);
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  },

  markDeleted(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const current = this.getDeletedIds();
      current.add(id);
      // Keep at most 200 recent deleted IDs to keep storage clean
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
    } catch {}
  },

  unmarkDeleted(id: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const current = this.getDeletedIds();
      current.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(current)));
    } catch {}
  },

  clearDeletedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(DELETED_IDS_KEY);
    } catch {}
  },

  clearGuestNotificationStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('lifeos_notifications_v1');
      localStorage.removeItem('lifeos_reminders_v1');
      localStorage.removeItem('lifeos_notif_settings_v1');
      localStorage.removeItem('lifeos_ai_briefings_v1');
      localStorage.removeItem('lifeos_dismissed_notif_keys');
      localStorage.removeItem('lifeos_notif_cleared_at');
      localStorage.removeItem('lifeos_deleted_notif_ids_v1');
    } catch {}
  },

  clearLocalUserData(userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToClear = [
        HABITS_STORAGE_KEY,
        COMPLETIONS_STORAGE_KEY,
        TODOS_STORAGE_KEY,
        GOALS_STORAGE_KEY,
        SETTINGS_STORAGE_KEY,
        SLEEP_LOGS_STORAGE_KEY,
        ACTIVE_SLEEP_SESSION_KEY,
        SAVINGS_GOALS_STORAGE_KEY,
        SAVINGS_TRANSACTIONS_STORAGE_KEY,
        SAVINGS_SETTINGS_STORAGE_KEY,
        DELETED_IDS_KEY,
        'lifeos_notifications_v1',
        'lifeos_reminders_v1',
        'lifeos_notif_settings_v1',
        'lifeos_ai_briefings_v1',
        'lifeos_dismissed_notif_keys',
        'lifeos_notif_cleared_at',
        'lifeos_deleted_notif_ids_v1',
        'lifeos_pending_cloud_writes',
      ];

      for (const k of keysToClear) {
        localStorage.removeItem(k);
        if (userId) {
          localStorage.removeItem(`${k}_${userId}`);
        }
      }

      if (userId) {
        localStorage.removeItem(`lifeos_synced_ids_${userId}`);
        localStorage.removeItem(`lifeos_pending_writes_${userId}`);
        localStorage.removeItem(`lifeos_deleted_notif_ids_${userId}`);
        // Note: We intentionally keep lifeos_dismissed_notif_keys_${userId} and
        // lifeos_notif_cleared_at_${userId} scoped strictly to userId so that
        // re-logging into the same Gmail account never resurrects deleted alerts,
        // while a different Gmail account only ever reads its own uid-scoped keys.
      }
    } catch {}
  },

  getNotifications(userId?: string): NotificationRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notifications_v1_${uid}` : 'lifeos_notifications_v1';
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveNotifications(list: NotificationRecord[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notifications_v1_${uid}` : 'lifeos_notifications_v1';
      localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
    } catch {}
  },

  getReminders(userId?: string): ReminderDefinition[] {
    if (typeof window === 'undefined') return [];
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_reminders_v1_${uid}` : 'lifeos_reminders_v1';
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveReminders(list: ReminderDefinition[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_reminders_v1_${uid}` : 'lifeos_reminders_v1';
      localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
    } catch {}
  },

  getNotificationSettings(userId?: string): NotificationSettings | null {
    if (typeof window === 'undefined') return null;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notif_settings_v1_${uid}` : 'lifeos_notif_settings_v1';
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  },

  saveNotificationSettings(settings: NotificationSettings, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notif_settings_v1_${uid}` : 'lifeos_notif_settings_v1';
      localStorage.setItem(key, JSON.stringify(settings));
    } catch {}
  },

  getAIBriefings(userId?: string): AIDailyBriefing[] {
    if (typeof window === 'undefined') return [];
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_ai_briefings_v1_${uid}` : 'lifeos_ai_briefings_v1';
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveAIBriefings(list: AIDailyBriefing[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_ai_briefings_v1_${uid}` : 'lifeos_ai_briefings_v1';
      localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
    } catch {}
  },

  getNotificationsClearedAt(userId?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notif_cleared_at_${uid}` : 'lifeos_notif_cleared_at';
      return localStorage.getItem(key) || null;
    } catch {
      return null;
    }
  },

  setNotificationsClearedAt(isoTimestamp: string | null, userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_notif_cleared_at_${uid}` : 'lifeos_notif_cleared_at';
      if (isoTimestamp) {
        localStorage.setItem(key, isoTimestamp);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  },

  getDismissedNotificationKeys(userId?: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_dismissed_notif_keys_${uid}` : 'lifeos_dismissed_notif_keys';
      const raw = localStorage.getItem(key);
      if (!raw) return new Set();
      const list: string[] = JSON.parse(raw);
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  },

  saveDismissedNotificationKeys(keys: Set<string> | string[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const uid = userId || this.getCachedUserId();
      const key = uid ? `lifeos_dismissed_notif_keys_${uid}` : 'lifeos_dismissed_notif_keys';
      const arr = Array.from(keys).slice(-500);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  },

  addDismissedNotificationKey(keyOrKeys: string | string[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getDismissedNotificationKeys(userId);
      const items = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
      for (const k of items) {
        if (k && typeof k === 'string') current.add(k);
      }
      this.saveDismissedNotificationKeys(current, userId);
    } catch {}
  },

  getSyncedKey(userId?: string): string {
    const uid = userId || this.getCachedUserId();
    return uid ? `lifeos_synced_ids_${uid}` : SYNCED_IDS_KEY;
  },

  getSyncedIds(userId?: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const key = this.getSyncedKey(userId);
      let raw = localStorage.getItem(key);
      // Seamless one-time migration from legacy un-scoped key
      if (!raw && key !== SYNCED_IDS_KEY) {
        const legacy = localStorage.getItem(SYNCED_IDS_KEY);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(key, legacy);
          // Remove legacy key so it is claimed only once and cannot bleed into subsequent accounts
          localStorage.removeItem(SYNCED_IDS_KEY);
        }
      }
      if (!raw) return new Set();
      const list: string[] = JSON.parse(raw);
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  },

  markSynced(idOrIds: string | string[], userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getSyncedKey(userId);
      const current = this.getSyncedIds(userId);
      const items = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      for (const id of items) {
        if (id && typeof id === 'string') current.add(id);
      }
      const arr = Array.from(current).slice(-2000);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  },

  unmarkSynced(id: string, userId?: string): void {
    if (typeof window === 'undefined' || !id) return;
    try {
      const key = this.getSyncedKey(userId);
      const current = this.getSyncedIds(userId);
      current.delete(id);
      localStorage.setItem(key, JSON.stringify(Array.from(current)));
    } catch {}
  },

  clearSyncedIds(userId?: string): void {
    if (typeof window === 'undefined') return;
    try {
      const key = this.getSyncedKey(userId);
      localStorage.removeItem(key);
    } catch {}
  },
};
