import {
  Goal,
  Milestone,
  GoalStatus,
  DailyGoalContribution,
  GoalAnalyticsData,
  GoalTimeHorizon,
  Habit,
  HabitCompletion,
  Todo,
} from './types';
import { getTodayKey } from './date-utils';

/**
 * Re-calculate progress percentage (0-100) based on goal type and current values.
 */
export function calculateGoalProgress(goal: Partial<Goal>): number {
  const measurementType = goal.measurementType || 'milestones';
  const target = Number(goal.targetValue) || 1;
  const current = Number(goal.currentValue) || 0;

  if (measurementType === 'checkbox') {
    return current >= 1 ? 100 : 0;
  }

  if (measurementType === 'percentage') {
    return Math.min(100, Math.max(0, Math.round(current)));
  }

  if (measurementType === 'milestones') {
    const milestones = goal.milestones || [];
    if (milestones.length === 0) {
      return target > 0 ? Math.min(100, Math.max(0, Math.round((current / target) * 100))) : 0;
    }
    const completedCount = milestones.filter((m) => m.status === 'completed' || m.progress >= 100).length;
    return Math.min(100, Math.round((completedCount / milestones.length) * 100));
  }

  if (measurementType === 'number' || measurementType === 'counter' || measurementType === 'streak') {
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  }

  return 0;
}

/**
 * Automatically determine the status of a goal based on dates and progress,
 * respecting manual pauses or cancellations.
 */
export function determineGoalStatus(goal: Goal, todayKey: string = getTodayKey()): GoalStatus {
  if (goal.status === 'cancelled' || goal.status === 'paused') {
    return goal.status;
  }

  const progress = calculateGoalProgress(goal);
  if (progress >= 100) {
    return 'completed';
  }

  if (!goal.targetDate) {
    return goal.status || 'active';
  }

  // Check if overdue
  if (goal.targetDate < todayKey) {
    return 'delayed';
  }

  // If start and target dates exist, calculate expected progress
  if (goal.startDate && goal.startDate < goal.targetDate) {
    const start = new Date(goal.startDate).getTime();
    const end = new Date(goal.targetDate).getTime();
    const now = new Date(todayKey).getTime();

    if (now >= start && end > start) {
      const elapsedFraction = (now - start) / (end - start);
      const expectedProgress = elapsedFraction * 100;

      // If more than 20% behind expected pacing
      if (progress < expectedProgress - 20) {
        return 'at_risk';
      }
      return 'on_track';
    }
  }

  return 'active';
}

/**
 * Compute the daily contribution of today's completed habits, todos, and tracker logs to active goals.
 */
export function computeDailyGoalContributions(
  goals: Goal[],
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  todayKey: string = getTodayKey()
): DailyGoalContribution[] {
  const contributions: DailyGoalContribution[] = [];
  const completedHabitIds = new Set(
    completions.filter((c) => c.date === todayKey).map((c) => c.habitId)
  );
  const completedTodosToday = todos.filter((t) => t.date === todayKey && t.completed);

  for (const goal of goals) {
    if (goal.status === 'completed' || goal.status === 'cancelled') continue;

    // Check linked habits
    const linkedHabitsDone = (goal.relatedHabits || []).filter((hId) => completedHabitIds.has(hId));
    // Check linked todos
    const linkedTodosDone = completedTodosToday.filter((t) =>
      (goal.relatedTasks || []).includes(t.id) ||
      (goal.relatedTasks || []).some((taskTitle) => taskTitle.toLowerCase() === t.title.toLowerCase())
    );

    // Check completed milestones with today deadline or recent completion
    const milestonesCompleted = (goal.milestones || []).filter(
      (m) => m.status === 'completed' && m.deadline === todayKey
    );

    const parts: string[] = [];
    if (linkedHabitsDone.length > 0) {
      parts.push(`${linkedHabitsDone.length} habit${linkedHabitsDone.length > 1 ? 's' : ''} completed`);
    }
    if (linkedTodosDone.length > 0) {
      parts.push(`${linkedTodosDone.length} task${linkedTodosDone.length > 1 ? 's' : ''} finished`);
    }
    if (milestonesCompleted.length > 0) {
      parts.push(`"${milestonesCompleted[0].title}" milestone reached`);
    }

    if (parts.length > 0) {
      const currentProgress = goal.progress || calculateGoalProgress(goal);
      const progressDelta = Math.min(100, Math.round(5 * (linkedHabitsDone.length + linkedTodosDone.length)));

      contributions.push({
        goalId: goal.id,
        goalTitle: goal.title,
        contribution: parts.join(' · '),
        progressDelta,
        newProgress: currentProgress,
        category: goal.category,
      });
    }
  }

  return contributions;
}

/**
 * Aggregates all analytics for the Goal Dashboard.
 */
export function calculateGoalAnalytics(goals: Goal[], todayKey: string = getTodayKey()): GoalAnalyticsData {
  const totalGoals = goals.length;
  let completedGoals = 0;
  let activeGoals = 0;
  let onTrackGoals = 0;
  let atRiskGoals = 0;
  let delayedGoals = 0;

  let totalMilestones = 0;
  let completedMilestones = 0;

  const byHorizon: Record<GoalTimeHorizon, number> = {
    today: 0,
    this_week: 0,
    this_month: 0,
    '3_months': 0,
    '6_months': 0,
    this_year: 0,
    long_term: 0,
  };

  const byCategory: Record<string, { total: number; completed: number; rate: number }> = {};
  const upcomingDeadlines: GoalAnalyticsData['upcomingDeadlines'] = [];

  for (const goal of goals) {
    const status = determineGoalStatus(goal, todayKey);

    if (status === 'completed') completedGoals++;
    else if (status === 'on_track') onTrackGoals++;
    else if (status === 'at_risk') atRiskGoals++;
    else if (status === 'delayed') delayedGoals++;

    if (status !== 'completed' && status !== 'cancelled') {
      activeGoals++;
    }

    // Milestones
    for (const m of goal.milestones || []) {
      totalMilestones++;
      if (m.status === 'completed' || m.progress >= 100) {
        completedMilestones++;
      }
    }

    // Horizon
    if (goal.timeHorizon && byHorizon[goal.timeHorizon] !== undefined) {
      byHorizon[goal.timeHorizon]++;
    }

    // Category
    const cat = goal.category || 'General';
    if (!byCategory[cat]) {
      byCategory[cat] = { total: 0, completed: 0, rate: 0 };
    }
    byCategory[cat].total++;
    if (status === 'completed') {
      byCategory[cat].completed++;
    }

    // Deadlines
    if (goal.targetDate && status !== 'completed' && status !== 'cancelled') {
      const targetTime = new Date(goal.targetDate).getTime();
      const nowTime = new Date(todayKey).getTime();
      const diffDays = Math.round((targetTime - nowTime) / (1000 * 60 * 60 * 24));

      upcomingDeadlines.push({
        goalId: goal.id,
        goalTitle: goal.title,
        deadline: goal.targetDate,
        daysLeft: diffDays,
        isOverdue: diffDays < 0,
      });
    }
  }

  // Calculate category rates
  for (const cat of Object.keys(byCategory)) {
    const item = byCategory[cat];
    item.rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
  }

  // Sort upcoming deadlines: overdue first, then nearest
  upcomingDeadlines.sort((a, b) => a.daysLeft - b.daysLeft);

  const overallCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  const milestoneCompletionRate =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return {
    totalGoals,
    completedGoals,
    activeGoals,
    onTrackGoals,
    atRiskGoals,
    delayedGoals,
    overallCompletionRate,
    milestoneCompletionRate,
    byHorizon,
    byCategory,
    upcomingDeadlines: upcomingDeadlines.slice(0, 8),
  };
}

export const TIME_HORIZONS: { id: GoalTimeHorizon; label: string; badge: string }[] = [
  { id: 'today', label: 'Today', badge: '1D' },
  { id: 'this_week', label: 'This Week', badge: '7D' },
  { id: 'this_month', label: 'This Month', badge: '30D' },
  { id: '3_months', label: '3 Months', badge: 'QTR' },
  { id: '6_months', label: '6 Months', badge: 'MID' },
  { id: 'this_year', label: 'This Year', badge: '1Y' },
  { id: 'long_term', label: 'Long Term', badge: 'VISION' },
];

export const GOAL_CATEGORIES = [
  'Academic & Study',
  'Career & Work',
  'Health & Fitness',
  'Finance & Savings',
  'Personal Growth',
  'Projects',
  'Custom',
];

export const GOAL_TYPES: { id: Goal['measurementType']; label: string; description: string }[] = [
  { id: 'milestones', label: 'Milestone-based', description: 'Track progress through distinct sub-milestones' },
  { id: 'number', label: 'Target Number', description: 'Reach a numerical goal (e.g. solve 500 questions)' },
  { id: 'counter', label: 'Counter Goal', description: 'Increment / decrement units as you progress' },
  { id: 'percentage', label: 'Percentage Goal', description: 'Track completion from 0% to 100%' },
  { id: 'streak', label: 'Streak Goal', description: 'Maintain consistent daily action over consecutive days' },
  { id: 'checkbox', label: 'Checkbox (Done/Not Done)', description: 'Single completion toggle' },
];
