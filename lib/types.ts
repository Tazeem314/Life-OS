export type HabitFrequency = 'daily' | 'weekdays' | 'weekly';

export type Priority = 'low' | 'medium' | 'high';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  // For 'weekdays' or 'weekly': days of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  daysOfWeek: number[]; 
  // For 'weekly': target times per week (optional)
  targetPerWeek?: number;
  startDate: string; // YYYY-MM-DD
  status: 'active' | 'paused';
  reminderTime?: string; // HH:MM
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completedAt: string; // ISO timestamp
}

export interface Todo {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  priority: Priority;
  dueTime?: string; // HH:MM
  notes?: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  animationsEnabled: boolean;
  reminderNotifications: boolean;
  userName: string;
}

export interface DayProgress {
  date: string;
  totalHabits: number;
  completedHabits: number;
  totalTodos: number;
  completedTodos: number;
  totalItems: number;
  completedItems: number;
  percentage: number;
  isFullyCompleted: boolean;
}

export interface HabitStreakInfo {
  habitId: string;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completedToday: boolean;
  isScheduledToday: boolean;
}

export interface OverallStreakInfo {
  currentDailyStreak: number;
  bestDailyStreak: number;
  totalFullyCompletedDays: number;
  totalHabitCompletions: number;
  totalTodoCompletions: number;
}

export type ActiveTab = 'dashboard' | 'habits' | 'todos' | 'calendar' | 'progress' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

// PHASE 2 ANALYTICS TYPES
export type TimeRangeOption = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface DailyMetric {
  dateKey: string;
  dateObj: Date;
  dayName: string;
  shortDate: string;
  scheduledHabits: number;
  completedHabits: number;
  totalTodos: number;
  completedTodos: number;
  totalWorkload: number;
  completedWorkload: number;
  percentage: number;
  isFullyCompleted: boolean;
  hasActivity: boolean;
}

export type TrendDirection = 'improving' | 'declining' | 'stable' | 'insufficient_data';

export interface HabitHistoryDay {
  dateKey: string;
  status: 'completed' | 'missed' | 'not_scheduled' | 'future';
  isToday: boolean;
}

export interface HabitAnalytics {
  habitId: string;
  habit: Habit;
  scheduledOccurrences: number;
  completedOccurrences: number;
  missedOccurrences: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  trend: TrendDirection;
  history: HabitHistoryDay[];
}

export interface PriorityBreakdown {
  total: number;
  completed: number;
  rate: number;
}

export interface TodoAnalytics {
  totalTodos: number;
  completedTodos: number;
  pendingTodos: number;
  completionRate: number;
  highPriority: PriorityBreakdown;
  mediumPriority: PriorityBreakdown;
  lowPriority: PriorityBreakdown;
  avgDailyTodos: number;
  activeDaysWithTodos: number;
}

export interface WeeklySummary {
  weekKey: string;
  weekIndex: number;
  startDate: string;
  endDate: string;
  label: string;
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number;
  habitCompletionRate: number;
  todoCompletionRate: number;
  fullyCompletedDays: number;
  avgDailyPercentage: number;
  days: DailyMetric[];
}

export interface MonthlyAnalytics {
  year: number;
  month: number; // 0 - 11
  monthName: string;
  totalScheduled: number;
  totalCompleted: number;
  completionRate: number;
  fullyCompletedDays: number;
  activeHabitsCount: number;
  totalTodos: number;
  habitCompletionRate: number;
  todoCompletionRate: number;
  dailyMetrics: DailyMetric[];
  isFuture: boolean;
  hasData: boolean;
}

export interface StreakInterval {
  id: string;
  startDate: string;
  endDate: string;
  lengthDays: number;
  isCurrent: boolean;
}

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4 | 5; // 0=none, 1=1-25%, 2=26-50%, 3=51-75%, 4=76-99%, 5=100%

export interface HeatmapDay {
  dateKey: string;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  dayNumber: number;
  monthIndex: number;
  monthName: string;
  percentage: number;
  totalItems: number;
  completedItems: number;
  scheduledHabits: number;
  completedHabits: number;
  totalTodos: number;
  completedTodos: number;
  isFullyCompleted: boolean;
  level: HeatmapLevel;
  isToday: boolean;
  isFuture: boolean;
}

export interface ProductivityInsight {
  id: string;
  type: 'trend' | 'achievement' | 'habit' | 'todo' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  tag?: string;
}

export interface PersonalRecord {
  id: string;
  title: string;
  value: string | number;
  subtext: string;
  icon: string;
}

