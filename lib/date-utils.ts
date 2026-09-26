// Standardized Date Utilities for Life OS (local-time consistent)

export function formatToDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getTodayKey(): string {
  return formatToDateKey(new Date());
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatToDateKey(date);
}

export function getDayOfWeek(dateKey: string): number {
  return parseDateKey(dateKey).getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

export function formatDisplayDate(dateKey: string, options?: { showDayName?: boolean; short?: boolean }): string {
  const date = parseDateKey(dateKey);
  const todayKey = getTodayKey();
  const yesterdayKey = addDays(todayKey, -1);
  const tomorrowKey = addDays(todayKey, 1);

  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }
  if (dateKey === tomorrowKey) {
    return 'Tomorrow';
  }

  if (options?.short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    weekday: options?.showDayName !== false ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatFullHeaderDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function isHabitScheduledForDate(
  frequency: 'daily' | 'weekdays' | 'weekly',
  daysOfWeek: number[],
  startDate: string,
  targetDate: string
): boolean {
  if (targetDate < startDate) {
    return false;
  }

  if (frequency === 'daily') {
    return true;
  }

  const dayOfWeek = getDayOfWeek(targetDate);
  if (frequency === 'weekdays') {
    // default weekdays if empty: Mon-Fri (1,2,3,4,5)
    const validDays = daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5];
    return validDays.includes(dayOfWeek);
  }

  if (frequency === 'weekly') {
    // specific scheduled days for weekly
    const validDays = daysOfWeek.length > 0 ? daysOfWeek : [1];
    return validDays.includes(dayOfWeek);
  }

  return true;
}

export function getMonthDays(year: number, month: number): {
  days: { dateKey: string; dayNumber: number; isCurrentMonth: boolean }[];
  monthName: string;
  year: number;
} {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDays = lastDayOfMonth.getDate();

  const days: { dateKey: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      dateKey: formatToDateKey(prevDate),
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const curDate = new Date(year, month, d);
    days.push({
      dateKey: formatToDateKey(curDate),
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remaining = (7 - (days.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const nextDate = new Date(year, month + 1, n);
    days.push({
      dateKey: formatToDateKey(nextDate),
      dayNumber: n,
      isCurrentMonth: false,
    });
  }

  const monthName = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long' });

  return {
    days,
    monthName,
    year,
  };
}
