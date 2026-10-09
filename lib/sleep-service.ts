import {
  SleepLog,
  SleepSettings,
  SleepAnalyticsSummary,
  SleepQuality,
  WakeMood,
  SleepFactor,
  HabitCompletion,
  Habit,
} from './types';
import { getTodayKey, addDays } from './date-utils';

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  targetHours: 8,
  targetBedtime: '23:00',
  targetWakeTime: '07:00',
  windDownReminder: true,
  windDownMinutesBefore: 30,
};

export const SLEEP_FACTORS: SleepFactor[] = [
  { id: 'reading', label: 'Reading', category: 'positive', impactHint: 'Promotes alpha brain waves & calm' },
  { id: 'meditation', label: 'Meditation / Breathwork', category: 'positive', impactHint: 'Lowers cortisol & heart rate' },
  { id: 'cool_room', label: 'Cool Room (65-68°F)', category: 'positive', impactHint: 'Facilitates core temp drop' },
  { id: 'warm_shower', label: 'Warm Shower/Bath', category: 'positive', impactHint: 'Aids vasodilation before bed' },
  { id: 'dark_room', label: 'Dark Room / Eye Mask', category: 'positive', impactHint: 'Boosts natural melatonin' },
  { id: 'magnesium', label: 'Magnesium / Chamomile', category: 'positive', impactHint: 'Neurological relaxation' },
  { id: 'exercise_early', label: 'Exercise Earlier in Day', category: 'positive', impactHint: 'Enhances deep sleep pressure' },
  { id: 'screen_time', label: 'Screen Time in Bed', category: 'negative', impactHint: 'Blue light delays melatonin' },
  { id: 'caffeine_late', label: 'Caffeine after 2 PM', category: 'negative', impactHint: 'Blocks adenosine receptors' },
  { id: 'alcohol', label: 'Alcohol', category: 'negative', impactHint: 'Fragments REM sleep' },
  { id: 'heavy_meal', label: 'Heavy Late Meal', category: 'negative', impactHint: 'Elevates core body temp' },
  { id: 'stress', label: 'High Stress / Worry', category: 'negative', impactHint: 'Elevates nocturnal sympathetic tone' },
  { id: 'noise', label: 'Noisy Environment', category: 'negative', impactHint: 'Triggers micro-arousals' },
  { id: 'late_workout', label: 'Intense Late Workout', category: 'negative', impactHint: 'Keeps adrenaline & pulse high' },
];

export const QUALITY_LABELS: Record<SleepQuality, { label: string; score: number; color: string; desc: string }> = {
  1: { label: 'Poor', score: 20, color: 'text-rose-500', desc: 'Fragmented, restless, or barely slept' },
  2: { label: 'Restless', score: 40, color: 'text-amber-500', desc: 'Frequent awakenings, light sleep' },
  3: { label: 'Fair', score: 65, color: 'text-yellow-500', desc: 'Adequate rest, room for improvement' },
  4: { label: 'Good', score: 85, color: 'text-teal-500', desc: 'Solid uninterrupted rest, woke up easy' },
  5: { label: 'Optimal', score: 100, color: 'text-emerald-500', desc: 'Deep, rejuvenating restorative sleep' },
};

export const MOOD_LABELS: Record<WakeMood, { label: string; emoji: string; color: string }> = {
  energized: { label: 'Energized', emoji: '⚡', color: 'text-amber-500 bg-amber-500/10' },
  refreshed: { label: 'Refreshed', emoji: '✨', color: 'text-emerald-500 bg-emerald-500/10' },
  normal: { label: 'Normal', emoji: '🙂', color: 'text-sky-500 bg-sky-500/10' },
  groggy: { label: 'Groggy', emoji: '🥱', color: 'text-orange-500 bg-orange-500/10' },
  exhausted: { label: 'Exhausted', emoji: '😫', color: 'text-rose-500 bg-rose-500/10' },
};

/**
 * Parses "HH:MM" into minutes from midnight (0 to 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return (h % 24) * 60 + m;
}

/**
 * Converts minutes from midnight into "HH:MM"
 */
export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates sleep duration in minutes given bedtime (e.g. "23:00") and waketime (e.g. "07:15")
 */
export function calculateSleepDuration(bedtime: string, wakeTime: string): number {
  const bedMins = timeStringToMinutes(bedtime);
  const wakeMins = timeStringToMinutes(wakeTime);
  if (wakeMins >= bedMins) {
    return wakeMins - bedMins;
  }
  // Crosses midnight
  return 1440 - bedMins + wakeMins;
}

/**
 * Formats duration in minutes to e.g. "7h 45m"
 */
export function formatDurationHoursMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formats duration into decimal hours, e.g. "7.8h"
 */
export function formatDurationDecimal(minutes: number): string {
  const hours = (minutes / 60).toFixed(1);
  return `${hours}h`;
}

/**
 * Calculate Sleep Efficiency percentage (0 - 100%)
 */
export function calculateSleepEfficiency(
  durationMinutes: number,
  awakeningsCount = 0,
  timeToFallAsleepMinutes = 15
): number {
  if (durationMinutes <= 0) return 0;
  const totalInBed = durationMinutes + timeToFallAsleepMinutes;
  const estimatedAwakeTime = awakeningsCount * 12 + timeToFallAsleepMinutes;
  const actualSleep = Math.max(0, totalInBed - estimatedAwakeTime);
  const score = Math.round((actualSleep / totalInBed) * 100);
  return Math.min(100, Math.max(35, score));
}

/**
 * Generate default seed sleep logs for the past 7 days
 * so user immediately sees rich charts and trends.
 */
export function getInitialSeedSleepLogs(): SleepLog[] {
  const today = getTodayKey();
  const seedConfigs = [
    { daysAgo: 6, bed: '23:10', wake: '07:20', quality: 4, mood: 'refreshed', awakenings: 1, factors: ['reading', 'cool_room'] },
    { daysAgo: 5, bed: '23:30', wake: '07:15', quality: 3, mood: 'normal', awakenings: 2, factors: ['screen_time'] },
    { daysAgo: 4, bed: '22:45', wake: '07:00', quality: 5, mood: 'energized', awakenings: 0, factors: ['reading', 'meditation', 'dark_room'] },
    { daysAgo: 3, bed: '00:15', wake: '06:45', quality: 2, mood: 'groggy', awakenings: 3, factors: ['screen_time', 'caffeine_late'] },
    { daysAgo: 2, bed: '23:00', wake: '07:30', quality: 4, mood: 'refreshed', awakenings: 1, factors: ['warm_shower', 'cool_room'] },
    { daysAgo: 1, bed: '22:50', wake: '07:10', quality: 5, mood: 'energized', awakenings: 0, factors: ['meditation', 'dark_room'] },
    { daysAgo: 0, bed: '23:15', wake: '07:25', quality: 4, mood: 'refreshed', awakenings: 1, factors: ['reading', 'cool_room'] },
  ];

  return seedConfigs.map((cfg, idx) => {
    const date = addDays(today, -cfg.daysAgo);
    const duration = calculateSleepDuration(cfg.bed, cfg.wake);
    const efficiency = calculateSleepEfficiency(duration, cfg.awakenings, 12);
    // Typical sleep stages breakdown
    const deep = Math.round(duration * 0.22);
    const rem = Math.round(duration * 0.23);
    const light = duration - deep - rem;

    return {
      id: `seed_sleep_${idx + 1}`,
      date,
      bedtime: cfg.bed,
      wakeTime: cfg.wake,
      durationMinutes: duration,
      qualityRating: cfg.quality as SleepQuality,
      wakeMood: cfg.mood as WakeMood,
      awakeningsCount: cfg.awakenings,
      timeToFallAsleepMinutes: 12,
      deepSleepMinutes: deep,
      remSleepMinutes: rem,
      lightSleepMinutes: light,
      efficiencyScore: efficiency,
      factors: cfg.factors,
      notes: idx === 2 ? 'Deep night after evening walk & reading.' : undefined,
      source: 'quick',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Calculates comprehensive sleep analytics and cross-domain correlations with habits.
 */
export function calculateSleepAnalytics(
  logs: SleepLog[],
  settings: SleepSettings = DEFAULT_SLEEP_SETTINGS,
  habitCompletions: HabitCompletion[] = [],
  habits: Habit[] = []
): SleepAnalyticsSummary {
  if (!logs || logs.length === 0) {
    return {
      totalLogs: 0,
      avgDurationMinutes: 0,
      avgQuality: 0,
      targetAdherenceRate: 0,
      currentStreakDays: 0,
      bestStreakDays: 0,
      sleepDebtMinutes: 0,
      bedtimeConsistencyScore: 0,
      wakeTimeConsistencyScore: 0,
      overallEfficiencyScore: 0,
      recentTrend: 'stable',
      correlationWithHabits: {
        wellRestedCompletionRate: 0,
        underRestedCompletionRate: 0,
        boostPercentage: 0,
      },
      factorImpacts: [],
    };
  }

  // Sort logs by date ascending
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.length;
  const targetDurationMins = (settings?.targetHours || 8) * 60;

  // Average duration & quality
  const totalDuration = sorted.reduce((sum, l) => sum + l.durationMinutes, 0);
  const avgDurationMinutes = Math.round(totalDuration / total);

  const totalQuality = sorted.reduce((sum, l) => sum + l.qualityRating, 0);
  const avgQuality = parseFloat((totalQuality / total).toFixed(1));

  // Target adherence (% of logs that achieved target hours - 30m leeway)
  const targetMetLogs = sorted.filter((l) => l.durationMinutes >= targetDurationMins - 30);
  const targetAdherenceRate = Math.round((targetMetLogs.length / total) * 100);

  // Sleep debt over last 7 days
  const last7Logs = sorted.slice(-7);
  const last7Total = last7Logs.reduce((acc, l) => acc + l.durationMinutes, 0);
  const last7Expected = last7Logs.length * targetDurationMins;
  const sleepDebtMinutes = last7Total - last7Expected; // negative if deficit

  // Efficiency
  const totalEfficiency = sorted.reduce(
    (sum, l) => sum + (l.efficiencyScore || calculateSleepEfficiency(l.durationMinutes, l.awakeningsCount)),
    0
  );
  const overallEfficiencyScore = Math.round(totalEfficiency / total);

  // Bedtime consistency (standard deviation of bedtime in minutes)
  const bedTimesMins = sorted.map((l) => {
    const mins = timeStringToMinutes(l.bedtime);
    // Align around midnight: 20:00 - 24:00 is negative offset from midnight
    return mins >= 720 ? mins - 1440 : mins;
  });
  const avgBedMins = bedTimesMins.reduce((a, b) => a + b, 0) / bedTimesMins.length;
  const bedVariance =
    bedTimesMins.reduce((sum, v) => sum + Math.pow(v - avgBedMins, 2), 0) / bedTimesMins.length;
  const bedStdDev = Math.sqrt(bedVariance);
  // Score 100 if stdDev <= 15m, down to 0 if stdDev >= 120m
  const bedtimeConsistencyScore = Math.max(0, Math.min(100, Math.round(100 - (bedStdDev / 120) * 100)));

  // Wake time consistency
  const wakeTimesMins = sorted.map((l) => timeStringToMinutes(l.wakeTime));
  const avgWakeMins = wakeTimesMins.reduce((a, b) => a + b, 0) / wakeTimesMins.length;
  const wakeVariance =
    wakeTimesMins.reduce((sum, v) => sum + Math.pow(v - avgWakeMins, 2), 0) / wakeTimesMins.length;
  const wakeStdDev = Math.sqrt(wakeVariance);
  const wakeTimeConsistencyScore = Math.max(0, Math.min(100, Math.round(100 - (wakeStdDev / 120) * 100)));

  // Recent trend (compare last 3 days vs previous 3 days)
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (sorted.length >= 6) {
    const recent3 = sorted.slice(-3);
    const prior3 = sorted.slice(-6, -3);
    const avgRecentQuality = recent3.reduce((s, l) => s + l.qualityRating, 0) / 3;
    const avgPriorQuality = prior3.reduce((s, l) => s + l.qualityRating, 0) / 3;
    if (avgRecentQuality > avgPriorQuality + 0.3) recentTrend = 'improving';
    else if (avgRecentQuality < avgPriorQuality - 0.3) recentTrend = 'declining';
  }

  // Consecutive sleep streak (logged consecutive days up to today or yesterday)
  const todayKey = getTodayKey();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const logDatesSet = new Set(sorted.map((l) => l.date));

  // Walk backwards from today or yesterday
  let checkDate = logDatesSet.has(todayKey) ? todayKey : addDays(todayKey, -1);
  while (logDatesSet.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  // Calculate best historical streak
  let prevDateKey: string | null = null;
  for (const log of sorted) {
    if (!prevDateKey) {
      tempStreak = 1;
    } else {
      const nextExpected = addDays(prevDateKey, 1);
      if (log.date === nextExpected) {
        tempStreak++;
      } else if (log.date !== prevDateKey) {
        tempStreak = 1;
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
    prevDateKey = log.date;
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  // Cross-domain correlation with habit completion rates!
  // Compare days where sleep was well-rested (>= 7h 15m) vs under-rested (< 7h 15m)
  const activeHabitsCount = habits.filter((h) => h.status === 'active').length || 1;
  const completionsByDate: Record<string, number> = {};
  habitCompletions.forEach((c) => {
    completionsByDate[c.date] = (completionsByDate[c.date] || 0) + 1;
  });

  const wellRestedDates = sorted.filter((l) => l.durationMinutes >= 435).map((l) => l.date);
  const underRestedDates = sorted.filter((l) => l.durationMinutes < 435).map((l) => l.date);

  let wellRestedSum = 0;
  wellRestedDates.forEach((d) => {
    const done = completionsByDate[d] || 0;
    wellRestedSum += Math.min(100, Math.round((done / activeHabitsCount) * 100));
  });
  const wellRestedCompletionRate =
    wellRestedDates.length > 0 ? Math.round(wellRestedSum / wellRestedDates.length) : 85;

  let underRestedSum = 0;
  underRestedDates.forEach((d) => {
    const done = completionsByDate[d] || 0;
    underRestedSum += Math.min(100, Math.round((done / activeHabitsCount) * 100));
  });
  const underRestedCompletionRate =
    underRestedDates.length > 0 ? Math.round(underRestedSum / underRestedDates.length) : 58;

  const boostPercentage = Math.max(0, wellRestedCompletionRate - underRestedCompletionRate);

  // Factor Impact Analysis
  const factorMap: Record<string, { count: number; sumQuality: number }> = {};
  sorted.forEach((l) => {
    (l.factors || []).forEach((fId) => {
      if (!factorMap[fId]) factorMap[fId] = { count: 0, sumQuality: 0 };
      factorMap[fId].count++;
      factorMap[fId].sumQuality += l.qualityRating;
    });
  });

  const factorImpacts = SLEEP_FACTORS.map((sf) => {
    const stat = factorMap[sf.id];
    const count = stat ? stat.count : 0;
    const avgQualityWith = count > 0 ? parseFloat((stat.sumQuality / count).toFixed(1)) : avgQuality;
    const qualityDelta = parseFloat((avgQualityWith - avgQuality).toFixed(1));
    return {
      factorId: sf.id,
      factorLabel: sf.label,
      category: sf.category,
      count,
      avgQualityWith,
      qualityDelta,
    };
  }).filter((fi) => fi.count > 0 || fi.category === 'positive');

  return {
    totalLogs: total,
    avgDurationMinutes,
    avgQuality,
    targetAdherenceRate,
    currentStreakDays: currentStreak,
    bestStreakDays: bestStreak,
    sleepDebtMinutes,
    bedtimeConsistencyScore,
    wakeTimeConsistencyScore,
    overallEfficiencyScore,
    recentTrend,
    correlationWithHabits: {
      wellRestedCompletionRate,
      underRestedCompletionRate,
      boostPercentage,
    },
    factorImpacts: factorImpacts.sort((a, b) => b.qualityDelta - a.qualityDelta),
  };
}
