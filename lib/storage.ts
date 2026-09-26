import { Habit, HabitCompletion, Todo, UserSettings } from './types';
import { getTodayKey, addDays } from './date-utils';

const HABITS_STORAGE_KEY = 'life_os_habits_v1';
const COMPLETIONS_STORAGE_KEY = 'life_os_completions_v1';
const TODOS_STORAGE_KEY = 'life_os_todos_v1';
const SETTINGS_STORAGE_KEY = 'life_os_settings_v1';
const INITIALIZED_KEY = 'life_os_initialized_v2';

export const INITIAL_SETTINGS: UserSettings = {
  theme: 'light',
  animationsEnabled: true,
  reminderNotifications: false,
  userName: 'Productive Achiever',
};

export function getInitialSeedData(): {
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  settings: UserSettings;
} {
  const today = getTodayKey();
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);

  const habits: Habit[] = [
    {
      id: 'habit_1',
      name: 'Morning Meditation & Breathing',
      description: '10 minutes of calm mindfulness before checking notifications',
      icon: 'sparkles',
      color: '#0284c7', // Sky Blue
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: threeDaysAgo,
      status: 'active',
      reminderTime: '07:30',
      category: 'Mindfulness',
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'habit_2',
      name: 'Deep Focus Study / Coding',
      description: '60 minutes uninterrupted deep work session',
      icon: 'code',
      color: '#4f46e5', // Indigo
      frequency: 'weekdays',
      daysOfWeek: [1, 2, 3, 4, 5],
      startDate: threeDaysAgo,
      status: 'active',
      reminderTime: '10:00',
      category: 'Productivity',
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'habit_3',
      name: 'Physical Exercise & Movement',
      description: 'Gym, running, or home workout session',
      icon: 'dumbbell',
      color: '#16a34a', // Emerald Green
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: threeDaysAgo,
      status: 'active',
      reminderTime: '17:30',
      category: 'Health',
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
    {
      id: 'habit_4',
      name: 'Read 20 Pages',
      description: 'Non-fiction, book, or educational article',
      icon: 'book-open',
      color: '#d97706', // Amber
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate: threeDaysAgo,
      status: 'active',
      reminderTime: '21:00',
      category: 'Growth',
      createdAt: threeDaysAgo,
      updatedAt: threeDaysAgo,
    },
  ];

  // Seed completions for previous days to give a healthy starting streak!
  const completions: HabitCompletion[] = [
    // 3 days ago: all completed
    { id: 'c_1', habitId: 'habit_1', date: threeDaysAgo, completedAt: `${threeDaysAgo}T08:00:00Z` },
    { id: 'c_2', habitId: 'habit_2', date: threeDaysAgo, completedAt: `${threeDaysAgo}T11:30:00Z` },
    { id: 'c_3', habitId: 'habit_3', date: threeDaysAgo, completedAt: `${threeDaysAgo}T18:00:00Z` },
    { id: 'c_4', habitId: 'habit_4', date: threeDaysAgo, completedAt: `${threeDaysAgo}T21:30:00Z` },

    // 2 days ago: all completed
    { id: 'c_5', habitId: 'habit_1', date: twoDaysAgo, completedAt: `${twoDaysAgo}T08:00:00Z` },
    { id: 'c_6', habitId: 'habit_2', date: twoDaysAgo, completedAt: `${twoDaysAgo}T11:30:00Z` },
    { id: 'c_7', habitId: 'habit_3', date: twoDaysAgo, completedAt: `${twoDaysAgo}T18:00:00Z` },
    { id: 'c_8', habitId: 'habit_4', date: twoDaysAgo, completedAt: `${twoDaysAgo}T21:30:00Z` },

    // Yesterday: all completed
    { id: 'c_9', habitId: 'habit_1', date: yesterday, completedAt: `${yesterday}T08:00:00Z` },
    { id: 'c_10', habitId: 'habit_2', date: yesterday, completedAt: `${yesterday}T11:30:00Z` },
    { id: 'c_11', habitId: 'habit_3', date: yesterday, completedAt: `${yesterday}T18:00:00Z` },
    { id: 'c_12', habitId: 'habit_4', date: yesterday, completedAt: `${yesterday}T21:30:00Z` },

    // Today: partial completion to show active progress immediately
    { id: 'c_13', habitId: 'habit_1', date: today, completedAt: `${today}T08:15:00Z` },
  ];

  const todos: Todo[] = [
    // Yesterday's todos (completed)
    {
      id: 'todo_prev_1',
      title: 'Review project specifications',
      date: yesterday,
      priority: 'high',
      dueTime: '14:00',
      notes: 'Reviewed all acceptance criteria',
      completed: true,
      order: 0,
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    // Today's todos
    {
      id: 'todo_1',
      title: 'Prepare presentation slides for team sync',
      date: today,
      priority: 'high',
      dueTime: '15:00',
      notes: 'Focus on quarterly achievements and milestones',
      completed: true,
      order: 0,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: 'todo_2',
      title: 'Submit feedback on design prototypes',
      date: today,
      priority: 'medium',
      dueTime: '17:00',
      notes: 'Check responsive layouts and color contrast',
      completed: false,
      order: 1,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: 'todo_3',
      title: 'Plan weekly grocery & meal prep',
      date: today,
      priority: 'low',
      dueTime: '19:30',
      notes: 'High protein ingredients & fresh produce',
      completed: false,
      order: 2,
      createdAt: today,
      updatedAt: today,
    },
  ];

  return {
    habits,
    completions,
    todos,
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
      const existingHabits = localStorage.getItem(HABITS_STORAGE_KEY);
      const existingTodos = localStorage.getItem(TODOS_STORAGE_KEY);
      if (existingHabits === null && existingTodos === null) {
        const seed = getInitialSeedData();
        localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(seed.habits));
        localStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(seed.completions));
        localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(seed.todos));
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(seed.settings));
      }
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
  },

  getHabits(): Habit[] {
    if (typeof window === 'undefined') return [];
    try {
      this.initSeedDataIfEmpty();
      const data = localStorage.getItem(HABITS_STORAGE_KEY);
      if (data === null) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveHabits(habits: Habit[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
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
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveCompletions(completions: HabitCompletion[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(COMPLETIONS_STORAGE_KEY, JSON.stringify(completions));
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
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveTodos(todos: Todo[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
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
      return { ...INITIAL_SETTINGS, ...JSON.parse(data) };
    } catch {
      return INITIAL_SETTINGS;
    }
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
    const seed = getInitialSeedData();
    this.saveHabits(seed.habits);
    this.saveCompletions(seed.completions);
    this.saveTodos(seed.todos);
    this.saveSettings(seed.settings);
    if (typeof window !== 'undefined') {
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
    return seed;
  },

  exportBackupJson(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        habits: this.getHabits(),
        completions: this.getCompletions(),
        todos: this.getTodos(),
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
};
