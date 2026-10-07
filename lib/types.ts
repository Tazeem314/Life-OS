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

// ==========================================
// GOALS & ROADMAP TYPES
// ==========================================

export type GoalTimeHorizon =
  | 'today'
  | 'this_week'
  | 'this_month'
  | '3_months'
  | '6_months'
  | 'this_year'
  | 'long_term';

export type GoalType =
  | 'checkbox'
  | 'number'
  | 'counter'
  | 'percentage'
  | 'streak'
  | 'milestones';

export type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'delayed'
  | 'completed'
  | 'paused'
  | 'cancelled';

export type GoalPriority = 'low' | 'medium' | 'high';

export interface GoalTask {
  id: string;
  goalId?: string;
  milestoneId?: string;
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  priority?: 1 | 2 | 3;
  week?: string; // e.g. "Week 1", "Week 2", "Week 3", "Week 4"
  notes?: string;
}

export interface Milestone {
  id: string;
  goalId?: string;
  title: string;
  description?: string;
  deadline?: string; // YYYY-MM-DD
  month?: string; // YYYY-MM or "October 2026"
  week?: string; // e.g. "Week 1" or "2026-W42"
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  progress: number; // 0 - 100
  tasks?: GoalTask[];
  relatedTasks?: string[];
  relatedTrackers?: {
    name: string;
    target: number;
    current: number;
    unit: string;
  }[];
}

export interface GoalTracker {
  id: string;
  type: 'study' | 'workout' | 'savings' | 'custom';
  name: string;
  target: number;
  current: number;
  unit: string;
}

export type ChapterDifficulty = 'easy' | 'medium' | 'hard' | 'lengthy';

export interface ChapterTask {
  id: string;
  title: string;
  completed: boolean;
  dayOffset?: number; // 1-indexed relative to chapter start (e.g. Day 1, Day 2, Day 3)
}

export interface ChapterItem {
  id: string;
  number: number;
  title: string;
  assignedDays: number; // e.g. 3 days, 5 days, 7 days
  difficulty?: ChapterDifficulty;
  status: 'not_started' | 'in_progress' | 'completed';
  completed: boolean;
  notes?: string;
  currentDay?: number; // e.g. Day 1 of 3
  tasks?: ChapterTask[];
  startDayOffset?: number; // 0-indexed day offset from start of goal
  endDayOffset?: number; // end day offset
  startDate?: string;
  endDate?: string;
}

export interface AcademicMetadata {
  isStudyGoal?: boolean;
  subject?: string;
  totalChapters?: number;
  completedChapters?: number;
  targetQuestions?: number;
  solvedQuestions?: number;
  revisionSessions?: number;
  completedRevisions?: number;
  samplePapersTarget?: number;
  samplePapersCompleted?: number;
  mockTestTargetScore?: number;
  latestMockScore?: number;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: GoalPriority;
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  status: GoalStatus;
  progress: number; // 0 - 100
  timeHorizon: GoalTimeHorizon;
  measurementType: GoalType;
  targetValue: number;
  currentValue: number;
  unit?: string;
  chapters?: ChapterItem[];
  totalChapters?: number;
  completedChapters?: number;
  milestones: Milestone[];
  relatedTasks: string[]; // Todo IDs or titles
  relatedHabits: string[]; // Habit IDs
  relatedTrackers: GoalTracker[];
  parentGoalId?: string; // For Goal Hierarchy
  notes?: string;
  academicMetadata?: AcademicMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoalContribution {
  goalId: string;
  goalTitle: string;
  contribution: string;
  progressDelta: number;
  newProgress: number;
  category: string;
}

export interface GoalAnalyticsData {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  onTrackGoals: number;
  atRiskGoals: number;
  delayedGoals: number;
  overallCompletionRate: number;
  milestoneCompletionRate: number;
  byHorizon: Record<GoalTimeHorizon, number>;
  byCategory: Record<string, { total: number; completed: number; rate: number }>;
  upcomingDeadlines: {
    goalId: string;
    goalTitle: string;
    deadline: string;
    daysLeft: number;
    isOverdue: boolean;
  }[];
}

export interface AIPlanGeneratedResult {
  title: string;
  description: string;
  category: string;
  timeHorizon: GoalTimeHorizon;
  measurementType: GoalType;
  targetValue: number;
  currentValue: number;
  unit?: string;
  targetDate: string;
  milestones: {
    id: string;
    title: string;
    description?: string;
    deadline: string;
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
  }[];
  monthlyTargets: string[];
  weeklyTargets: string[];
  suggestedTasks: string[];
  suggestedHabits: {
    name: string;
    frequency: 'daily' | 'weekdays' | 'weekly';
    category?: string;
    icon: string;
    color: string;
  }[];
  suggestedTrackers: {
    type: 'study' | 'workout' | 'savings' | 'custom';
    name: string;
    target: number;
    current: number;
    unit: string;
  }[];
  academicMetadata?: AcademicMetadata;
  strategicAdvice: string;
}

export interface AIReplanGeneratedResult {
  pacingSummary: string;
  revisedStatus: GoalStatus;
  workloadRedistribution: string;
  adjustedMilestones: Milestone[];
  recommendedPriorities: string[];
  scheduleAdjustmentAdvice: string;
}

export interface AIReviewReport {
  briefing: string;
  onTrackGoals: string[];
  atRiskGoals: string[];
  upcomingDeadlines: { title: string; deadline: string; daysLeft: number }[];
  recommendedPriorities: string[];
  actionableTips: string[];
}


