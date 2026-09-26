import { Habit, HabitCompletion, Todo, DayProgress, HabitStreakInfo, OverallStreakInfo } from './types';
import { isHabitScheduledForDate, getTodayKey, addDays, parseDateKey } from './date-utils';

export function calculateDayProgress(
  dateKey: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[]
): DayProgress {
  // 1. Get scheduled habits for this date
  const scheduledHabits = habits.filter((habit) => {
    // If habit is paused, but was created on or before this date, check if it was paused later or if it has completions
    if (habit.status === 'paused') {
      // If completed on this date, we consider it
      const hasCompletion = completions.some((c) => c.habitId === habit.id && c.date === dateKey);
      if (!hasCompletion) return false;
    }
    return isHabitScheduledForDate(habit.frequency, habit.daysOfWeek, habit.startDate, dateKey);
  });

  const completedHabitIds = new Set(
    completions.filter((c) => c.date === dateKey).map((c) => c.habitId)
  );

  const completedHabitsCount = scheduledHabits.filter((h) => completedHabitIds.has(h.id)).length;

  // 2. Get todos for this date
  const dateTodos = todos.filter((t) => t.date === dateKey);
  const completedTodosCount = dateTodos.filter((t) => t.completed).length;

  const totalItems = scheduledHabits.length + dateTodos.length;
  const completedItems = completedHabitsCount + completedTodosCount;

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isFullyCompleted = totalItems > 0 && completedItems === totalItems;

  return {
    date: dateKey,
    totalHabits: scheduledHabits.length,
    completedHabits: completedHabitsCount,
    totalTodos: dateTodos.length,
    completedTodos: completedTodosCount,
    totalItems,
    completedItems,
    percentage,
    isFullyCompleted,
  };
}

export function calculateHabitStreak(
  habit: Habit,
  completions: HabitCompletion[],
  todayKey: string = getTodayKey()
): HabitStreakInfo {
  const habitCompletions = new Set(
    completions.filter((c) => c.habitId === habit.id).map((c) => c.date)
  );

  const isScheduledToday = isHabitScheduledForDate(
    habit.frequency,
    habit.daysOfWeek,
    habit.startDate,
    todayKey
  );
  const completedToday = habitCompletions.has(todayKey);

  // Walk backwards to find current streak
  let currentStreak = 0;
  let checkDate = todayKey;

  // If today is scheduled:
  if (isScheduledToday) {
    if (completedToday) {
      currentStreak += 1;
      checkDate = addDays(checkDate, -1);
    } else {
      // Not completed yet today, look back from yesterday without breaking immediately
      checkDate = addDays(checkDate, -1);
    }
  } else {
    // Today not scheduled, start looking from yesterday
    checkDate = addDays(checkDate, -1);
  }

  // Walk back up to 365 days or startDate
  while (checkDate >= habit.startDate) {
    const isScheduled = isHabitScheduledForDate(
      habit.frequency,
      habit.daysOfWeek,
      habit.startDate,
      checkDate
    );

    if (isScheduled) {
      if (habitCompletions.has(checkDate)) {
        currentStreak += 1;
      } else {
        // Missed a scheduled day! Streak ends
        break;
      }
    }
    // If not scheduled, skip day without breaking streak!
    checkDate = addDays(checkDate, -1);
  }

  // Calculate best streak historically
  let bestStreak = 0;
  let runningStreak = 0;
  let iterDate = habit.startDate;

  while (iterDate <= todayKey) {
    const isScheduled = isHabitScheduledForDate(
      habit.frequency,
      habit.daysOfWeek,
      habit.startDate,
      iterDate
    );

    if (isScheduled) {
      if (habitCompletions.has(iterDate)) {
        runningStreak += 1;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }
    iterDate = addDays(iterDate, 1);
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return {
    habitId: habit.id,
    currentStreak,
    bestStreak,
    totalCompletions: habitCompletions.size,
    completedToday,
    isScheduledToday,
  };
}

export function calculateOverallStreaks(
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  todayKey: string = getTodayKey()
): OverallStreakInfo {
  // Find earliest recorded date across habits & todos & completions
  const dateCandidates = [todayKey];
  habits.forEach((h) => dateCandidates.push(h.startDate));
  completions.forEach((c) => dateCandidates.push(c.date));
  todos.forEach((t) => dateCandidates.push(t.date));

  dateCandidates.sort();
  const earliestDate = dateCandidates[0] || addDays(todayKey, -30);

  // Map of dayKey -> boolean (isFullyCompleted)
  const fullyCompletedMap = new Map<string, boolean>();
  let cur = earliestDate;
  while (cur <= todayKey) {
    const progress = calculateDayProgress(cur, habits, completions, todos);
    fullyCompletedMap.set(cur, progress.isFullyCompleted);
    cur = addDays(cur, 1);
  }

  // Calculate current daily streak
  let currentDailyStreak = 0;
  const todayProgress = fullyCompletedMap.get(todayKey) ?? false;

  let checkDate = todayKey;
  if (todayProgress) {
    currentDailyStreak = 1;
    checkDate = addDays(checkDate, -1);
  } else {
    // Today not completed yet; check if yesterday was completed
    checkDate = addDays(checkDate, -1);
  }

  while (checkDate >= earliestDate) {
    if (fullyCompletedMap.get(checkDate)) {
      currentDailyStreak += 1;
      checkDate = addDays(checkDate, -1);
    } else {
      break;
    }
  }

  // Calculate best daily streak historically
  let bestDailyStreak = 0;
  let runningDailyStreak = 0;
  cur = earliestDate;
  let totalFullyCompletedDays = 0;

  while (cur <= todayKey) {
    const isFull = fullyCompletedMap.get(cur) ?? false;
    if (isFull) {
      totalFullyCompletedDays += 1;
      runningDailyStreak += 1;
      if (runningDailyStreak > bestDailyStreak) {
        bestDailyStreak = runningDailyStreak;
      }
    } else {
      runningDailyStreak = 0;
    }
    cur = addDays(cur, 1);
  }

  if (currentDailyStreak > bestDailyStreak) {
    bestDailyStreak = currentDailyStreak;
  }

  const totalHabitCompletions = completions.length;
  const totalTodoCompletions = todos.filter((t) => t.completed).length;

  return {
    currentDailyStreak,
    bestDailyStreak,
    totalFullyCompletedDays,
    totalHabitCompletions,
    totalTodoCompletions,
  };
}
