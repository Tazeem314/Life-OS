import {
  Habit,
  HabitCompletion,
  Todo,
  TimeRangeOption,
  DateRange,
  DailyMetric,
  HabitAnalytics,
  HabitHistoryDay,
  TodoAnalytics,
  WeeklySummary,
  MonthlyAnalytics,
  StreakInterval,
  HeatmapDay,
  HeatmapLevel,
  ProductivityInsight,
  PersonalRecord,
  TrendDirection,
} from './types';
import {
  formatToDateKey,
  parseDateKey,
  getTodayKey,
  addDays,
  getDayOfWeek,
  isHabitScheduledForDate,
  DAYS_SHORT,
  DAYS_FULL,
} from './date-utils';

// Generate all consecutive YYYY-MM-DD keys between two dates inclusive
export function getDatesBetween(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [startDate];
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

// Convert time range option to actual concrete DateRange
export function getDateRangeFromOption(option: TimeRangeOption, customRange?: DateRange): DateRange {
  const today = getTodayKey();
  if (option === 'custom' && customRange && customRange.startDate && customRange.endDate) {
    return {
      startDate: customRange.startDate <= customRange.endDate ? customRange.startDate : customRange.endDate,
      endDate: customRange.startDate <= customRange.endDate ? customRange.endDate : customRange.startDate,
    };
  }

  switch (option) {
    case '7d':
      return { startDate: addDays(today, -6), endDate: today };
    case '30d':
      return { startDate: addDays(today, -29), endDate: today };
    case '3m':
      return { startDate: addDays(today, -89), endDate: today };
    case '6m':
      return { startDate: addDays(today, -179), endDate: today };
    case '1y':
      return { startDate: addDays(today, -364), endDate: today };
    default:
      return { startDate: addDays(today, -29), endDate: today };
  }
}

// 1. Calculate metrics for every single day in date range
export function calculateDailyMetrics(
  startDate: string,
  endDate: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): DailyMetric[] {
  const dateKeys = getDatesBetween(startDate, endDate);
  const completionsByDateHabit = new Set(completions.map((c) => `${c.date}_${c.habitId}`));

  return dateKeys.map((dateKey) => {
    const dateObj = parseDateKey(dateKey);
    const dayOfWeek = dateObj.getDay();
    const dayName = DAYS_SHORT[dayOfWeek];
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Scheduled active habits for this specific date
    let scheduledHabits = 0;
    let completedHabits = 0;

    habits.forEach((habit) => {
      if (habit.status === 'paused') return;
      const isScheduled = isHabitScheduledForDate(
        habit.frequency,
        habit.daysOfWeek,
        habit.startDate,
        dateKey
      );
      if (isScheduled) {
        scheduledHabits++;
        if (completionsByDateHabit.has(`${dateKey}_${habit.id}`)) {
          completedHabits++;
        }
      }
    });

    // To-dos for this date
    const dayTodos = todos.filter((t) => t.date === dateKey);
    const totalTodos = dayTodos.length;
    const completedTodos = dayTodos.filter((t) => t.completed).length;

    const totalWorkload = scheduledHabits + totalTodos;
    const completedWorkload = completedHabits + completedTodos;
    const percentage = totalWorkload > 0 ? Math.round((completedWorkload / totalWorkload) * 100) : 0;
    const isFullyCompleted = totalWorkload > 0 && completedWorkload === totalWorkload;
    const hasActivity = totalWorkload > 0;

    return {
      dateKey,
      dateObj,
      dayName,
      shortDate,
      scheduledHabits,
      completedHabits,
      totalTodos,
      completedTodos,
      totalWorkload,
      completedWorkload,
      percentage,
      isFullyCompleted,
      hasActivity,
    };
  });
}

// 2. Summary stats for the given daily metrics
export function calculateOverallAnalytics(dailyMetrics: DailyMetric[]) {
  let totalScheduled = 0;
  let totalCompleted = 0;
  let fullyCompletedDays = 0;
  let activeDays = 0;
  let scheduledHabits = 0;
  let completedHabits = 0;
  let totalTodos = 0;
  let completedTodos = 0;

  dailyMetrics.forEach((m) => {
    totalScheduled += m.totalWorkload;
    totalCompleted += m.completedWorkload;
    scheduledHabits += m.scheduledHabits;
    completedHabits += m.completedHabits;
    totalTodos += m.totalTodos;
    completedTodos += m.completedTodos;
    if (m.hasActivity) {
      activeDays++;
    }
    if (m.isFullyCompleted) {
      fullyCompletedDays++;
    }
  });

  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  const habitCompletionRate = scheduledHabits > 0 ? Math.round((completedHabits / scheduledHabits) * 100) : 0;
  const todoCompletionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  return {
    totalScheduled,
    totalCompleted,
    completionRate,
    fullyCompletedDays,
    activeDays,
    scheduledHabits,
    completedHabits,
    habitCompletionRate,
    totalTodos,
    completedTodos,
    todoCompletionRate,
  };
}

// 3. Habit-Level Analytics & History
export function calculateHabitAnalytics(
  habit: Habit,
  startDate: string,
  endDate: string,
  completions: HabitCompletion[]
): HabitAnalytics {
  const dateKeys = getDatesBetween(startDate, endDate);
  const todayKey = getTodayKey();
  const completionDates = new Set(completions.filter((c) => c.habitId === habit.id).map((c) => c.date));

  let scheduledOccurrences = 0;
  let completedOccurrences = 0;
  let missedOccurrences = 0;
  let lastCompletedDate: string | null = null;

  const history: HabitHistoryDay[] = dateKeys.map((dKey) => {
    const isToday = dKey === todayKey;
    const isScheduled = isHabitScheduledForDate(
      habit.frequency,
      habit.daysOfWeek,
      habit.startDate,
      dKey
    );
    const isCompleted = completionDates.has(dKey);

    if (isCompleted) {
      if (!lastCompletedDate || dKey > lastCompletedDate) {
        lastCompletedDate = dKey;
      }
    }

    let status: 'completed' | 'missed' | 'not_scheduled' | 'future' = 'not_scheduled';

    if (dKey > todayKey) {
      status = 'future';
    } else if (isScheduled) {
      if (isCompleted) {
        status = 'completed';
        completedOccurrences++;
        scheduledOccurrences++;
      } else {
        status = 'missed';
        missedOccurrences++;
        scheduledOccurrences++;
      }
    }

    return {
      dateKey: dKey,
      status,
      isToday,
    };
  });

  const completionRate =
    scheduledOccurrences > 0 ? Math.round((completedOccurrences / scheduledOccurrences) * 100) : 0;

  // Streak Calculation over all historical records
  const allHistoricalDates = Array.from(completionDates).sort();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  let checkDate = todayKey;
  const isScheduledToday = isHabitScheduledForDate(habit.frequency, habit.daysOfWeek, habit.startDate, todayKey);
  const completedToday = completionDates.has(todayKey);

  if (completedToday) {
    currentStreak = 1;
    checkDate = addDays(todayKey, -1);
  } else if (!isScheduledToday) {
    // If today is a rest day, streak continues from yesterday
    checkDate = addDays(todayKey, -1);
  } else {
    // Scheduled today but not done yet: check from yesterday
    checkDate = addDays(todayKey, -1);
  }

  // Count backwards for current streak
  while (true) {
    const sched = isHabitScheduledForDate(habit.frequency, habit.daysOfWeek, habit.startDate, checkDate);
    if (checkDate < habit.startDate) break;
    if (sched) {
      if (completionDates.has(checkDate)) {
        currentStreak++;
      } else {
        break;
      }
    }
    checkDate = addDays(checkDate, -1);
  }

  // Best streak over historical window
  if (allHistoricalDates.length > 0) {
    const earliest = habit.startDate < allHistoricalDates[0] ? habit.startDate : allHistoricalDates[0];
    const span = getDatesBetween(earliest, todayKey);
    span.forEach((dKey) => {
      const sched = isHabitScheduledForDate(habit.frequency, habit.daysOfWeek, habit.startDate, dKey);
      if (sched) {
        if (completionDates.has(dKey)) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
    });
  }
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  // Trend detection: split date range into two halves
  let trend: TrendDirection = 'insufficient_data';
  if (scheduledOccurrences >= 4) {
    const midpoint = Math.floor(dateKeys.length / 2);
    const firstHalfDates = dateKeys.slice(0, midpoint);
    const secondHalfDates = dateKeys.slice(midpoint);

    const calcHalfRate = (dates: string[]) => {
      let sched = 0;
      let comp = 0;
      dates.forEach((dKey) => {
        if (dKey <= todayKey && isHabitScheduledForDate(habit.frequency, habit.daysOfWeek, habit.startDate, dKey)) {
          sched++;
          if (completionDates.has(dKey)) comp++;
        }
      });
      return sched > 0 ? (comp / sched) * 100 : 0;
    };

    const firstRate = calcHalfRate(firstHalfDates);
    const secondRate = calcHalfRate(secondHalfDates);
    const diff = secondRate - firstRate;

    if (diff >= 10) {
      trend = 'improving';
    } else if (diff <= -10) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }
  }

  return {
    habitId: habit.id,
    habit,
    scheduledOccurrences,
    completedOccurrences,
    missedOccurrences,
    completionRate,
    currentStreak,
    bestStreak,
    lastCompletedDate,
    trend,
    history,
  };
}

// 4. Calculate analytics for all habits
export function calculateAllHabitsAnalytics(
  habits: Habit[],
  startDate: string,
  endDate: string,
  completions: HabitCompletion[]
) {
  const all = habits.map((h) => calculateHabitAnalytics(h, startDate, endDate, completions));

  // Sort by completion rate descending
  all.sort((a, b) => b.completionRate - a.completionRate);

  // Consistent: completion rate >= 75% and scheduled >= 2
  const consistent = all.filter((h) => h.scheduledOccurrences >= 2 && h.completionRate >= 75);

  // Needs attention: completion rate < 60% or declining trend (with >= 2 scheduled)
  const needsAttention = all.filter(
    (h) => h.scheduledOccurrences >= 2 && (h.completionRate < 60 || h.trend === 'declining')
  );

  return {
    all,
    consistent,
    needsAttention,
  };
}

// 5. To-Do Analytics
export function calculateTodoAnalytics(todos: Todo[], startDate: string, endDate: string): TodoAnalytics {
  const rangeTodos = todos.filter((t) => t.date >= startDate && t.date <= endDate);
  const totalTodos = rangeTodos.length;
  const completedTodos = rangeTodos.filter((t) => t.completed).length;
  const pendingTodos = totalTodos - completedTodos;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  const highTodos = rangeTodos.filter((t) => t.priority === 'high');
  const highComp = highTodos.filter((t) => t.completed).length;
  const highRate = highTodos.length > 0 ? Math.round((highComp / highTodos.length) * 100) : 0;

  const medTodos = rangeTodos.filter((t) => t.priority === 'medium');
  const medComp = medTodos.filter((t) => t.completed).length;
  const medRate = medTodos.length > 0 ? Math.round((medComp / medTodos.length) * 100) : 0;

  const lowTodos = rangeTodos.filter((t) => t.priority === 'low');
  const lowComp = lowTodos.filter((t) => t.completed).length;
  const lowRate = lowTodos.length > 0 ? Math.round((lowComp / lowTodos.length) * 100) : 0;

  const uniqueActiveDays = new Set(rangeTodos.map((t) => t.date)).size;
  const totalDays = getDatesBetween(startDate, endDate).length;
  const avgDailyTodos = totalDays > 0 ? Math.round((totalTodos / totalDays) * 10) / 10 : 0;

  return {
    totalTodos,
    completedTodos,
    pendingTodos,
    completionRate,
    highPriority: { total: highTodos.length, completed: highComp, rate: highRate },
    mediumPriority: { total: medTodos.length, completed: medComp, rate: medRate },
    lowPriority: { total: lowTodos.length, completed: lowComp, rate: lowRate },
    avgDailyTodos,
    activeDaysWithTodos: uniqueActiveDays,
  };
}

// 6. Weekly Analytics & Comparison
export function calculateWeeklySummaries(
  startDate: string,
  endDate: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): WeeklySummary[] {
  const daily = calculateDailyMetrics(startDate, endDate, habits, completions, todos);
  if (daily.length === 0) return [];

  const weeklySummaries: WeeklySummary[] = [];
  let currentChunk: DailyMetric[] = [];

  daily.forEach((day, index) => {
    currentChunk.push(day);
    const dayOfWeek = day.dateObj.getDay();
    // End chunk on Saturday (6) or last day of range
    if (dayOfWeek === 6 || index === daily.length - 1) {
      const chunkStart = currentChunk[0].dateKey;
      const chunkEnd = currentChunk[currentChunk.length - 1].dateKey;
      const weekIndex = weeklySummaries.length + 1;

      let totalScheduled = 0;
      let totalCompleted = 0;
      let scheduledHabits = 0;
      let completedHabits = 0;
      let totalTodos = 0;
      let completedTodos = 0;
      let fullyCompletedDays = 0;
      let sumPercentages = 0;

      currentChunk.forEach((d) => {
        totalScheduled += d.totalWorkload;
        totalCompleted += d.completedWorkload;
        scheduledHabits += d.scheduledHabits;
        completedHabits += d.completedHabits;
        totalTodos += d.totalTodos;
        completedTodos += d.completedTodos;
        sumPercentages += d.percentage;
        if (d.isFullyCompleted) fullyCompletedDays++;
      });

      const completionRate =
        totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
      const habitCompletionRate =
        scheduledHabits > 0 ? Math.round((completedHabits / scheduledHabits) * 100) : 0;
      const todoCompletionRate =
        totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
      const avgDailyPercentage =
        currentChunk.length > 0 ? Math.round(sumPercentages / currentChunk.length) : 0;

      const label = `${parseDateKey(chunkStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${parseDateKey(chunkEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      weeklySummaries.push({
        weekKey: `week_${chunkStart}`,
        weekIndex,
        startDate: chunkStart,
        endDate: chunkEnd,
        label,
        totalScheduled,
        totalCompleted,
        completionRate,
        habitCompletionRate,
        todoCompletionRate,
        fullyCompletedDays,
        avgDailyPercentage,
        days: [...currentChunk],
      });

      currentChunk = [];
    }
  });

  return weeklySummaries;
}

// 7. Monthly Analytics
export function calculateMonthlyAnalytics(
  year: number,
  month: number, // 0 - 11
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): MonthlyAnalytics {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = formatToDateKey(firstDay);
  const endDate = formatToDateKey(lastDay);
  const today = getTodayKey();

  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
  const isFuture = startDate > today;

  const dailyMetrics = calculateDailyMetrics(startDate, endDate, habits, completions, todos);
  const overall = calculateOverallAnalytics(dailyMetrics);

  const activeHabits = habits.filter(
    (h) => h.status === 'active' && h.startDate <= endDate
  );

  const hasData = overall.totalScheduled > 0;

  return {
    year,
    month,
    monthName,
    totalScheduled: overall.totalScheduled,
    totalCompleted: overall.totalCompleted,
    completionRate: overall.completionRate,
    fullyCompletedDays: overall.fullyCompletedDays,
    activeHabitsCount: activeHabits.length,
    totalTodos: overall.totalTodos,
    habitCompletionRate: overall.habitCompletionRate,
    todoCompletionRate: overall.todoCompletionRate,
    dailyMetrics,
    isFuture,
    hasData,
  };
}

// 8. Historical Streaks Timeline
export function calculateStreakHistory(
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): StreakInterval[] {
  const today = getTodayKey();
  // Find earliest record date
  let earliestDate = addDays(today, -60);
  habits.forEach((h) => {
    if (h.startDate < earliestDate) earliestDate = h.startDate;
  });
  completions.forEach((c) => {
    if (c.date < earliestDate) earliestDate = c.date;
  });
  todos.forEach((t) => {
    if (t.date < earliestDate) earliestDate = t.date;
  });

  const daily = calculateDailyMetrics(earliestDate, today, habits, completions, todos);
  const intervals: StreakInterval[] = [];

  let streakStart: string | null = null;
  let streakLength = 0;

  daily.forEach((d, i) => {
    if (d.isFullyCompleted) {
      if (!streakStart) {
        streakStart = d.dateKey;
      }
      streakLength++;
    } else {
      if (streakStart && streakLength > 0) {
        const prevDay = daily[i - 1].dateKey;
        intervals.push({
          id: `streak_${streakStart}_${prevDay}`,
          startDate: streakStart,
          endDate: prevDay,
          lengthDays: streakLength,
          isCurrent: false,
        });
        streakStart = null;
        streakLength = 0;
      }
    }
  });

  // Handle ongoing current streak
  if (streakStart && streakLength > 0) {
    const lastDay = daily[daily.length - 1].dateKey;
    intervals.push({
      id: `streak_${streakStart}_${lastDay}`,
      startDate: streakStart,
      endDate: lastDay,
      lengthDays: streakLength,
      isCurrent: lastDay === today,
    });
  }

  // Sort descending by end date
  intervals.sort((a, b) => b.endDate.localeCompare(a.endDate));
  return intervals;
}

// 9. Activity Heatmap Grid Generator
export function generateHeatmapData(
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  weeksBack: number = 36
): { weeks: HeatmapDay[][]; months: { label: string; weekIndex: number }[] } {
  const today = getTodayKey();
  const todayObj = parseDateKey(today);
  const todayDayOfWeek = todayObj.getDay();

  // End on the Saturday of current week to make full 7-row columns
  const daysUntilSaturday = 6 - todayDayOfWeek;
  const endDate = addDays(today, daysUntilSaturday);
  const totalDays = weeksBack * 7;
  const startDate = addDays(endDate, -(totalDays - 1));

  const daily = calculateDailyMetrics(startDate, endDate, habits, completions, todos);
  const dailyMap = new Map(daily.map((d) => [d.dateKey, d]));

  const allDays = getDatesBetween(startDate, endDate);
  const weeks: HeatmapDay[][] = [];
  const monthsMap = new Map<string, number>();

  let currentWeek: HeatmapDay[] = [];

  allDays.forEach((dateKey) => {
    const dObj = parseDateKey(dateKey);
    const dayOfWeek = dObj.getDay();
    const dayNumber = dObj.getDate();
    const monthIndex = dObj.getMonth();
    const monthName = dObj.toLocaleDateString('en-US', { month: 'short' });

    const metric = dailyMap.get(dateKey);
    const percentage = metric ? metric.percentage : 0;
    const totalItems = metric ? metric.totalWorkload : 0;
    const completedItems = metric ? metric.completedWorkload : 0;
    const scheduledHabits = metric ? metric.scheduledHabits : 0;
    const completedHabits = metric ? metric.completedHabits : 0;
    const totalTodos = metric ? metric.totalTodos : 0;
    const completedTodos = metric ? metric.completedTodos : 0;
    const isFullyCompleted = metric ? metric.isFullyCompleted : false;
    const isToday = dateKey === today;
    const isFuture = dateKey > today;

    // Scale level based on actual completion
    let level: HeatmapLevel = 0;
    if (!isFuture && totalItems > 0) {
      if (percentage === 100) level = 5;
      else if (percentage >= 75) level = 4;
      else if (percentage >= 50) level = 3;
      else if (percentage >= 25) level = 2;
      else if (percentage > 0) level = 1;
    }

    const dayData: HeatmapDay = {
      dateKey,
      dayOfWeek,
      dayNumber,
      monthIndex,
      monthName,
      percentage,
      totalItems,
      completedItems,
      scheduledHabits,
      completedHabits,
      totalTodos,
      completedTodos,
      isFullyCompleted,
      level,
      isToday,
      isFuture,
    };

    currentWeek.push(dayData);

    if (currentWeek.length === 7) {
      const currentWeekIndex = weeks.length;
      // Record month label if it's the first occurrence
      const firstDayOfMonth = currentWeek.find((d) => d.dayNumber <= 7);
      if (firstDayOfMonth && !monthsMap.has(`${firstDayOfMonth.monthIndex}_${firstDayOfMonth.dateKey.substring(0, 4)}`)) {
        monthsMap.set(`${firstDayOfMonth.monthIndex}_${firstDayOfMonth.dateKey.substring(0, 4)}`, currentWeekIndex);
      }

      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const months: { label: string; weekIndex: number }[] = [];
  monthsMap.forEach((weekIndex, key) => {
    const monthIdx = Number(key.split('_')[0]);
    const label = new Date(2025, monthIdx, 1).toLocaleDateString('en-US', { month: 'short' });
    months.push({ label, weekIndex });
  });

  return { weeks, months };
}

// 10. Intelligent Real-Data Productivity Insights
export function generateProductivityInsights(
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  dailyMetrics: DailyMetric[],
  weeklySummaries: WeeklySummary[]
): ProductivityInsight[] {
  const insights: ProductivityInsight[] = [];
  const overall = calculateOverallAnalytics(dailyMetrics);

  // 1. Week-over-week trend comparison
  if (weeklySummaries.length >= 2) {
    const currentWeek = weeklySummaries[weeklySummaries.length - 1];
    const prevWeek = weeklySummaries[weeklySummaries.length - 2];

    if (currentWeek.totalScheduled > 0 && prevWeek.totalScheduled > 0) {
      const delta = currentWeek.completionRate - prevWeek.completionRate;
      if (delta > 3) {
        insights.push({
          id: 'insight_wow_up',
          type: 'trend',
          title: 'Positive Momentum',
          description: `Your completion rate this week is ${delta}% higher than the previous week (${currentWeek.completionRate}% vs ${prevWeek.completionRate}%).`,
          metric: `+${delta}%`,
          tag: 'Weekly Trend',
        });
      } else if (delta < -5) {
        insights.push({
          id: 'insight_wow_down',
          type: 'trend',
          title: 'Weekly Pacing Shift',
          description: `Your completion rate dipped by ${Math.abs(delta)}% compared to last week (${currentWeek.completionRate}% vs ${prevWeek.completionRate}%).`,
          metric: `${delta}%`,
          tag: 'Weekly Trend',
        });
      } else {
        insights.push({
          id: 'insight_wow_stable',
          type: 'trend',
          title: 'Consistent Routine',
          description: `You maintained steady performance across recent weeks with an average ${currentWeek.completionRate}% completion rate.`,
          metric: `${currentWeek.completionRate}%`,
          tag: 'Consistency',
        });
      }
    }
  }

  // 2. Habit vs To-Do balance
  if (overall.scheduledHabits > 0 && overall.totalTodos > 0) {
    if (overall.habitCompletionRate >= overall.todoCompletionRate + 10) {
      insights.push({
        id: 'insight_habit_focus',
        type: 'habit',
        title: 'Strong Habit Discipline',
        description: `Your habit adherence (${overall.habitCompletionRate}%) is leading ahead of one-time task completion (${overall.todoCompletionRate}%).`,
        metric: `${overall.habitCompletionRate}%`,
        tag: 'Habit Focus',
      });
    } else if (overall.todoCompletionRate >= overall.habitCompletionRate + 10) {
      insights.push({
        id: 'insight_todo_focus',
        type: 'todo',
        title: 'Task Execution Leader',
        description: `You are clearing daily tasks (${overall.todoCompletionRate}%) at a higher rate than recurring habit routines (${overall.habitCompletionRate}%).`,
        metric: `${overall.todoCompletionRate}%`,
        tag: 'Task Execution',
      });
    }
  }

  // 3. Top performing habit
  const habitStats = calculateAllHabitsAnalytics(
    habits,
    dailyMetrics[0]?.dateKey || getTodayKey(),
    dailyMetrics[dailyMetrics.length - 1]?.dateKey || getTodayKey(),
    completions
  );
  if (habitStats.consistent.length > 0) {
    const top = habitStats.consistent[0];
    insights.push({
      id: 'insight_top_habit',
      type: 'achievement',
      title: 'Anchor Routine',
      description: `"${top.habit.name}" is your highest consistency routine with ${top.completedOccurrences}/${top.scheduledOccurrences} completions (${top.completionRate}%).`,
      metric: `${top.completionRate}%`,
      tag: 'Best Habit',
    });
  }

  // 4. Day-of-week productivity pattern
  const dayBuckets: { total: number; completed: number }[] = Array.from({ length: 7 }, () => ({
    total: 0,
    completed: 0,
  }));
  dailyMetrics.forEach((d) => {
    const dow = d.dateObj.getDay();
    dayBuckets[dow].total += d.totalWorkload;
    dayBuckets[dow].completed += d.completedWorkload;
  });

  let bestDayIndex = -1;
  let bestDayRate = -1;
  dayBuckets.forEach((bucket, idx) => {
    if (bucket.total >= 3) {
      const rate = Math.round((bucket.completed / bucket.total) * 100);
      if (rate > bestDayRate) {
        bestDayRate = rate;
        bestDayIndex = idx;
      }
    }
  });

  if (bestDayIndex !== -1 && bestDayRate >= 60) {
    insights.push({
      id: 'insight_best_day',
      type: 'neutral',
      title: `Peak Day: ${DAYS_FULL[bestDayIndex]}s`,
      description: `Historical data shows ${DAYS_FULL[bestDayIndex]}s are your most productive days with an average ${bestDayRate}% completion rate.`,
      metric: `${bestDayRate}%`,
      tag: 'Pattern',
    });
  }

  // 5. Perfect days ratio
  if (overall.fullyCompletedDays > 0) {
    insights.push({
      id: 'insight_perfect_days',
      type: 'achievement',
      title: 'Milestone Days',
      description: `You achieved 100% full completion on ${overall.fullyCompletedDays} active days in this selected time range.`,
      metric: `${overall.fullyCompletedDays} days`,
      tag: 'Milestone',
    });
  }

  return insights;
}

// 11. Personal All-Time Records
export function calculatePersonalRecords(
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): PersonalRecord[] {
  const today = getTodayKey();
  let earliestDate = addDays(today, -365);
  habits.forEach((h) => {
    if (h.startDate < earliestDate) earliestDate = h.startDate;
  });
  completions.forEach((c) => {
    if (c.date < earliestDate) earliestDate = c.date;
  });
  todos.forEach((t) => {
    if (t.date < earliestDate) earliestDate = t.date;
  });

  const daily = calculateDailyMetrics(earliestDate, today, habits, completions, todos);

  // 1. Longest daily streak
  const streakIntervals = calculateStreakHistory(habits, completions, todos);
  const longestDailyStreak = streakIntervals.reduce(
    (max, s) => Math.max(max, s.lengthDays),
    0
  );

  // 2. Longest individual habit streak
  let bestHabitStreak = 0;
  let bestHabitName = 'None';
  habits.forEach((h) => {
    const stats = calculateHabitAnalytics(h, earliestDate, today, completions);
    if (stats.bestStreak > bestHabitStreak) {
      bestHabitStreak = stats.bestStreak;
      bestHabitName = h.name;
    }
  });

  // 3. Most items completed in a single day
  let maxCompletedItems = 0;
  let maxCompletedDate = '';
  daily.forEach((d) => {
    if (d.completedWorkload > maxCompletedItems) {
      maxCompletedItems = d.completedWorkload;
      maxCompletedDate = d.dateKey;
    }
  });

  // 4. Total fully completed days all time
  const totalPerfectDays = daily.filter((d) => d.isFullyCompleted).length;

  return [
    {
      id: 'rec_streak',
      title: 'Longest Daily Streak',
      value: `${longestDailyStreak} Days`,
      subtext: 'Consecutive days with 100% completion',
      icon: 'flame',
    },
    {
      id: 'rec_habit_streak',
      title: 'Longest Habit Streak',
      value: `${bestHabitStreak} Days`,
      subtext: bestHabitName !== 'None' ? `Set with "${bestHabitName}"` : 'Individual habit consistency',
      icon: 'trophy',
    },
    {
      id: 'rec_day_volume',
      title: 'Max Daily Output',
      value: `${maxCompletedItems} Items`,
      subtext: maxCompletedDate ? `Achieved on ${parseDateKey(maxCompletedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Single-day completion record',
      icon: 'zap',
    },
    {
      id: 'rec_perfect_days',
      title: 'Total Perfect Days',
      value: `${totalPerfectDays} Days`,
      subtext: 'Days with zero missed items',
      icon: 'check-circle',
    },
  ];
}
