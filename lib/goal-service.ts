import {
  Goal,
  Milestone,
  GoalTask,
  GoalStatus,
  DailyGoalContribution,
  GoalAnalyticsData,
  GoalTimeHorizon,
  AIReplanGeneratedResult,
  Habit,
  HabitCompletion,
  Todo,
  ChapterItem,
  ChapterTask,
  ChapterDifficulty,
} from './types';
import { getTodayKey, addDays } from './date-utils';

export type SimpleGoalStatus = 'not_started' | 'in_progress' | 'at_risk' | 'completed';

export const SIMPLE_STATUS_META: Record<
  SimpleGoalStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  not_started: {
    label: 'Not Started',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    border: 'border-sky-200 dark:border-sky-800',
  },
  at_risk: {
    label: 'At Risk',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-800',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
};

/**
 * Re-calculate progress percentage (0-100) automatically based on chapters, tasks, or milestones.
 */
export function calculateGoalProgress(goal: Partial<Goal>): number {
  // If chapter-based goal, progress directly tracks completed chapters
  if (goal.chapters && goal.chapters.length > 0) {
    const total = goal.chapters.length;
    const completed = goal.chapters.filter((c) => c.completed).length;
    return Math.min(100, Math.round((completed / total) * 100));
  }

  const milestones = goal.milestones || [];
  if (milestones.length > 0) {
    let totalTasks = 0;
    let completedTasks = 0;

    milestones.forEach((m) => {
      if (m.tasks && m.tasks.length > 0) {
        totalTasks += m.tasks.length;
        completedTasks += m.tasks.filter((t) => t.completed).length;
      }
    });

    if (totalTasks > 0) {
      return Math.min(100, Math.round((completedTasks / totalTasks) * 100));
    }

    const completedMilestones = milestones.filter(
      (m) => m.status === 'completed' || m.progress >= 100
    ).length;
    return Math.min(100, Math.round((completedMilestones / milestones.length) * 100));
  }

  const measurementType = goal.measurementType || 'milestones';
  const target = Number(goal.targetValue) || 1;
  const current = Number(goal.currentValue) || 0;

  if (measurementType === 'checkbox') {
    return current >= 1 ? 100 : 0;
  }
  if (measurementType === 'percentage') {
    return Math.min(100, Math.max(0, Math.round(current)));
  }
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
}

/**
 * Get simple 4-state status: Not Started, In Progress, At Risk, Completed
 */
export function getGoalSimpleStatus(
  goal: Partial<Goal>,
  todayKey: string = getTodayKey()
): SimpleGoalStatus {
  const progress = calculateGoalProgress(goal);
  if (progress >= 100 || goal.status === 'completed') {
    return 'completed';
  }

  if (goal.targetDate && goal.targetDate < todayKey && progress < 100) {
    return 'at_risk';
  }

  if (goal.status === 'at_risk' || goal.status === 'delayed') {
    return 'at_risk';
  }

  // Check if expected timeline is significantly behind
  if (goal.startDate && goal.targetDate && goal.startDate < goal.targetDate) {
    const start = new Date(goal.startDate).getTime();
    const end = new Date(goal.targetDate).getTime();
    const now = new Date(todayKey).getTime();
    if (now > start && end > start) {
      const elapsedFraction = (now - start) / (end - start);
      const expected = elapsedFraction * 100;
      if (progress < expected - 25) {
        return 'at_risk';
      }
    }
  }

  if (progress === 0) {
    const hasStartedMilestone = (goal.milestones || []).some(
      (m) => m.progress > 0 || m.status === 'in_progress' || (m.tasks || []).some((t) => t.completed)
    );
    if (!hasStartedMilestone) return 'not_started';
  }

  return 'in_progress';
}

/**
 * Automatically determine the legacy status of a goal based on dates and progress.
 */
export function determineGoalStatus(goal: Goal, todayKey: string = getTodayKey()): GoalStatus {
  if (goal.status === 'cancelled' || goal.status === 'paused') {
    return goal.status;
  }

  const simple = getGoalSimpleStatus(goal, todayKey);
  if (simple === 'completed') return 'completed';
  if (simple === 'at_risk') return 'at_risk';
  if (simple === 'not_started') return 'not_started';
  return 'in_progress';
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

/**
 * Automatically creates the connected Month -> Week -> Today structure
 * when user creates a goal with a target deadline.
 */
export function generateInstantAutoPlan(
  title: string,
  targetDate: string,
  category: string = 'Study',
  description?: string
): Milestone[] {
  const lower = `${title} ${description || ''} ${category}`.toLowerCase();
  const today = new Date();
  const todayKey = getTodayKey();
  const end = targetDate ? new Date(targetDate) : new Date(today.getTime() + 90 * 86400000);

  // Generate monthly periods between now and end
  const months: { label: string; yearMonth: string }[] = [];
  const cur = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cur <= end && months.length < 6) {
    const label = cur.toLocaleString('default', { month: 'long', year: 'numeric' });
    const yearMonth = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    months.push({ label, yearMonth });
    cur.setMonth(cur.getMonth() + 1);
  }
  if (months.length === 0) {
    months.push({
      label: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
      yearMonth: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  // Universal Monthly Plan scaled to the requested deadline
  const monthCount = Math.max(1, Math.min(months.length, 6));
  return Array.from({ length: monthCount }).map((_, idx) => {
    const monthName = `Month ${idx + 1} · ${months[idx]?.label || `Period ${idx + 1}`}`;
    const isFirst = idx === 0;
    const isLast = idx === monthCount - 1;
    const phaseTitle = isFirst
      ? `Month 1 · Core Fundamentals & Foundation`
      : isLast
      ? `Month ${idx + 1} · Final Review & Target Completion`
      : `Month ${idx + 1} · Applied Practice & Problem Solving`;

    return {
      id: `ms_${Date.now()}_${idx}`,
      title: phaseTitle,
      description: `Structured monthly goals for ${months[idx]?.label || `Month ${idx + 1}`}`,
      month: monthName,
      week: 'Week 1',
      deadline: isLast ? targetDate : addDays(todayKey, (idx + 1) * 30),
      status: isFirst ? ('in_progress' as const) : ('not_started' as const),
      progress: 0,
      tasks: [
        {
          id: `gt_${Date.now()}_${idx}_1`,
          title: isFirst ? `Kick off initial learning & core concepts` : `Month ${idx + 1} core focus & exercises`,
          completed: false,
          priority: 1,
          week: 'Week 1',
          dueDate: isFirst ? todayKey : undefined,
        },
        {
          id: `gt_${Date.now()}_${idx}_2`,
          title: `Intensive practice and practical exercises`,
          completed: false,
          priority: 2,
          week: 'Week 2',
        },
        {
          id: `gt_${Date.now()}_${idx}_3`,
          title: `Mid-phase review and checkpoint practice`,
          completed: false,
          priority: 1,
          week: 'Week 3',
        },
        {
          id: `gt_${Date.now()}_${idx}_4`,
          title: `Consolidation test & progress assessment`,
          completed: false,
          priority: 3,
          week: 'Week 4',
        },
      ],
    };
  });
}

/**
 * 1-Click Task Toggle:
 * Automatically cascades up to:
 * - Milestone Progress
 * - Milestone Status
 * - Goal Overall Progress
 * - Goal Simple Status
 */
export function toggleTaskInGoal(
  goals: Goal[],
  goalId: string,
  milestoneId: string,
  taskId: string
): { updatedGoals: Goal[]; updatedGoal: Goal | null; taskTitle: string; completed: boolean } {
  let taskTitle = '';
  let completed = false;
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const updatedMilestones = (g.milestones || []).map((m) => {
      if (m.id !== milestoneId) return m;

      const updatedTasks = (m.tasks || []).map((t) => {
        if (t.id === taskId) {
          taskTitle = t.title;
          completed = !t.completed;
          return { ...t, completed };
        }
        return t;
      });

      const total = updatedTasks.length;
      const done = updatedTasks.filter((t) => t.completed).length;
      const progress = total > 0 ? Math.round((done / total) * 100) : m.progress;
      const status: SimpleGoalStatus =
        progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

      return {
        ...m,
        tasks: updatedTasks,
        progress,
        status,
      };
    });

    const modified: Goal = {
      ...g,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };
    modified.progress = calculateGoalProgress(modified);
    modified.status = determineGoalStatus(modified, getTodayKey());
    updatedGoal = modified;
    return modified;
  });

  return { updatedGoals, updatedGoal, taskTitle, completed };
}

/**
 * 1-Click Milestone Toggle:
 * Automatically marks milestone completed and completes all child tasks.
 * Cascades to Main Goal Progress immediately.
 */
export function toggleMilestoneInGoal(
  goals: Goal[],
  goalId: string,
  milestoneId: string
): { updatedGoals: Goal[]; updatedGoal: Goal | null; milestoneTitle: string; completed: boolean } {
  let milestoneTitle = '';
  let completed = false;
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const updatedMilestones = (g.milestones || []).map((m) => {
      if (m.id !== milestoneId) return m;

      milestoneTitle = m.title;
      const nextCompleted = m.status !== 'completed' && m.progress < 100;
      completed = nextCompleted;

      const updatedTasks = (m.tasks || []).map((t) => ({ ...t, completed: nextCompleted }));

      return {
        ...m,
        status: nextCompleted ? ('completed' as const) : ('not_started' as const),
        progress: nextCompleted ? 100 : 0,
        tasks: updatedTasks,
      };
    });

    const modified: Goal = {
      ...g,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };
    modified.progress = calculateGoalProgress(modified);
    modified.status = determineGoalStatus(modified, getTodayKey());
    updatedGoal = modified;
    return modified;
  });

  return { updatedGoals, updatedGoal, milestoneTitle, completed };
}

/**
 * High-fidelity local algorithmic schedule recalibration when offline or network fails.
 */
export function generateLocalReplan(
  goal: Goal,
  reason: string,
  daysRemaining: number
): AIReplanGeneratedResult {
  const today = getTodayKey();
  const uncompletedMilestones = (goal.milestones || []).filter((m) => m.status !== 'completed');
  const count = uncompletedMilestones.length || 1;
  const intervalDays = Math.max(1, Math.floor(Math.max(1, daysRemaining) / count));

  const adjustedMilestones: Milestone[] = (goal.milestones || []).map((m, idx) => {
    if (m.status === 'completed') return m;
    const offset = Math.max(1, (idx + 1) * intervalDays);
    const newDeadline = addDays(today, offset);
    return {
      ...m,
      deadline: newDeadline,
      status: idx === 0 ? ('in_progress' as const) : ('not_started' as const),
    };
  });

  const revisedStatus: GoalStatus =
    daysRemaining <= 7 && (goal.progress || 0) < 50 ? 'at_risk' : 'on_track';

  return {
    pacingSummary: `Recalibrated schedule across remaining ${daysRemaining} days to accommodate: "${reason}".`,
    revisedStatus,
    workloadRedistribution: `Distributed ${uncompletedMilestones.length} remaining milestone(s) at ~${intervalDays}-day cadence.`,
    adjustedMilestones,
    recommendedPriorities: [
      'Focus strictly on high-yield tasks for the active milestone',
      'Maintain daily consistency and avoid cramming',
      'Review pace weekly to make incremental calibrations',
    ],
    scheduleAdjustmentAdvice: `Keep daily progress steady. Prioritize fundamental milestones first before advancing to review sessions.`,
  };
}

/**
 * Creates a default chapter list for syllabus/study goals.
 * Defaults to 14 chapters with realistic days per difficulty.
 */
export function createDefaultChapterList(
  count: number = 14,
  prefix: string = 'Chapter'
): ChapterItem[] {
  // Realistic day distribution: mix of 3 days (easy), 4-5 days (medium), 7 days (lengthy)
  const defaultDaysMap: number[] = [3, 3, 4, 4, 5, 7, 5, 4, 3, 5, 4, 7, 4, 5];

  return Array.from({ length: Math.max(1, count) }).map((_, idx) => {
    const assignedDays = defaultDaysMap[idx] || (idx % 5 === 0 ? 7 : idx % 3 === 0 ? 5 : 3);
    const difficulty: ChapterDifficulty = assignedDays <= 3 ? 'easy' : assignedDays <= 5 ? 'medium' : 'lengthy';

    const tasks: ChapterTask[] = assignedDays <= 3 ? [
      { id: `t1_${idx}`, title: 'Lectures & Core Notes', completed: false, dayOffset: 1 },
      { id: `t2_${idx}`, title: 'Question Practice & Exercise Solutions', completed: false, dayOffset: 2 },
      { id: `t3_${idx}`, title: 'Revision & Summary Review', completed: false, dayOffset: assignedDays },
    ] : assignedDays <= 5 ? [
      { id: `t1_${idx}`, title: 'Lectures & Theory Breakdown', completed: false, dayOffset: 1 },
      { id: `t2_${idx}`, title: 'Question Practice & Exercise Solutions', completed: false, dayOffset: 3 },
      { id: `t3_${idx}`, title: 'Revision & High-Yield Problems', completed: false, dayOffset: assignedDays },
    ] : [
      { id: `t1_${idx}`, title: 'Lectures & In-Depth Concept Notes', completed: false, dayOffset: 1 },
      { id: `t2_${idx}`, title: 'Extensive Problem Solving & Practice Sets', completed: false, dayOffset: 3 },
      { id: `t3_${idx}`, title: 'Dedicated Revision, Mock Test & Solutions Drill', completed: false, dayOffset: assignedDays },
    ];

    return {
      id: `ch_${Date.now()}_${idx + 1}`,
      number: idx + 1,
      title: `${prefix} ${idx + 1}`,
      assignedDays,
      difficulty,
      status: idx === 0 ? 'in_progress' : 'not_started',
      completed: false,
      currentDay: idx === 0 ? 1 : 0,
      tasks,
    };
  });
}

/**
 * Automatically converts a list of chapters with assigned days into a connected
 * Time Hierarchy:
 * - Total Days allocated
 * - Target Deadline
 * - Week-by-Week Breakdown (e.g. Week 1: Ch 1 & Ch 2; Week 2: Ch 3 lengthy 7 days)
 * - Monthly Milestones
 */
export function generateChaptersPlan(
  chapters: ChapterItem[],
  startDateKey: string = getTodayKey()
) {
  let runningDay = 0;
  const enrichedChapters: ChapterItem[] = chapters.map((ch, idx) => {
    const assignedDays = Math.max(1, Number(ch.assignedDays) || 3);
    const difficulty: ChapterDifficulty = assignedDays <= 3 ? 'easy' : assignedDays <= 5 ? 'medium' : 'lengthy';
    const startOffset = runningDay;
    const endOffset = runningDay + assignedDays - 1;
    const startDate = addDays(startDateKey, startOffset);
    const endDate = addDays(startDateKey, endOffset);
    runningDay += assignedDays;

    // ensure tasks exist and have concrete dueDate
    const baseTasks = ch.tasks && ch.tasks.length > 0 ? ch.tasks : [
      { id: `t1_${idx}`, title: 'Lectures & Core Notes', completed: false, dayOffset: 1 },
      { id: `t2_${idx}`, title: 'Question Practice & Solutions', completed: false, dayOffset: Math.min(assignedDays, 2) },
      { id: `t3_${idx}`, title: 'Revision & PYQs', completed: false, dayOffset: assignedDays },
    ];

    const tasksWithDates = baseTasks.map((t) => ({
      ...t,
      dueDate: addDays(startDateKey, startOffset + Math.max(0, (t.dayOffset || 1) - 1)),
    }));

    return {
      ...ch,
      number: idx + 1,
      assignedDays,
      difficulty,
      startDayOffset: startOffset,
      endDayOffset: endOffset,
      startDate,
      endDate,
      tasks: tasksWithDates,
    };
  });

  const totalDays = Math.max(1, runningDay);
  const targetDate = addDays(startDateKey, totalDays);

  // Map into 7-day Weekly Schedules
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const weeklySchedules: {
    weekNumber: number;
    weekLabel: string;
    startDay: number;
    endDay: number;
    startDate: string;
    endDate: string;
    chapters: { chapter: ChapterItem; daysInWeek: number; isFullChapter: boolean }[];
    totalDaysInWeek: number;
    summary: string;
  }[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStartDay = (w - 1) * 7;
    const weekEndDay = Math.min(totalDays - 1, w * 7 - 1);
    const weekStartDate = addDays(startDateKey, weekStartDay);
    const weekEndDate = addDays(startDateKey, weekEndDay);

    const weekChapters: { chapter: ChapterItem; daysInWeek: number; isFullChapter: boolean }[] = [];

    enrichedChapters.forEach((ch) => {
      const overlapStart = Math.max(weekStartDay, ch.startDayOffset || 0);
      const overlapEnd = Math.min(weekEndDay, ch.endDayOffset || 0);

      if (overlapStart <= overlapEnd) {
        const daysInWeek = overlapEnd - overlapStart + 1;
        const isFull = daysInWeek >= ch.assignedDays;
        weekChapters.push({
          chapter: ch,
          daysInWeek,
          isFullChapter: isFull,
        });
      }
    });

    const fullChaptersCount = weekChapters.filter((wc) => wc.isFullChapter).length;
    let summary = '';
    if (fullChaptersCount > 1) {
      summary = `Complete ${fullChaptersCount} chapters (${weekChapters.map((wc) => wc.chapter.title).join(', ')})`;
    } else if (fullChaptersCount === 1) {
      const single = weekChapters[0];
      if (weekChapters.length > 1) {
        summary = `Complete ${single.chapter.title} (${single.chapter.assignedDays}d) + Start next`;
      } else {
        summary = `Complete ${single.chapter.title} (${single.chapter.assignedDays} days)`;
      }
    } else if (weekChapters.length > 0) {
      summary = `${weekChapters[0].chapter.title} (${weekChapters[0].daysInWeek} days this week · lengthy chapter)`;
    } else {
      summary = 'Consolidation & practice';
    }

    weeklySchedules.push({
      weekNumber: w,
      weekLabel: `Week ${w}`,
      startDay: weekStartDay,
      endDay: weekEndDay,
      startDate: weekStartDate,
      endDate: weekEndDate,
      chapters: weekChapters,
      totalDaysInWeek: weekEndDay - weekStartDay + 1,
      summary,
    });
  }

  // Map into Monthly Milestones (4-week chunks, purely dynamic)
  const totalMonths = Math.max(1, Math.ceil(totalWeeks / 4));
  const milestones: Milestone[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    const mWeekStart = (m - 1) * 4 + 1;
    const mWeekEnd = Math.min(totalWeeks, m * 4);
    const mWeeks = weeklySchedules.filter(
      (ws) => ws.weekNumber >= mWeekStart && ws.weekNumber <= mWeekEnd
    );

    const chapterIdsInMonth = new Set<string>();
    mWeeks.forEach((ws) => ws.chapters.forEach((wc) => chapterIdsInMonth.add(wc.chapter.id)));
    const mChapters = enrichedChapters.filter((ch) => chapterIdsInMonth.has(ch.id));

    const mDeadline = mWeeks[mWeeks.length - 1]?.endDate || targetDate;
    const mTasks: GoalTask[] = [];

    mWeeks.forEach((ws) => {
      ws.chapters.forEach((wc) => {
        (wc.chapter.tasks || []).forEach((st) => {
          mTasks.push({
            id: `gt_${wc.chapter.id}_${st.id}`,
            title: `Ch ${wc.chapter.number}: ${wc.chapter.title} — ${st.title}`,
            completed: st.completed || wc.chapter.completed,
            priority: ws.weekNumber === 1 ? 1 : 2,
            week: ws.weekLabel,
            dueDate: (st as any).dueDate || (ws.weekNumber === 1 ? startDateKey : undefined),
          });
        });
      });
    });

    const startChNum = mChapters[0]?.number || 1;
    const endChNum = mChapters[mChapters.length - 1]?.number || mChapters.length;
    const totalDaysInMonth = mChapters.reduce((acc, c) => acc + (c.assignedDays || 3), 0);

    milestones.push({
      id: `ms_ch_${m}_${Date.now()}`,
      title: `Month ${m}: Chapters ${startChNum}–${endChNum}`,
      description: `Cover ${mChapters.map((c) => c.title).join(', ')} (${mWeeks.length} weeks · ${totalDaysInMonth} study days)`,
      month: `Month ${m}`,
      week: mWeeks[0]?.weekLabel || 'Week 1',
      deadline: mDeadline,
      status: m === 1 ? 'in_progress' : 'not_started',
      progress: 0,
      tasks: mTasks,
    });
  }

  return {
    chapters: enrichedChapters,
    totalDays,
    targetDate,
    weeklySchedules,
    milestones,
  };
}

/**
 * 1-Click Chapter Toggle:
 * Toggles a chapter completed, recalculates goal progress and completedChapters count.
 */
export function toggleChapterInGoal(
  goals: Goal[],
  goalId: string,
  chapterId: string
): { updatedGoals: Goal[]; updatedGoal: Goal | null; chapterTitle: string; completed: boolean } {
  let chapterTitle = '';
  let completed = false;
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const chapters = g.chapters || [];
    const updatedChapters = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      chapterTitle = ch.title;
      const nextCompleted = !ch.completed;
      completed = nextCompleted;
      return {
        ...ch,
        completed: nextCompleted,
        status: nextCompleted ? ('completed' as const) : ('in_progress' as const),
        tasks: (ch.tasks || []).map((t) => ({ ...t, completed: nextCompleted })),
      };
    });

    const totalChapters = updatedChapters.length;
    const completedChapters = updatedChapters.filter((c) => c.completed).length;
    const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : g.progress;
    const status: GoalStatus =
      progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : g.status;

    // Also cascade to milestones tasks
    const updatedMilestones = (g.milestones || []).map((m) => {
      const updatedTasks = (m.tasks || []).map((t) => {
        if (t.id.includes(chapterId)) {
          return { ...t, completed };
        }
        return t;
      });
      return { ...m, tasks: updatedTasks };
    });

    const modified: Goal = {
      ...g,
      chapters: updatedChapters,
      totalChapters,
      completedChapters,
      progress,
      status,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };

    updatedGoal = modified;
    return modified;
  });

  return { updatedGoals, updatedGoal, chapterTitle, completed };
}

/**
 * Updates a chapter's assigned days or other properties, and recalculates the timeline.
 */
export function updateChapterInGoal(
  goals: Goal[],
  goalId: string,
  chapterId: string,
  updates: Partial<ChapterItem>
): { updatedGoals: Goal[]; updatedGoal: Goal | null } {
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const chapters = g.chapters || [];
    const updatedChapters = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;
      const merged = { ...ch, ...updates };
      if (updates.assignedDays !== undefined) {
        const days = Math.max(1, Number(updates.assignedDays));
        merged.assignedDays = days;
        merged.difficulty = days <= 3 ? 'easy' : days <= 5 ? 'medium' : 'lengthy';
      }
      return merged;
    });

    // Recalculate schedule plan with updated chapter days
    const plan = generateChaptersPlan(updatedChapters, g.startDate || getTodayKey());

    const totalChapters = plan.chapters.length;
    const completedChapters = plan.chapters.filter((c) => c.completed).length;
    const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : g.progress;

    const modified: Goal = {
      ...g,
      chapters: plan.chapters,
      totalChapters,
      completedChapters,
      progress,
      targetDate: plan.targetDate,
      milestones: plan.milestones,
      updatedAt: new Date().toISOString(),
    };

    updatedGoal = modified;
    return modified;
  });

  return { updatedGoals, updatedGoal };
}

/**
 * Toggles a subtask within a chapter (e.g. Lectures, Practice, Revision)
 */
export function toggleChapterTaskInGoal(
  goals: Goal[],
  goalId: string,
  chapterId: string,
  taskId: string
): { updatedGoals: Goal[]; updatedGoal: Goal | null; taskTitle: string; completed: boolean } {
  let taskTitle = '';
  let completed = false;
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const chapters = g.chapters || [];
    const updatedChapters = chapters.map((ch) => {
      if (ch.id !== chapterId) return ch;

      const updatedTasks = (ch.tasks || []).map((t) => {
        if (t.id === taskId) {
          taskTitle = t.title;
          completed = !t.completed;
          return { ...t, completed };
        }
        return t;
      });

      const allTasksCompleted = updatedTasks.every((t) => t.completed);
      const someTasksCompleted = updatedTasks.some((t) => t.completed);

      return {
        ...ch,
        tasks: updatedTasks,
        completed: allTasksCompleted,
        status: allTasksCompleted ? ('completed' as const) : someTasksCompleted ? ('in_progress' as const) : ch.status,
      };
    });

    const totalChapters = updatedChapters.length;
    const completedChapters = updatedChapters.filter((c) => c.completed).length;
    const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : g.progress;

    const modified: Goal = {
      ...g,
      chapters: updatedChapters,
      totalChapters,
      completedChapters,
      progress,
      updatedAt: new Date().toISOString(),
    };

    updatedGoal = modified;
    return modified;
  });

  return { updatedGoals, updatedGoal, taskTitle, completed };
}

/**
 * Extracts connected hierarchy from goals: Today's tasks, This Week's tasks, and Monthly milestones.
 * Guaranteed null-safe for all callers.
 */
export function getConnectedGoalHierarchy(
  goals: Goal[] = [],
  todayKey: string = getTodayKey()
) {
  const safeGoals = goals || [];
  const activeGoals = safeGoals.filter((g) => g.status !== 'completed' && g.status !== 'cancelled');

  let totalChaptersAll = 0;
  let completedChaptersAll = 0;
  let totalDaysAll = 0;

  const todayTasks: {
    goal: Goal;
    milestone: Milestone;
    task: GoalTask;
    chapter?: ChapterItem;
    chapterTask?: ChapterTask;
    isDueToday: boolean;
  }[] = [];

  const thisWeekTasks: {
    goal: Goal;
    milestone: Milestone;
    task: GoalTask;
    chapter?: ChapterItem;
  }[] = [];

  const monthlyBreakdown: {
    goal: Goal;
    milestone: Milestone;
    monthLabel: string;
    progress: number;
    totalTasks: number;
    completedTasks: number;
    isCompleted: boolean;
  }[] = [];

  const chapterGoals: {
    goal: Goal;
    totalChapters: number;
    completedChapters: number;
    activeChapter: ChapterItem | null;
    chapters: ChapterItem[];
    totalDays: number;
  }[] = [];

  safeGoals.forEach((goal) => {
    // If goal has chapters, record chapter summary
    if (goal.chapters && goal.chapters.length > 0) {
      const totalChapters = goal.chapters.length;
      const completedChapters = goal.chapters.filter((c) => c.completed).length;
      const activeChapter = goal.chapters.find((c) => !c.completed) || goal.chapters[0];
      const goalDays = goal.chapters.reduce((acc, c) => acc + (c.assignedDays || 3), 0);

      totalChaptersAll += totalChapters;
      completedChaptersAll += completedChapters;
      totalDaysAll += goalDays;

      chapterGoals.push({
        goal,
        totalChapters,
        completedChapters,
        activeChapter,
        chapters: goal.chapters,
        totalDays: goalDays,
      });

      // If active chapter exists and has tasks, connect today's action
      if (activeChapter && !activeChapter.completed) {
        const dummyMilestone: Milestone = goal.milestones?.[0] || {
          id: 'ms_active',
          title: `Active Chapter Focus`,
          status: 'in_progress',
          progress: 0,
        };

        // Pick active uncompleted task within this chapter
        const activeSubtask = (activeChapter.tasks || []).find((t) => !t.completed) || activeChapter.tasks?.[0];

        const todayChapterTask: GoalTask = {
          id: `today_ch_${activeChapter.id}`,
          title: `Ch ${activeChapter.number}: ${activeChapter.title} — ${activeSubtask?.title || 'Study & Practice'}`,
          completed: false,
          priority: 1,
          dueDate: todayKey,
          week: 'This Week',
        };

        todayTasks.push({
          goal,
          milestone: dummyMilestone,
          task: todayChapterTask,
          chapter: activeChapter,
          chapterTask: activeSubtask,
          isDueToday: true,
        });
      }
    }

    const milestones = goal.milestones || [];
    milestones.forEach((m, mIdx) => {
      const tasks = m.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.completed).length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : m.progress || 0;
      const isCompleted = m.status === 'completed' || progress >= 100;

      // Monthly record
      monthlyBreakdown.push({
        goal,
        milestone: m,
        monthLabel: m.month || `Month ${mIdx + 1}`,
        progress,
        totalTasks,
        completedTasks,
        isCompleted,
      });

      // Tasks scan
      tasks.forEach((t) => {
        // Today condition: explicit dueDate matches today, or priority 1 in active milestone
        const isDueToday = t.dueDate === todayKey || (t.priority === 1 && mIdx === 0 && !t.completed);
        if (isDueToday) {
          if (!todayTasks.some((existing) => existing.task.id === t.id)) {
            todayTasks.push({
              goal,
              milestone: m,
              task: t,
              isDueToday: true,
            });
          }
        }

        // This week condition
        const isThisWeek = m.week === 'This Week' || m.week === 'Week 1' || mIdx === 0;
        if (isThisWeek) {
          thisWeekTasks.push({
            goal,
            milestone: m,
            task: t,
          });
        }
      });
    });
  });

  return {
    safeGoals,
    activeGoals,
    todayTasks,
    thisWeekTasks,
    monthlyBreakdown,
    chapterGoals,
    totalChaptersAll,
    completedChaptersAll,
    totalDaysAll,
  };
}


