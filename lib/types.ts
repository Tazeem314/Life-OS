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

export type ActiveTab = 'dashboard' | 'habits' | 'todos' | 'goals' | 'calendar' | 'progress' | 'settings';

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
// GOALS & PLANNING MODULE TYPES (53-SECTION SPEC)
// ==========================================

export type GoalDurationType =
  | '1_week'
  | '1_month'
  | '3_months'
  | '6_months'
  | '1_year'
  | 'long_term'
  | 'custom';

export type GoalTimeHorizon = GoalDurationType;

export type GoalMeasurementType =
  | 'completion'    // Not Started -> In Progress -> Completed
  | 'percentage'    // 0% - 100% progress
  | 'quantity'      // e.g. Save ₹20,000 -> ₹8,500 / ₹20,000
  | 'count'         // e.g. Read 20 books -> 7 / 20
  | 'time'          // e.g. Study 100 hours -> 63 / 100 hours
  | 'consistency'   // e.g. Exercise 4 times per week -> 3 / 4 completed
  | 'curriculum'    // Study / Curriculum-based (Chapters, Topics, Tasks, Assigned effort)
  | 'custom';

export type GoalStatus =
  | 'not_started'
  | 'in_progress'
  | 'on_track'
  | 'ahead'
  | 'at_risk'
  | 'behind'
  | 'completed'
  | 'paused'
  | 'archived';

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';

export type GoalBufferPreference = 'none' | 'small' | 'normal' | 'large' | 'custom';

export type GoalPlanningMethod = 'ai' | 'manual' | 'hybrid';

export interface SubtopicItem {
  id: string;
  title: string;
  assignedDays: number;
  completed: boolean;
  progress: number;
}

export interface ChapterTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  dayOffset?: number; // 1-indexed relative to chapter start (e.g. Day 1, Day 2, Day 3)
}

export type ChapterDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard';

export interface ChapterItem {
  id: string;
  number: number;
  title: string;
  description?: string;
  difficulty: ChapterDifficulty;
  estimatedDays: number;
  assignedDays: number; // User custom assigned days (NEVER divided equally!)
  startDate?: string;
  endDate?: string;
  progress?: number; // 0 - 100
  status: 'not_started' | 'in_progress' | 'completed';
  completed: boolean;
  priority?: GoalPriority;
  weight?: number;
  notes?: string;
  isFixed?: boolean; // Fixed items (e.g. Exam on Nov 15) must not be shifted automatically
  subtopics?: SubtopicItem[];
  tasks?: ChapterTask[];
  revisionDays?: number;
  practiceDays?: number;
}

export interface GoalTask {
  id: string;
  goalId?: string;
  milestoneId?: string;
  chapterId?: string;
  topicId?: string;
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
  month?: string; // e.g. "October 2026" or YYYY-MM
  week?: string; // e.g. "Week 1"
  status: 'not_started' | 'in_progress' | 'at_risk' | 'completed';
  progress: number; // 0 - 100
  weight?: number;
  priority?: GoalPriority;
  startDate?: string;
  endDate?: string;
  chapters?: ChapterItem[];
  tasks?: GoalTask[];
  relatedTasks?: string[];
}

export interface GoalWeeklyReview {
  id: string;
  goalId: string;
  weekLabel: string;
  periodStart: string;
  periodEnd: string;
  plannedActionsCount: number;
  completedActionsCount: number;
  completionRate: number;
  progressGained: number;
  whatWentWell?: string;
  whatWasMissed?: string;
  whyMissed?: string;
  nextWeekFocus?: string;
  aiSummary?: string;
  createdAt: string;
}

export interface GoalHistoryAuditItem {
  id: string;
  goalId: string;
  changeType:
    | 'duration_changed'
    | 'deadline_changed'
    | 'status_changed'
    | 'chapter_completed'
    | 'buffer_adjusted'
    | 'replan_applied';
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface GoalTracker {
  id: string;
  type: 'study' | 'workout' | 'savings' | 'custom';
  name: string;
  target: number;
  current: number;
  unit: string;
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
  userId?: string;
  title: string;
  description?: string;
  why?: string; // "Why this goal matters" (Section 2 & 3)
  category: string;
  priority: GoalPriority;
  startDate: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD
  targetDate?: string; // alias for deadline
  durationType: GoalDurationType;
  timeHorizon?: GoalTimeHorizon; // alias for durationType
  measurementType: GoalMeasurementType;
  planningMethod?: GoalPlanningMethod;
  status: GoalStatus;
  progress: number; // 0 - 100 (weighted progress)
  plannedProgress: number; // expected by today (0 - 100)
  actualProgress: number; // actual accomplished (0 - 100)
  progressDifference: number; // actual - planned (e.g. -12%)
  velocity?: number; // average progress % per week
  expectedCompletionDate?: string; // calculated completion date
  targetValue: number;
  currentValue: number;
  unit?: string;
  bufferPreference: GoalBufferPreference;
  bufferDays: number;
  isStudyGoal?: boolean;
  chapters?: ChapterItem[];
  milestones: Milestone[];
  reviews?: GoalWeeklyReview[];
  history?: GoalHistoryAuditItem[];
  linkedHabitIds?: string[];
  linkedTaskIds?: string[];
  relatedTasks?: string[];
  relatedHabits?: string[];
  relatedTrackers?: GoalTracker[];
  academicMetadata?: AcademicMetadata;
  notes?: string;
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
  behindGoals: number;
  overallCompletionRate: number;
  milestoneCompletionRate: number;
  plannedVsActualDiff: number;
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
  why?: string;
  category: string;
  durationType: GoalDurationType;
  timeHorizon?: GoalTimeHorizon;
  measurementType: GoalMeasurementType;
  targetValue: number;
  currentValue: number;
  unit?: string;
  deadline: string;
  targetDate?: string;
  milestones: {
    id: string;
    title: string;
    description?: string;
    deadline: string;
    status: 'not_started' | 'in_progress' | 'completed';
    progress: number;
  }[];
  chapters?: ChapterItem[];
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
  suggestedTrackers?: {
    type: 'study' | 'workout' | 'savings' | 'custom';
    name: string;
    target: number;
    current: number;
    unit: string;
  }[];
  bufferDaysRecommendation?: number;
  strategicAdvice: string;
  academicMetadata?: AcademicMetadata;
}

export interface AIReplanGeneratedResult {
  pacingSummary: string;
  revisedStatus: GoalStatus;
  workloadRedistribution: string;
  proposedChanges: {
    id: string;
    type: 'extend_chapter' | 'reduce_buffer' | 'shift_deadline' | 'add_practice_day' | 'move_revision';
    description: string;
    impact: string;
  }[];
  adjustedMilestones: Milestone[];
  adjustedChapters?: ChapterItem[];
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


