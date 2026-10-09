import { Habit, HabitCompletion, Todo, UserSettings, Goal, SleepLog, ActiveSleepSession } from './types';
import { getInitialSeedSleepLogs, DEFAULT_SLEEP_SETTINGS } from './sleep-service';

const HABITS_STORAGE_KEY = 'life_os_habits_v1';
const COMPLETIONS_STORAGE_KEY = 'life_os_completions_v1';
const TODOS_STORAGE_KEY = 'life_os_todos_v1';
const GOALS_STORAGE_KEY = 'life_os_goals_v1';
const SETTINGS_STORAGE_KEY = 'life_os_settings_v1';
const SLEEP_LOGS_STORAGE_KEY = 'life_os_sleep_logs_v1';
const ACTIVE_SLEEP_SESSION_KEY = 'life_os_active_sleep_session_v1';
const INITIALIZED_KEY = 'life_os_initialized_v2';
const CACHED_USER_KEY = 'life_os_cached_uid';
const DELETED_IDS_KEY = 'life_os_deleted_ids_v1';

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
        version: '2.1',
        exportedAt: new Date().toISOString(),
        habits: this.getHabits(),
        completions: this.getCompletions(),
        todos: this.getTodos(),
        goals: this.getGoals(),
        sleepLogs: this.getSleepLogs(),
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
};
