import {
  Goal,
  Milestone,
  GoalTask,
  GoalStatus,
  DailyGoalContribution,
  GoalAnalyticsData,
  GoalDurationType,
  GoalMeasurementType,
  GoalPriority,
  GoalBufferPreference,
  ChapterItem,
  ChapterTask,
  ChapterDifficulty,
  SubtopicItem,
  GoalWeeklyReview,
  GoalHistoryAuditItem,
  Habit,
  HabitCompletion,
  Todo,
} from './types';
import { getTodayKey, addDays } from './date-utils';

// ==========================================
// 1. CONSTANTS & METADATA
// ==========================================

export const BUILT_IN_CATEGORIES = [
  'Study',
  'Career',
  'Business',
  'Finance',
  'Health',
  'Fitness',
  'Personal',
  'Learning',
  'Projects',
  'Relationships',
  'Travel',
  'Creative',
  'Custom',
] as const;

export const GOAL_STATUS_META: Record<
  GoalStatus,
  { label: string; bg: string; text: string; dot: string; border: string; description: string }
> = {
  not_started: {
    label: 'Not Started',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-600 dark:text-zinc-400',
    dot: 'bg-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
    description: 'Work has not begun yet',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-sky-50 dark:bg-sky-950/60',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    border: 'border-sky-200 dark:border-sky-800',
    description: 'Work is currently ongoing',
  },
  on_track: {
    label: 'On Track',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
    description: 'Actual progress matches or exceeds expected pacing',
  },
  ahead: {
    label: 'Ahead of Schedule',
    bg: 'bg-teal-50 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-800',
    description: 'Ahead of planned timeline',
  },
  at_risk: {
    label: 'At Risk',
    bg: 'bg-amber-50 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-800',
    description: 'Pacing is lagging behind expected completion rate',
  },
  behind: {
    label: 'Behind Schedule',
    bg: 'bg-rose-50 dark:bg-rose-950/60',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-800',
    description: 'Significantly delayed; replanning recommended',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-800 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300 dark:border-emerald-700',
    description: 'Goal objective successfully achieved',
  },
  paused: {
    label: 'Paused',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-500 dark:text-zinc-400',
    dot: 'bg-zinc-400',
    border: 'border-zinc-300 dark:border-zinc-700',
    description: 'Goal schedule paused; days not counting towards delays',
  },
  archived: {
    label: 'Archived',
    bg: 'bg-zinc-50 dark:bg-zinc-900',
    text: 'text-zinc-400',
    dot: 'bg-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-800',
    description: 'Archived for reference',
  },
};

export const PRIORITY_META: Record<
  GoalPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  low: {
    label: 'Low',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    dotClass: 'bg-zinc-400',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300',
    dotClass: 'bg-sky-500',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    dotClass: 'bg-amber-500',
  },
  critical: {
    label: 'Critical',
    badgeClass: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold',
    dotClass: 'bg-rose-500',
  },
};

// ==========================================
// 2. DURATION & AVAILABLE DAYS CALCULATOR
// ==========================================

export function calculateAvailableDays(startDate: string, deadline: string): number {
  if (!startDate || !deadline) return 0;
  const start = new Date(startDate);
  const end = new Date(deadline);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function computeDurationTypeFromDays(days: number): GoalDurationType {
  if (days <= 7) return '1_week';
  if (days <= 35) return '1_month';
  if (days <= 95) return '3_months';
  if (days <= 185) return '6_months';
  if (days <= 370) return '1_year';
  return 'long_term';
}

export function computeDeadlineFromDuration(
  startDate: string,
  durationType: GoalDurationType
): string {
  switch (durationType) {
    case '1_week':
      return addDays(startDate, 7);
    case '1_month':
      return addDays(startDate, 30);
    case '3_months':
      return addDays(startDate, 90);
    case '6_months':
      return addDays(startDate, 180);
    case '1_year':
      return addDays(startDate, 365);
    case 'long_term':
      return addDays(startDate, 730);
    default:
      return addDays(startDate, 90);
  }
}

// ==========================================
// 3. WEIGHTED PROGRESS CALCULATION (Section 19)
// ==========================================

export function calculateGoalProgress(goal: Partial<Goal>): number {
  if (!goal) return 0;

  // 1. Study / Curriculum-based: Effort/Duration Weighted
  if (goal.measurementType === 'curriculum' || (goal.chapters && goal.chapters.length > 0)) {
    const chapters = goal.chapters || [];
    if (chapters.length === 0) return 0;

    let totalWeight = 0;
    let earnedWeight = 0;

    chapters.forEach((ch) => {
      const weight = Math.max(1, Number(ch.assignedDays) || 3);
      totalWeight += weight;

      if (ch.completed || ch.status === 'completed') {
        earnedWeight += weight;
      } else if (ch.tasks && ch.tasks.length > 0) {
        const completedTasks = ch.tasks.filter((t) => t.completed).length;
        const taskFraction = completedTasks / ch.tasks.length;
        earnedWeight += weight * taskFraction;
      } else if (ch.subtopics && ch.subtopics.length > 0) {
        const completedSubs = ch.subtopics.filter((s) => s.completed).length;
        earnedWeight += weight * (completedSubs / ch.subtopics.length);
      } else if (ch.progress) {
        earnedWeight += weight * (ch.progress / 100);
      }
    });

    return totalWeight > 0 ? Math.min(100, Math.round((earnedWeight / totalWeight) * 100)) : 0;
  }

  // 2. Quantity / Count / Time / Consistency
  if (
    goal.measurementType === 'quantity' ||
    goal.measurementType === 'count' ||
    goal.measurementType === 'time' ||
    goal.measurementType === 'consistency'
  ) {
    const target = goal.targetValue || 0;
    const current = goal.currentValue || 0;
    if (target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  }

  // 3. Completion-based
  if (goal.measurementType === 'completion') {
    if (goal.status === 'completed') return 100;
    if (goal.status === 'not_started') return 0;
    return goal.progress || 50;
  }

  // 4. Milestone-based
  const milestones = goal.milestones || [];
  if (milestones.length > 0) {
    let totalScore = 0;
    let totalCount = 0;

    milestones.forEach((m) => {
      const weight = m.weight || 1;
      totalCount += weight;
      if (m.status === 'completed') {
        totalScore += 100 * weight;
      } else if (m.tasks && m.tasks.length > 0) {
        const comp = m.tasks.filter((t) => t.completed).length;
        totalScore += (comp / m.tasks.length) * 100 * weight;
      } else {
        totalScore += (m.progress || 0) * weight;
      }
    });

    return totalCount > 0 ? Math.min(100, Math.round(totalScore / totalCount)) : 0;
  }

  return goal.progress || 0;
}

// ==========================================
// 4. PLANNED VS ACTUAL PROGRESS & STATUS ENGINE (Sections 7, 8, 20)
// ==========================================

export function calculatePlannedVsActual(
  goal: Goal,
  asOfDate: string = getTodayKey()
): {
  plannedProgress: number;
  actualProgress: number;
  difference: number;
  status: GoalStatus;
  statusMeta: (typeof GOAL_STATUS_META)[GoalStatus];
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  velocity: number;
  projectedEndDate: string;
} {
  const actual = calculateGoalProgress(goal);
  const totalDays = calculateAvailableDays(goal.startDate, goal.deadline || goal.targetDate || '');

  const startObj = new Date(goal.startDate);
  const nowObj = new Date(asOfDate);
  const endObj = new Date(goal.deadline || goal.targetDate || '');

  const daysElapsed = Math.max(0, Math.ceil((nowObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((endObj.getTime() - nowObj.getTime()) / (1000 * 60 * 60 * 24)));

  let planned = 0;
  if (totalDays > 0) {
    const fraction = Math.min(1, Math.max(0, daysElapsed / totalDays));
    planned = Math.round(fraction * 100);
  }

  const diff = actual - planned;

  // Determine intelligent status
  let status: GoalStatus = goal.status;
  if (goal.status === 'paused') {
    status = 'paused';
  } else if (goal.status === 'archived') {
    status = 'archived';
  } else if (actual >= 100) {
    status = 'completed';
  } else if (daysElapsed === 0 && actual === 0) {
    status = 'not_started';
  } else if (diff >= 10) {
    status = 'ahead';
  } else if (diff >= -10) {
    status = 'on_track';
  } else if (diff >= -25) {
    status = 'at_risk';
  } else {
    status = 'behind';
  }

  // Calculate velocity (progress % per week)
  const weeksElapsed = Math.max(0.5, daysElapsed / 7);
  const velocity = Number((actual / weeksElapsed).toFixed(1));

  // Estimate completion date based on velocity
  let projectedEndDate = goal.deadline || goal.targetDate || '';
  if (velocity > 0 && actual < 100) {
    const weeksNeeded = (100 - actual) / velocity;
    const daysNeeded = Math.ceil(weeksNeeded * 7);
    projectedEndDate = addDays(asOfDate, daysNeeded);
  }

  return {
    plannedProgress: planned,
    actualProgress: actual,
    difference: diff,
    status,
    statusMeta: GOAL_STATUS_META[status],
    daysElapsed,
    daysRemaining,
    totalDays,
    velocity,
    projectedEndDate,
  };
}

export function determineGoalStatus(goal: Goal, todayKey: string = getTodayKey()): GoalStatus {
  return calculatePlannedVsActual(goal, todayKey).status;
}

// ==========================================
// 5. CAPACITY & OVER-ALLOCATION ENGINE (Sections 11, 12)
// ==========================================

export interface AllocationAnalysis {
  availableDays: number;
  assignedStudyDays: number;
  bufferDays: number;
  totalRequiredDays: number;
  difference: number; // positive = extra days available; negative = over-allocated
  isOverAllocated: boolean;
  overAllocatedBy: number;
  hasExtraDays: boolean;
  extraDaysCount: number;
  suggestedAllocation: {
    revisionDays: number;
    pyqPracticeDays: number;
    mockTestDays: number;
    bufferDays: number;
    restDays: number;
  };
}

export function analyzeCapacityAndAllocation(
  startDate: string,
  deadline: string,
  chapters: ChapterItem[],
  configuredBufferDays: number = 0
): AllocationAnalysis {
  const availableDays = calculateAvailableDays(startDate, deadline);
  const assignedStudyDays = chapters.reduce((acc, c) => acc + (Number(c.assignedDays) || 3), 0);
  const bufferDays = Math.max(0, configuredBufferDays);
  const totalRequiredDays = assignedStudyDays + bufferDays;
  const difference = availableDays - totalRequiredDays;

  const isOverAllocated = difference < 0;
  const overAllocatedBy = isOverAllocated ? Math.abs(difference) : 0;
  const hasExtraDays = difference > 0;
  const extraDaysCount = hasExtraDays ? difference : 0;

  // Smart suggestions for unused days (Section 12 & 43)
  const revisionDays = Math.round(extraDaysCount * 0.65);
  const pyqPracticeDays = Math.round(extraDaysCount * 0.2);
  const mockTestDays = Math.round(extraDaysCount * 0.1);
  const restDays = Math.max(0, extraDaysCount - (revisionDays + pyqPracticeDays + mockTestDays));

  return {
    availableDays,
    assignedStudyDays,
    bufferDays,
    totalRequiredDays,
    difference,
    isOverAllocated,
    overAllocatedBy,
    hasExtraDays,
    extraDaysCount,
    suggestedAllocation: {
      revisionDays,
      pyqPracticeDays,
      mockTestDays,
      bufferDays,
      restDays,
    },
  };
}

// ==========================================
// 6. SCHEDULING ENGINE (Sections 8, 9, 10, 11, 13, 14, 29)
// ==========================================

export interface WeeklyScheduleItem {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  startDay: number;
  endDay: number;
  chapters: {
    chapter: ChapterItem;
    daysInWeek: number;
    isFullChapter: boolean;
    startDayInWeek: number;
  }[];
  totalDaysInWeek: number;
  summary: string;
}

export interface MonthlyScheduleItem {
  monthKey: string;
  monthLabel: string;
  chapters: ChapterItem[];
  totalDays: number;
  status: string;
}

export function generateChaptersPlan(
  chapters: ChapterItem[],
  startDateKey: string = getTodayKey(),
  configuredBufferDays: number = 0
) {
  let runningDay = 0;

  // Enrich chapters with concrete start/end dates
  const enrichedChapters: ChapterItem[] = chapters.map((ch, idx) => {
    const assignedDays = Math.max(1, Number(ch.assignedDays) || 3);
    const difficulty: ChapterDifficulty =
      assignedDays <= 3 ? 'easy' : assignedDays <= 5 ? 'medium' : assignedDays <= 7 ? 'hard' : 'very_hard';

    const startOffset = runningDay;
    const endOffset = runningDay + assignedDays - 1;
    const startDate = addDays(startDateKey, startOffset);
    const endDate = addDays(startDateKey, endOffset);
    runningDay += assignedDays;

    // Subtopics default if missing
    const subtopics: SubtopicItem[] =
      ch.subtopics && ch.subtopics.length > 0
        ? ch.subtopics
        : assignedDays <= 3
        ? [
            { id: `st1_${idx}`, title: 'Concept Theory & Core Notes', assignedDays: 1, completed: false, progress: 0 },
            { id: `st2_${idx}`, title: 'Exercise Questions & Solutions', assignedDays: 1, completed: false, progress: 0 },
            { id: `st3_${idx}`, title: 'Revision & Checkpoint', assignedDays: 1, completed: false, progress: 0 },
          ]
        : assignedDays <= 5
        ? [
            { id: `st1_${idx}`, title: 'Concept Lectures & Examples', assignedDays: 2, completed: false, progress: 0 },
            { id: `st2_${idx}`, title: 'NCERT & Standard Exercises', assignedDays: 2, completed: false, progress: 0 },
            { id: `st3_${idx}`, title: 'PYQs & Mistake Review', assignedDays: 1, completed: false, progress: 0 },
          ]
        : [
            { id: `st1_${idx}`, title: 'Foundation Concepts & Proofs', assignedDays: 2, completed: false, progress: 0 },
            { id: `st2_${idx}`, title: 'Exemplar & Hard Problems', assignedDays: 3, completed: false, progress: 0 },
            { id: `st3_${idx}`, title: 'PYQ Drill & Chapter Mock Test', assignedDays: 2, completed: false, progress: 0 },
          ];

    // Tasks with concrete due dates
    const tasks: ChapterTask[] =
      ch.tasks && ch.tasks.length > 0
        ? ch.tasks
        : subtopics.map((st, sIdx) => ({
            id: `ct_${idx}_${sIdx}`,
            title: st.title,
            completed: false,
            dayOffset: sIdx + 1,
          }));

    return {
      ...ch,
      number: idx + 1,
      assignedDays,
      difficulty,
      startDate,
      endDate,
      subtopics,
      tasks,
    };
  });

  const totalStudyDays = Math.max(1, runningDay);
  const totalDays = totalStudyDays + configuredBufferDays;
  const targetDate = addDays(startDateKey, totalDays);

  // Group into 7-Day Weekly Schedules
  const totalWeeks = Math.max(1, Math.ceil(totalStudyDays / 7));
  const weeklySchedules: WeeklyScheduleItem[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStartDay = (w - 1) * 7;
    const weekEndDay = Math.min(totalStudyDays - 1, w * 7 - 1);
    const weekStartDate = addDays(startDateKey, weekStartDay);
    const weekEndDate = addDays(startDateKey, weekEndDay);

    const weekChapters: WeeklyScheduleItem['chapters'] = [];

    enrichedChapters.forEach((ch) => {
      const chStart = calculateAvailableDays(startDateKey, ch.startDate || startDateKey);
      const chEnd = chStart + ch.assignedDays - 1;

      const overlapStart = Math.max(weekStartDay, chStart);
      const overlapEnd = Math.min(weekEndDay, chEnd);

      if (overlapStart <= overlapEnd) {
        const daysInWeek = overlapEnd - overlapStart + 1;
        const isFull = daysInWeek >= ch.assignedDays;
        weekChapters.push({
          chapter: ch,
          daysInWeek,
          isFullChapter: isFull,
          startDayInWeek: overlapStart - weekStartDay + 1,
        });
      }
    });

    const fullCount = weekChapters.filter((wc) => wc.isFullChapter).length;
    let summary = '';
    if (fullCount > 1) {
      summary = `Finish ${fullCount} chapters (${weekChapters.map((wc) => wc.chapter.title).join(', ')})`;
    } else if (fullCount === 1) {
      const single = weekChapters[0];
      summary = `Complete ${single.chapter.title} (${single.chapter.assignedDays}d)${
        weekChapters.length > 1 ? ' + start next' : ''
      }`;
    } else if (weekChapters.length > 0) {
      summary = `${weekChapters[0].chapter.title} (Days 1–${weekChapters[0].daysInWeek} of ${weekChapters[0].chapter.assignedDays}d · lengthy)`;
    } else {
      summary = 'Consolidation, tests, and revision';
    }

    weeklySchedules.push({
      weekNumber: w,
      weekLabel: `Week ${w}`,
      startDate: weekStartDate,
      endDate: weekEndDate,
      startDay: weekStartDay,
      endDay: weekEndDay,
      chapters: weekChapters,
      totalDaysInWeek: weekEndDay - weekStartDay + 1,
      summary,
    });
  }

  // Monthly breakdown
  const monthlySchedules: MonthlyScheduleItem[] = [];
  const monthMap: Record<string, { label: string; chapters: ChapterItem[]; days: number }> = {};

  enrichedChapters.forEach((ch) => {
    const date = new Date(ch.startDate || startDateKey);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (!monthMap[key]) {
      monthMap[key] = { label, chapters: [], days: 0 };
    }
    monthMap[key].chapters.push(ch);
    monthMap[key].days += ch.assignedDays;
  });

  Object.entries(monthMap).forEach(([k, val]) => {
    monthlySchedules.push({
      monthKey: k,
      monthLabel: val.label,
      chapters: val.chapters,
      totalDays: val.days,
      status: 'scheduled',
    });
  });

  // Convert to high-level Milestones
  const milestones: Milestone[] = monthlySchedules.map((ms, idx) => ({
    id: `ms_${idx + 1}`,
    title: `${ms.monthLabel} Focus (${ms.chapters.length} Chapters)`,
    description: `Complete: ${ms.chapters.map((c) => c.title).slice(0, 3).join(', ')}${
      ms.chapters.length > 3 ? ` + ${ms.chapters.length - 3} more` : ''
    }`,
    month: ms.monthLabel,
    deadline: ms.chapters[ms.chapters.length - 1]?.endDate || targetDate,
    status: idx === 0 ? 'in_progress' : 'not_started',
    progress: 0,
    chapters: ms.chapters,
    tasks: ms.chapters.flatMap((c) =>
      (c.tasks || []).map((t, tIdx) => ({
        id: `mt_${c.id}_${tIdx}`,
        title: `${c.title}: ${t.title}`,
        completed: t.completed,
        dueDate: c.endDate,
        priority: 2 as const,
        week: `Week ${Math.min(totalWeeks, idx * 4 + 1)}`,
      }))
    ),
  }));

  return {
    chapters: enrichedChapters,
    totalStudyDays,
    totalDays,
    targetDate,
    weeklySchedules,
    monthlySchedules,
    milestones,
  };
}

// ==========================================
// 7. BUILT-IN TEMPLATES (Sections 42, 43)
// ==========================================

export interface GoalTemplate {
  id: string;
  title: string;
  category: string;
  measurementType: GoalMeasurementType;
  durationType: GoalDurationType;
  defaultDays: number;
  description: string;
  why: string;
  bufferDays: number;
  chapters: {
    title: string;
    assignedDays: number;
    difficulty: ChapterDifficulty;
    subtopics?: { title: string; assignedDays: number }[];
  }[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'class_10_maths_curriculum',
    title: 'Complete Class 10 Maths Syllabus',
    category: 'Study',
    measurementType: 'curriculum',
    durationType: '3_months',
    defaultDays: 90,
    description: 'Master full Class 10 Mathematics syllabus with concept learning, NCERT exercises, and PYQs.',
    why: 'Board exam preparation and scoring high in foundational mathematics.',
    bufferDays: 3,
    // EXACT assignments from Section 43 of PDF prompt (total 67 days learning, leaving 23 days for revision & tests)
    chapters: [
      {
        title: 'Real Numbers',
        assignedDays: 3,
        difficulty: 'easy',
        subtopics: [
          { title: 'Fundamental Theorem of Arithmetic', assignedDays: 1 },
          { title: 'Revisiting Irrational Numbers & Proofs', assignedDays: 1 },
          { title: 'NCERT Exercises & Review', assignedDays: 1 },
        ],
      },
      {
        title: 'Polynomials',
        assignedDays: 3,
        difficulty: 'easy',
        subtopics: [
          { title: 'Geometrical Meaning of Zeroes', assignedDays: 1 },
          { title: 'Relationship between Zeroes & Coefficients', assignedDays: 1 },
          { title: 'Practice Exercises & PYQs', assignedDays: 1 },
        ],
      },
      {
        title: 'Pair of Linear Equations in Two Variables',
        assignedDays: 5,
        difficulty: 'medium',
        subtopics: [
          { title: 'Graphical Method of Solution', assignedDays: 2 },
          { title: 'Substitution & Elimination Methods', assignedDays: 2 },
          { title: 'Word Problems & Revision', assignedDays: 1 },
        ],
      },
      {
        title: 'Quadratic Equations',
        assignedDays: 5,
        difficulty: 'medium',
        subtopics: [
          { title: 'Standard Form & Factorisation', assignedDays: 2 },
          { title: 'Nature of Roots & Quadratic Formula', assignedDays: 2 },
          { title: 'Word Problems & Revision', assignedDays: 1 },
        ],
      },
      {
        title: 'Arithmetic Progressions',
        assignedDays: 4,
        difficulty: 'medium',
        subtopics: [
          { title: 'nth Term of an AP', assignedDays: 2 },
          { title: 'Sum of First n Terms', assignedDays: 1 },
          { title: 'Application Questions & Review', assignedDays: 1 },
        ],
      },
      {
        title: 'Coordinate Geometry',
        assignedDays: 4,
        difficulty: 'medium',
        subtopics: [
          { title: 'Distance Formula & Applications', assignedDays: 2 },
          { title: 'Section Formula', assignedDays: 1 },
          { title: 'Area Problems & Exercise Review', assignedDays: 1 },
        ],
      },
      {
        title: 'Triangles',
        assignedDays: 7,
        difficulty: 'hard',
        subtopics: [
          { title: 'Basic Proportionality Theorem (BPT)', assignedDays: 2 },
          { title: 'Criteria for Similarity of Triangles (AAA, SSS, SAS)', assignedDays: 2 },
          { title: 'High-Difficulty Proofs & Theorems', assignedDays: 2 },
          { title: 'NCERT Exemplar & PYQs', assignedDays: 1 },
        ],
      },
      {
        title: 'Circles',
        assignedDays: 4,
        difficulty: 'medium',
        subtopics: [
          { title: 'Tangents to a Circle Theorems', assignedDays: 2 },
          { title: 'Number of Tangents from a Point', assignedDays: 1 },
          { title: 'Exercise Proofs & Drill', assignedDays: 1 },
        ],
      },
      {
        title: 'Introduction to Trigonometry',
        assignedDays: 7,
        difficulty: 'hard',
        subtopics: [
          { title: 'Trigonometric Ratios & Values of Angles', assignedDays: 2 },
          { title: 'Trigonometric Identities (sin²θ+cos²θ=1)', assignedDays: 3 },
          { title: 'Difficult Proofs & NCERT Solutions', assignedDays: 2 },
        ],
      },
      {
        title: 'Some Applications of Trigonometry (Heights & Distances)',
        assignedDays: 6,
        difficulty: 'hard',
        subtopics: [
          { title: 'Angles of Elevation and Depression', assignedDays: 2 },
          { title: 'Two-Observer & Complex Real-World Problems', assignedDays: 2 },
          { title: 'PYQ Drill & Mock Exam', assignedDays: 2 },
        ],
      },
      {
        title: 'Areas Related to Circles',
        assignedDays: 4,
        difficulty: 'medium',
        subtopics: [
          { title: 'Sector & Segment of a Circle Formulae', assignedDays: 2 },
          { title: 'Combination of Plane Figures', assignedDays: 1 },
          { title: 'Calculations Drill & Review', assignedDays: 1 },
        ],
      },
      {
        title: 'Surface Areas and Volumes',
        assignedDays: 7,
        difficulty: 'hard',
        subtopics: [
          { title: 'Surface Area of Combination of Solids', assignedDays: 2 },
          { title: 'Volume of Combination of Solids', assignedDays: 2 },
          { title: 'Conversion of Solids & Frustum Concepts', assignedDays: 2 },
          { title: 'Word Problems & Test', assignedDays: 1 },
        ],
      },
      {
        title: 'Statistics',
        assignedDays: 5,
        difficulty: 'medium',
        subtopics: [
          { title: 'Mean of Grouped Data (Direct & Assumed)', assignedDays: 2 },
          { title: 'Mode and Median of Grouped Data', assignedDays: 2 },
          { title: 'Ogive & Graph Problems', assignedDays: 1 },
        ],
      },
      {
        title: 'Probability',
        assignedDays: 3,
        difficulty: 'easy',
        subtopics: [
          { title: 'Theoretical Probability & Card/Dice Problems', assignedDays: 1 },
          { title: 'Complementary Events & Coin Combinations', assignedDays: 1 },
          { title: 'Full Chapter Revision & Test', assignedDays: 1 },
        ],
      },
    ],
  },
  {
    id: 'project_launch',
    title: 'Launch New Web Product',
    category: 'Projects',
    measurementType: 'curriculum',
    durationType: '3_months',
    defaultDays: 60,
    description: 'Complete research, MVP frontend & backend development, testing, and production deployment.',
    why: 'Ship a high-quality product to the market.',
    bufferDays: 7,
    chapters: [
      { title: 'Phase 1: Specs & Architecture Design', assignedDays: 10, difficulty: 'medium' },
      { title: 'Phase 2: Core Frontend UI & Components', assignedDays: 15, difficulty: 'medium' },
      { title: 'Phase 3: Backend API & Database Engine', assignedDays: 15, difficulty: 'hard' },
      { title: 'Phase 4: QA Testing, Security & Polish', assignedDays: 10, difficulty: 'medium' },
      { title: 'Phase 5: Production Launch & Monitoring', assignedDays: 5, difficulty: 'easy' },
    ],
  },
  {
    id: 'financial_savings',
    title: 'Save ₹20,000 Emergency Fund',
    category: 'Finance',
    measurementType: 'quantity',
    durationType: '3_months',
    defaultDays: 90,
    description: 'Deposit funds steadily each week to build financial resilience.',
    why: 'Financial peace of mind and emergency preparedness.',
    bufferDays: 0,
    chapters: [],
  },
  {
    id: 'fitness_consistency',
    title: 'Exercise 4 Times Per Week',
    category: 'Fitness',
    measurementType: 'consistency',
    durationType: '3_months',
    defaultDays: 90,
    description: 'Build consistent athletic conditioning and energy.',
    why: 'Physical health, mental clarity, and longevity.',
    bufferDays: 0,
    chapters: [],
  },
];

// ==========================================
// 8. HEALTH & RISK DETECTION (Section 22)
// ==========================================

export interface GoalHealthRisk {
  id: string;
  type: 'falling_behind' | 'stacked_hard_chapters' | 'tight_buffer' | 'deadline_risk' | 'low_velocity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedAction: string;
}

export function detectGoalHealthRisks(goal: Goal, asOfDate: string = getTodayKey()): GoalHealthRisk[] {
  const risks: GoalHealthRisk[] = [];
  const analysis = calculatePlannedVsActual(goal, asOfDate);

  // 1. Falling behind
  if (analysis.difference <= -20) {
    risks.push({
      id: 'risk_behind',
      type: 'falling_behind',
      severity: 'high',
      title: `Falling ${Math.abs(analysis.difference)}% Behind Schedule`,
      description: `Actual progress is ${analysis.actualProgress}% against planned ${analysis.plannedProgress}%.`,
      suggestedAction: 'Consider adjusting chapter durations or using AI replan to redistribute workload.',
    });
  } else if (analysis.difference <= -10) {
    risks.push({
      id: 'risk_lagging',
      type: 'falling_behind',
      severity: 'medium',
      title: 'Pacing Slipping',
      description: 'You are slightly behind the projected target pace.',
      suggestedAction: 'Dedicate one extra hour this weekend to get back on track.',
    });
  }

  // 2. Buffer risk
  if (goal.bufferDays !== undefined && goal.bufferDays <= 2 && analysis.daysRemaining < 30) {
    risks.push({
      id: 'risk_buffer',
      type: 'tight_buffer',
      severity: 'medium',
      title: 'Low Buffer Days Left',
      description: `You only have ${goal.bufferDays} buffer day(s) before the final deadline of ${goal.deadline || goal.targetDate}.`,
      suggestedAction: 'Protect upcoming study blocks to prevent cascading delays.',
    });
  }

  // 3. Stacked hard chapters
  const chapters = goal.chapters || [];
  for (let i = 0; i < chapters.length - 1; i++) {
    const cur = chapters[i];
    const next = chapters[i + 1];
    if (
      !cur.completed &&
      !next.completed &&
      (cur.difficulty === 'hard' || cur.difficulty === 'very_hard') &&
      (next.difficulty === 'hard' || next.difficulty === 'very_hard')
    ) {
      risks.push({
        id: `risk_stacked_${i}`,
        type: 'stacked_hard_chapters',
        severity: 'medium',
        title: `Stacked Lengthy Chapters: ${cur.title} & ${next.title}`,
        description: 'Two demanding chapters are placed back-to-back with no buffer day between them.',
        suggestedAction: 'Add a 1-day revision/rest checkpoint between these heavy chapters.',
      });
      break;
    }
  }

  return risks;
}

// ==========================================
// 9. REPLANNING ENGINE & PROPOSALS (Section 24)
// ==========================================

export function generateLocalReplanProposal(goal: Goal, reason?: string) {
  const analysis = calculatePlannedVsActual(goal);
  const remainingChapters = (goal.chapters || []).filter((c) => !c.completed);

  const proposedChanges: {
    id: string;
    type: 'extend_chapter' | 'reduce_buffer' | 'shift_deadline' | 'add_practice_day' | 'move_revision';
    description: string;
    impact: string;
  }[] = [];

  if (analysis.difference < 0) {
    if (goal.bufferDays > 2) {
      proposedChanges.push({
        id: 'c1',
        type: 'reduce_buffer',
        description: `Absorb delay by utilizing 2 buffer days`,
        impact: `Protects completion deadline while providing catch-up time.`,
      });
    }

    if (remainingChapters.length > 0) {
      const firstActive = remainingChapters[0];
      proposedChanges.push({
        id: 'c2',
        type: 'extend_chapter',
        description: `Extend active chapter "${firstActive.title}" by 1 extra day for problem drill`,
        impact: `Provides immediate breathing room for mastery.`,
      });
    }

    proposedChanges.push({
      id: 'c3',
      type: 'add_practice_day',
      description: 'Designate upcoming Sunday as a focused revision block',
      impact: 'Recovers lost progress without altering the overall final deadline.',
    });
  }

  return {
    pacingSummary: `Currently ${analysis.actualProgress}% complete with ${analysis.daysRemaining} days remaining until ${goal.deadline || goal.targetDate}.`,
    revisedStatus: analysis.status,
    workloadRedistribution: `Adjusted pacing for ${remainingChapters.length} remaining chapter(s).`,
    proposedChanges,
    recommendedPriorities: [
      'Focus strictly on active chapter key exercises',
      'Solve previous year questions immediately after lectures',
      'Maintain weekly progress check-ins',
    ],
    scheduleAdjustmentAdvice: 'Review and confirm the proposed changes below before applying them.',
  };
}

export function generateLocalReplan(
  targetGoal: Goal,
  reason: string = 'Recalibrated pacing for target date',
  daysRemaining: number = 30
): { adjustedMilestones: Milestone[]; revisedStatus: GoalStatus; notes: string } {
  const proposal = generateLocalReplanProposal(targetGoal, reason);
  const milestones = targetGoal.milestones || [];
  const adjustedMilestones = milestones.map((m, idx) => {
    const frac = (idx + 1) / Math.max(1, milestones.length);
    const newDeadline = addDays(getTodayKey(), Math.max(1, Math.round(daysRemaining * frac)));
    return {
      ...m,
      deadline: newDeadline,
    };
  });

  return {
    adjustedMilestones,
    revisedStatus: proposal.revisedStatus,
    notes: proposal.scheduleAdjustmentAdvice,
  };
}

export function generateInstantAutoPlan(
  name: string,
  deadline: string,
  category: string = 'General',
  description?: string
): Milestone[] {
  const todayKey = getTodayKey();
  const totalDays = Math.max(7, Math.round((new Date(deadline).getTime() - new Date(todayKey).getTime()) / (1000 * 60 * 60 * 24)));
  const phases = [
    { title: 'Phase 1: Foundation & Planning', share: 0.25, task: `Initiate research and foundational setup for ${name}` },
    { title: 'Phase 2: Core Execution & Build', share: 0.35, task: `Execute primary milestones and daily actions for ${name}` },
    { title: 'Phase 3: Deep Work & Optimization', share: 0.25, task: `Refine, practice, and complete comprehensive checkpoints for ${name}` },
    { title: 'Phase 4: Final Review & Completion', share: 0.15, task: `Final testing, assessment, and wrap-up celebration for ${name}` },
  ];

  let cumulativeDays = 0;
  return phases.map((p, idx) => {
    const phaseDays = Math.max(1, Math.round(totalDays * p.share));
    cumulativeDays += phaseDays;
    const phaseEnd = addDays(todayKey, Math.min(totalDays, cumulativeDays));
    return {
      id: `ms_phase_${idx + 1}_${Date.now()}`,
      title: p.title,
      description: `Targeting completion by ${phaseEnd}`,
      deadline: phaseEnd,
      status: idx === 0 ? 'in_progress' : 'not_started',
      progress: 0,
      tasks: [
        {
          id: `task_${idx + 1}_1`,
          title: p.task,
          completed: false,
          dueDate: phaseEnd,
          priority: 2,
        },
      ],
    };
  });
}

// ==========================================
// 10. TASK & HABIT LINKAGE PROPAGATION (Sections 15, 16, 17)
// ==========================================

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

      const totalTasks = updatedTasks.length;
      const doneTasks = updatedTasks.filter((t) => t.completed).length;
      const milestoneProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : m.progress;

      return {
        ...m,
        tasks: updatedTasks,
        progress: milestoneProgress,
        status: milestoneProgress >= 100 ? ('completed' as const) : milestoneProgress > 0 ? ('in_progress' as const) : ('not_started' as const),
      };
    });

    const goalCopy: Goal = {
      ...g,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };

    const newProgress = calculateGoalProgress(goalCopy);
    const newStatus = determineGoalStatus({ ...goalCopy, progress: newProgress });

    updatedGoal = {
      ...goalCopy,
      progress: newProgress,
      status: newStatus,
    };

    return updatedGoal;
  });

  return { updatedGoals, updatedGoal, taskTitle, completed };
}

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
      const isCurrentlyComplete = m.status === 'completed' || m.progress === 100;
      completed = !isCurrentlyComplete;
      const newStatus = completed ? ('completed' as const) : ('not_started' as const);
      const newProgress = completed ? 100 : 0;
      const updatedTasks = (m.tasks || []).map((t) => ({ ...t, completed }));

      return {
        ...m,
        status: newStatus,
        progress: newProgress,
        tasks: updatedTasks,
      };
    });

    const goalCopy: Goal = {
      ...g,
      milestones: updatedMilestones,
      updatedAt: new Date().toISOString(),
    };

    const newProgress = calculateGoalProgress(goalCopy);
    const newStatus = determineGoalStatus({ ...goalCopy, progress: newProgress });

    updatedGoal = {
      ...goalCopy,
      progress: newProgress,
      status: newStatus,
    };

    return updatedGoal;
  });

  return { updatedGoals, updatedGoal, milestoneTitle, completed };
}

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

    const chapters = (g.chapters || []).map((ch) => {
      if (ch.id === chapterId) {
        chapterTitle = ch.title;
        completed = !ch.completed;
        return {
          ...ch,
          completed,
          status: completed ? ('completed' as const) : ('in_progress' as const),
          progress: completed ? 100 : 0,
          tasks: (ch.tasks || []).map((t) => ({ ...t, completed })),
        };
      }
      return ch;
    });

    const goalCopy: Goal = {
      ...g,
      chapters,
      updatedAt: new Date().toISOString(),
    };

    const newProgress = calculateGoalProgress(goalCopy);
    const newStatus = determineGoalStatus({ ...goalCopy, progress: newProgress });

    updatedGoal = {
      ...goalCopy,
      progress: newProgress,
      status: newStatus,
    };

    return updatedGoal;
  });

  return { updatedGoals, updatedGoal, chapterTitle, completed };
}

export function updateChapterInGoal(
  goals: Goal[],
  goalId: string,
  chapterId: string,
  updates: Partial<ChapterItem>
): { updatedGoals: Goal[]; updatedGoal: Goal | null } {
  let updatedGoal: Goal | null = null;

  const updatedGoals = goals.map((g) => {
    if (g.id !== goalId) return g;

    const chapters = (g.chapters || []).map((ch) => {
      if (ch.id === chapterId) {
        return { ...ch, ...updates };
      }
      return ch;
    });

    // Re-run scheduling plan with newly assigned days!
    const plan = generateChaptersPlan(chapters, g.startDate, g.bufferDays || 0);

    const goalCopy: Goal = {
      ...g,
      chapters: plan.chapters,
      milestones: plan.milestones,
      targetDate: plan.targetDate,
      deadline: plan.targetDate,
      updatedAt: new Date().toISOString(),
    };

    const newProgress = calculateGoalProgress(goalCopy);
    const newStatus = determineGoalStatus({ ...goalCopy, progress: newProgress });

    updatedGoal = {
      ...goalCopy,
      progress: newProgress,
      status: newStatus,
    };

    return updatedGoal;
  });

  return { updatedGoals, updatedGoal };
}

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

    const chapters = (g.chapters || []).map((ch) => {
      if (ch.id !== chapterId) return ch;

      const tasks = (ch.tasks || []).map((t) => {
        if (t.id === taskId) {
          taskTitle = t.title;
          completed = !t.completed;
          return { ...t, completed };
        }
        return t;
      });

      const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
      const doneCount = tasks.filter((t) => t.completed).length;
      const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

      return {
        ...ch,
        tasks,
        progress,
        completed: allDone,
        status: allDone ? ('completed' as const) : doneCount > 0 ? ('in_progress' as const) : ('not_started' as const),
      };
    });

    const goalCopy: Goal = {
      ...g,
      chapters,
      updatedAt: new Date().toISOString(),
    };

    const newProgress = calculateGoalProgress(goalCopy);
    const newStatus = determineGoalStatus({ ...goalCopy, progress: newProgress });

    updatedGoal = {
      ...goalCopy,
      progress: newProgress,
      status: newStatus,
    };

    return updatedGoal;
  });

  return { updatedGoals, updatedGoal, taskTitle, completed };
}

// ==========================================
// 11. GOAL ANALYTICS SUMMARY
// ==========================================

export function calculateGoalAnalytics(
  goals: Goal[],
  todayKey: string = getTodayKey()
): GoalAnalyticsData {
  const safeGoals = goals || [];
  const totalGoals = safeGoals.length;
  const completedGoals = safeGoals.filter((g) => g.status === 'completed' || g.progress >= 100).length;
  const activeGoals = safeGoals.filter((g) => g.status !== 'completed' && g.status !== 'archived').length;

  let onTrackGoals = 0;
  let atRiskGoals = 0;
  let behindGoals = 0;
  let totalProgress = 0;
  let totalDiff = 0;

  safeGoals.forEach((g) => {
    const analysis = calculatePlannedVsActual(g, todayKey);
    totalProgress += analysis.actualProgress;
    totalDiff += analysis.difference;

    if (analysis.status === 'on_track' || analysis.status === 'ahead') onTrackGoals++;
    else if (analysis.status === 'at_risk') atRiskGoals++;
    else if (analysis.status === 'behind') behindGoals++;
  });

  const overallCompletionRate = totalGoals > 0 ? Math.round(totalProgress / totalGoals) : 0;
  const plannedVsActualDiff = totalGoals > 0 ? Math.round(totalDiff / totalGoals) : 0;

  // Milestone rate
  let totalMilestones = 0;
  let compMilestones = 0;
  safeGoals.forEach((g) => {
    (g.milestones || []).forEach((m) => {
      totalMilestones++;
      if (m.status === 'completed' || m.progress >= 100) compMilestones++;
    });
  });
  const milestoneCompletionRate = totalMilestones > 0 ? Math.round((compMilestones / totalMilestones) * 100) : 0;

  // Upcoming deadlines
  const upcomingDeadlines = safeGoals
    .filter((g) => g.status !== 'completed')
    .map((g) => {
      const deadline = g.deadline || g.targetDate || '';
      const daysLeft = Math.ceil(
        (new Date(deadline).getTime() - new Date(todayKey).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        goalId: g.id,
        goalTitle: g.title,
        deadline,
        daysLeft,
        isOverdue: daysLeft < 0,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return {
    totalGoals,
    completedGoals,
    activeGoals,
    onTrackGoals,
    atRiskGoals,
    behindGoals,
    overallCompletionRate,
    milestoneCompletionRate,
    plannedVsActualDiff,
    upcomingDeadlines,
  };
}

// ==========================================
// 12. CONNECTED GOAL HIERARCHY FOR DASHBOARD
// ==========================================

export function getConnectedGoalHierarchy(
  goals: Goal[],
  todayKey: string = getTodayKey()
) {
  const safeGoals = goals || [];
  const activeGoals = safeGoals.filter((g) => g.status !== 'completed' && g.status !== 'archived');
  const primaryGoal = activeGoals[0] || safeGoals[0] || null;

  const todayTasks: {
    goal: Goal;
    milestone: Milestone;
    task: GoalTask;
    chapter?: ChapterItem;
  }[] = [];

  const thisWeekTasks: {
    goal: Goal;
    milestone: Milestone;
    task: GoalTask;
    chapter?: ChapterItem;
  }[] = [];

  safeGoals.forEach((g) => {
    // 1. From chapter tasks
    (g.chapters || []).forEach((ch) => {
      if (!ch.completed) {
        (ch.tasks || []).forEach((t) => {
          if (!t.completed) {
            if (t.dueDate === todayKey || (ch.status === 'in_progress' && t.dayOffset === 1)) {
              todayTasks.push({
                goal: g,
                milestone: g.milestones[0] || { id: 'm1', title: g.title, status: 'in_progress', progress: 0 },
                task: { ...t, id: t.id },
                chapter: ch,
              });
            }
            thisWeekTasks.push({
              goal: g,
              milestone: g.milestones[0] || { id: 'm1', title: g.title, status: 'in_progress', progress: 0 },
              task: { ...t, id: t.id },
              chapter: ch,
            });
          }
        });
      }
    });

    // 2. From milestones tasks
    (g.milestones || []).forEach((m) => {
      (m.tasks || []).forEach((t) => {
        if (!t.completed) {
          if (t.dueDate === todayKey || t.priority === 1) {
            todayTasks.push({ goal: g, milestone: m, task: t });
          }
          if (t.week === 'Week 1' || t.week === 'This Week' || !t.week) {
            thisWeekTasks.push({ goal: g, milestone: m, task: t });
          }
        }
      });
    });
  });

  return {
    primaryGoal,
    activeGoals,
    todayTasks,
    thisWeekTasks,
  };
}

export function computeDailyGoalContributions(
  goals: Goal[],
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  selectedDate: string
): DailyGoalContribution[] {
  const contributions: DailyGoalContribution[] = [];
  const safeGoals = goals || [];

  safeGoals.forEach((g) => {
    let delta = 0;
    let description = '';

    // Check completed tasks linked to goal
    const linkedTodos = (todos || []).filter(
      (t) => (t.date === selectedDate || !t.date) && t.completed && g.relatedTasks?.includes(t.id)
    );
    if (linkedTodos.length > 0) {
      delta += linkedTodos.length * 3;
      description = `Completed ${linkedTodos.length} linked task(s)`;
    }

    // Check completed habits linked to goal
    const linkedHabits = (habits || []).filter((h) => g.linkedHabitIds?.includes(h.id) || g.relatedHabits?.includes(h.id));
    const completedHabits = linkedHabits.filter((h) =>
      (completions || []).some((c) => c.habitId === h.id && c.date === selectedDate)
    );
    if (completedHabits.length > 0) {
      delta += completedHabits.length * 2;
      description = description
        ? `${description} & logged ${completedHabits.length} habit(s)`
        : `Logged ${completedHabits.length} daily habit(s)`;
    }

    if (delta > 0) {
      contributions.push({
        goalId: g.id,
        goalTitle: g.title,
        contribution: description,
        progressDelta: delta,
        newProgress: Math.min(100, (g.progress || 0) + delta),
        category: g.category,
      });
    }
  });

  return contributions;
}
