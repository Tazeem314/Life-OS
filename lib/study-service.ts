import { Todo, DateRange } from './types';
import {
  ActiveStopwatchState,
  ActiveStudyTimerState,
  StudyAnalyticsRange,
  StudyAnalyticsSummary,
  StudyDailyMetric,
  StudyDashboardSummary,
  StudyNoteVideoLink,
  StudySession,
  StudyTaskAnalyticsRow,
} from './study-types';
import { addDays, formatToDateKey, getTodayKey, parseDateKey } from './date-utils';

/**
 * Returns true if and only if the task is classified as a Study To-Do.
 * Preserves compatibility with legacy To-Dos that lack taskType.
 */
export function isStudyTodo(todo: Pick<Todo, 'taskType'> | null | undefined): boolean {
  return todo?.taskType === 'study';
}

/**
 * Derives live elapsed milliseconds for an active Study Timer from persisted timestamps.
 */
export function computeActiveStudyElapsedMs(
  active: ActiveStudyTimerState | null,
  nowMs: number = Date.now()
): number {
  if (!active) return 0;
  const base = Math.max(0, active.accumulatedActiveMs || 0);
  if (active.status === 'running' && typeof active.segmentStartTimestamp === 'number') {
    return base + Math.max(0, nowMs - active.segmentStartTimestamp);
  }
  return base;
}

/**
 * Derives live elapsed milliseconds for an active Stopwatch from persisted timestamps.
 */
export function computeActiveStopwatchElapsedMs(
  active: ActiveStopwatchState | null,
  nowMs: number = Date.now()
): number {
  if (!active) return 0;
  const base = Math.max(0, active.accumulatedMs || 0);
  if (active.status === 'running' && typeof active.segmentStartTimestamp === 'number') {
    return base + Math.max(0, nowMs - active.segmentStartTimestamp);
  }
  return base;
}

/**
 * Formats milliseconds into HH:MM:SS (e.g. 01:24:09).
 */
export function formatHMS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats milliseconds into HH:MM:SS and two-digit centiseconds.
 */
export function formatHMSCentiseconds(ms: number): { main: string; centiseconds: string } {
  const safe = Math.max(0, ms);
  const centi = Math.floor((safe % 1000) / 10);
  return {
    main: formatHMS(safe),
    centiseconds: String(centi).padStart(2, '0'),
  };
}

export interface StudyTargetProgress {
  hasTarget: boolean;
  targetMinutes: number;
  targetMs: number;
  remainingMs: number;
  overtimeMs: number;
  isOvertime: boolean;
  progressPct: number;
  primaryTimeLabel: string;
}

/**
 * Computes remaining countdown time, overtime, progress %, and primary display string
 * from elapsed milliseconds and an optional target duration in minutes.
 */
export function computeStudyTargetProgress(
  elapsedMs: number,
  targetDurationMinutes?: number | null
): StudyTargetProgress {
  const safeElapsed = Math.max(0, elapsedMs || 0);
  const validTargetMins =
    typeof targetDurationMinutes === 'number' &&
    Number.isFinite(targetDurationMinutes) &&
    targetDurationMinutes > 0
      ? Math.round(targetDurationMinutes)
      : 0;

  if (validTargetMins <= 0) {
    return {
      hasTarget: false,
      targetMinutes: 0,
      targetMs: 0,
      remainingMs: 0,
      overtimeMs: 0,
      isOvertime: false,
      progressPct: 0,
      primaryTimeLabel: formatHMS(safeElapsed),
    };
  }

  const targetMs = validTargetMins * 60000;
  const isOvertime = safeElapsed >= targetMs;
  const remainingMs = isOvertime ? 0 : Math.max(0, targetMs - safeElapsed);
  const overtimeMs = isOvertime ? Math.max(0, safeElapsed - targetMs) : 0;
  const progressPct = Math.min(100, Math.max(0, Math.round((safeElapsed / targetMs) * 100)));

  // For countdown display, ceil sub-second remainder unless exact 0 so 60:00 drops cleanly to 59:59 at 1s
  const displayRemainingMs =
    remainingMs > 0 ? Math.ceil(remainingMs / 1000) * 1000 : 0;

  return {
    hasTarget: true,
    targetMinutes: validTargetMins,
    targetMs,
    remainingMs,
    overtimeMs,
    isOvertime,
    progressPct,
    primaryTimeLabel: isOvertime
      ? `+${formatHMS(overtimeMs)}`
      : formatHMS(displayRemainingMs),
  };
}

/**
 * Formats integer minutes cleanly for study planning & analytics (e.g., "1h 30m", "45m", "0m").
 */
export function formatStudyMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes || 0));
  if (safe < 60) return `${safe}m`;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Formats millisecond session durations cleanly without inflating short (<1m) sessions.
 */
export function formatStudyDurationMs(ms: number): string {
  const safe = Math.max(0, Math.round(ms || 0));
  const totalSeconds = Math.floor(safe / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return secs > 0 && mins < 10 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val < 10 && idx > 0 ? val.toFixed(1) : Math.round(val)} ${units[idx]}`;
}

/**
 * Parses YouTube or external video URLs into a safe Video Link entry.
 */
export function parseVideoLinkUrl(
  rawUrl: string,
  title?: string
): StudyNoteVideoLink | { error: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { error: 'Please enter a valid video URL.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return { error: 'Invalid URL format. Include https:// or a valid web address.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Only http:// and https:// video links are supported.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let youtubeId: string | null = null;

  if (host === 'youtu.be') {
    youtubeId = parsed.pathname.split('/').filter(Boolean)[0] || null;
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      youtubeId = parsed.searchParams.get('v');
    } else if (parsed.pathname.startsWith('/embed/')) {
      youtubeId = parsed.pathname.split('/')[2] || null;
    } else if (parsed.pathname.startsWith('/shorts/')) {
      youtubeId = parsed.pathname.split('/')[2] || null;
    } else if (parsed.pathname.startsWith('/live/')) {
      youtubeId = parsed.pathname.split('/')[2] || null;
    }
  }

  const id = `vlink_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  if (youtubeId && /^[a-zA-Z0-9_-]{6,20}$/.test(youtubeId)) {
    return {
      id,
      url: parsed.toString(),
      title: title?.trim() || undefined,
      platform: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      addedAt: nowIso,
    };
  }

  return {
    id,
    url: parsed.toString(),
    title: title?.trim() || undefined,
    platform: 'external',
    addedAt: nowIso,
  };
}

/**
 * Resolves a date range window for Study Analytics.
 */
export function resolveStudyAnalyticsRange(
  range: StudyAnalyticsRange,
  customRange?: DateRange,
  anchorDate: string = getTodayKey()
): { startDate: string; endDate: string; groupByMonth: boolean } {
  if (range === 'daily') {
    return { startDate: anchorDate, endDate: anchorDate, groupByMonth: false };
  }
  if (range === 'weekly') {
    // 7-day rolling ending on anchorDate (or current week Mon-Sun — let's use 7 days up to anchorDate)
    return { startDate: addDays(anchorDate, -6), endDate: anchorDate, groupByMonth: false };
  }
  if (range === 'monthly') {
    const dt = parseDateKey(anchorDate);
    const first = new Date(dt.getFullYear(), dt.getMonth(), 1, 12, 0, 0);
    const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 12, 0, 0);
    return {
      startDate: formatToDateKey(first),
      endDate: formatToDateKey(last),
      groupByMonth: false,
    };
  }
  if (range === 'yearly') {
    const dt = parseDateKey(anchorDate);
    const first = new Date(dt.getFullYear(), 0, 1, 12, 0, 0);
    const last = new Date(dt.getFullYear(), 11, 31, 12, 0, 0);
    return {
      startDate: formatToDateKey(first),
      endDate: formatToDateKey(last),
      groupByMonth: true,
    };
  }

  const start = customRange?.startDate || addDays(anchorDate, -13);
  const end = customRange?.endDate || anchorDate;
  const orderedStart = start <= end ? start : end;
  const orderedEnd = start <= end ? end : start;

  const spanDays = Math.round(
    (parseDateKey(orderedEnd).getTime() - parseDateKey(orderedStart).getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    startDate: orderedStart,
    endDate: orderedEnd,
    groupByMonth: spanDays > 95,
  };
}

/**
 * Computes compact today summary for the main Life OS Dashboard.
 */
export function calculateStudyDashboardSummary(
  todayKey: string,
  todos: Todo[],
  studySessions: StudySession[]
): StudyDashboardSummary {
  const studyTodosToday = (todos || []).filter((t) => t.date === todayKey && isStudyTodo(t));
  const completedStudyTodos = studyTodosToday.filter((t) => t.completed);

  const plannedMinutes = studyTodosToday.reduce(
    (sum, t) => sum + (Number.isFinite(t.estimatedDurationMinutes) ? Math.max(0, t.estimatedDurationMinutes || 0) : 0),
    0
  );
  const estimatedCompletedMinutes = completedStudyTodos.reduce(
    (sum, t) => sum + (Number.isFinite(t.estimatedDurationMinutes) ? Math.max(0, t.estimatedDurationMinutes || 0) : 0),
    0
  );
  const remainingStudyMinutes = Math.max(0, plannedMinutes - estimatedCompletedMinutes);

  const completedSessionsToday = (studySessions || []).filter(
    (s) => s.status === 'completed' && s.dateKey === todayKey
  );
  const actualStudiedMs = completedSessionsToday.reduce(
    (sum, s) => sum + Math.max(0, s.actualDurationMs || 0),
    0
  );
  const actualStudiedMinutes = Math.round(actualStudiedMs / 60000);

  const studyTasksTotal = studyTodosToday.length;
  const studyTasksCompleted = completedStudyTodos.length;
  const studyTaskProgressPct =
    studyTasksTotal > 0 ? Math.round((studyTasksCompleted / studyTasksTotal) * 100) : 0;

  return {
    dateKey: todayKey,
    plannedMinutes,
    estimatedCompletedMinutes,
    remainingStudyMinutes,
    actualStudiedMinutes,
    actualStudiedMs,
    studyTasksTotal,
    studyTasksCompleted,
    studyTaskProgressPct,
  };
}

/**
 * Computes full Study Analytics while strictly separating:
 * 1) Planned Study Time (scheduled Study To-Dos)
 * 2) Estimated Completed Study Time (completed Study To-Dos)
 * 3) Actual Study Time (completed Study Timer sessions + manually converted Stopwatch study sessions)
 */
export function calculateStudyAnalytics(
  range: StudyAnalyticsRange,
  customRange: DateRange | undefined,
  todos: Todo[],
  studySessions: StudySession[],
  anchorDate: string = getTodayKey()
): StudyAnalyticsSummary {
  const { startDate, endDate, groupByMonth } = resolveStudyAnalyticsRange(range, customRange, anchorDate);

  const filteredTodos = (todos || []).filter(
    (t) => isStudyTodo(t) && t.date >= startDate && t.date <= endDate
  );
  const filteredSessions = (studySessions || [])
    .filter((s) => s.status === 'completed' && s.dateKey >= startDate && s.dateKey <= endDate)
    .sort((a, b) => b.startTimestamp - a.startTimestamp);

  const plannedMinutes = filteredTodos.reduce(
    (sum, t) => sum + Math.max(0, t.estimatedDurationMinutes || 0),
    0
  );
  const estimatedCompletedMinutes = filteredTodos
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + Math.max(0, t.estimatedDurationMinutes || 0), 0);
  const remainingPlannedMinutes = Math.max(0, plannedMinutes - estimatedCompletedMinutes);

  const actualStudiedMs = filteredSessions.reduce(
    (sum, s) => sum + Math.max(0, s.actualDurationMs || 0),
    0
  );
  const actualStudiedMinutes = Math.round(actualStudiedMs / 60000);

  // Build time buckets (by month if Yearly or >95d custom span, else by day)
  const buckets: StudyDailyMetric[] = [];

  if (groupByMonth) {
    const startDt = parseDateKey(startDate);
    const endDt = parseDateKey(endDate);
    const monthBuckets = new Map<string, StudyDailyMetric>();
    let cursor = new Date(startDt.getFullYear(), startDt.getMonth(), 1, 12, 0, 0);
    const endBoundary = new Date(endDt.getFullYear(), endDt.getMonth(), 1, 12, 0, 0);

    while (cursor <= endBoundary) {
      const mKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const shortLabel = cursor.toLocaleDateString('en-US', { month: 'short' });
      monthBuckets.set(mKey, {
        dateKey: mKey,
        label,
        shortLabel,
        plannedMinutes: 0,
        estimatedCompletedMinutes: 0,
        actualStudiedMinutes: 0,
        actualStudiedMs: 0,
        studyTasksTotal: 0,
        studyTasksCompleted: 0,
        sessionsCount: 0,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12, 0, 0);
    }

    for (const t of filteredTodos) {
      const mKey = t.date.slice(0, 7);
      const b = monthBuckets.get(mKey);
      if (b) {
        const mins = Math.max(0, t.estimatedDurationMinutes || 0);
        b.plannedMinutes += mins;
        b.studyTasksTotal += 1;
        if (t.completed) {
          b.estimatedCompletedMinutes += mins;
          b.studyTasksCompleted += 1;
        }
      }
    }

    for (const s of filteredSessions) {
      const mKey = s.dateKey.slice(0, 7);
      const b = monthBuckets.get(mKey);
      if (b) {
        b.actualStudiedMs += Math.max(0, s.actualDurationMs || 0);
        b.sessionsCount += 1;
      }
    }

    for (const b of monthBuckets.values()) {
      b.actualStudiedMinutes = Math.round(b.actualStudiedMs / 60000);
      buckets.push(b);
    }
  } else {
    const dayBuckets = new Map<string, StudyDailyMetric>();
    let cursor = startDate;
    let safety = 0;
    while (cursor <= endDate && safety < 120) {
      safety += 1;
      const dt = parseDateKey(cursor);
      dayBuckets.set(cursor, {
        dateKey: cursor,
        label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shortLabel:
          range === 'weekly'
            ? dt.toLocaleDateString('en-US', { weekday: 'short' })
            : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        plannedMinutes: 0,
        estimatedCompletedMinutes: 0,
        actualStudiedMinutes: 0,
        actualStudiedMs: 0,
        studyTasksTotal: 0,
        studyTasksCompleted: 0,
        sessionsCount: 0,
      });
      cursor = addDays(cursor, 1);
    }

    for (const t of filteredTodos) {
      const b = dayBuckets.get(t.date);
      if (b) {
        const mins = Math.max(0, t.estimatedDurationMinutes || 0);
        b.plannedMinutes += mins;
        b.studyTasksTotal += 1;
        if (t.completed) {
          b.estimatedCompletedMinutes += mins;
          b.studyTasksCompleted += 1;
        }
      }
    }

    for (const s of filteredSessions) {
      const b = dayBuckets.get(s.dateKey);
      if (b) {
        b.actualStudiedMs += Math.max(0, s.actualDurationMs || 0);
        b.sessionsCount += 1;
      }
    }

    for (const b of dayBuckets.values()) {
      b.actualStudiedMinutes = Math.round(b.actualStudiedMs / 60000);
      buckets.push(b);
    }
  }

  // Per-Task breakdown (includes Study tasks + orphaned/deleted task snapshots + unlinked sessions)
  const taskMap = new Map<string, StudyTaskAnalyticsRow>();
  for (const t of filteredTodos) {
    const mins = Math.max(0, t.estimatedDurationMinutes || 0);
    taskMap.set(t.id, {
      taskId: t.id,
      title: t.title,
      dateKey: t.date,
      completed: t.completed,
      plannedMinutes: mins,
      estimatedCompletedMinutes: t.completed ? mins : 0,
      actualStudiedMs: 0,
      actualStudiedMinutes: 0,
      sessionsCount: 0,
    });
  }

  for (const s of filteredSessions) {
    const rowKey = s.taskId && !s.isUnlinked ? s.taskId : `unlinked:${s.taskNameSnapshot || 'Unlinked Study'}`;
    const existing = taskMap.get(rowKey);
    if (existing) {
      existing.actualStudiedMs += Math.max(0, s.actualDurationMs || 0);
      existing.actualStudiedMinutes = Math.round(existing.actualStudiedMs / 60000);
      existing.sessionsCount += 1;
    } else {
      taskMap.set(rowKey, {
        taskId: rowKey,
        title: s.taskNameSnapshot || 'Unlinked Study Session',
        dateKey: s.dateKey,
        completed: false,
        plannedMinutes: 0,
        estimatedCompletedMinutes: 0,
        actualStudiedMs: Math.max(0, s.actualDurationMs || 0),
        actualStudiedMinutes: Math.round(Math.max(0, s.actualDurationMs || 0) / 60000),
        sessionsCount: 1,
      });
    }
  }

  const taskBreakdown = Array.from(taskMap.values()).sort(
    (a, b) => b.actualStudiedMs - a.actualStudiedMs || b.plannedMinutes - a.plannedMinutes
  );

  return {
    startDate,
    endDate,
    plannedMinutes,
    estimatedCompletedMinutes,
    remainingPlannedMinutes,
    actualStudiedMinutes,
    actualStudiedMs,
    studyTasksTotal: filteredTodos.length,
    studyTasksCompleted: filteredTodos.filter((t) => t.completed).length,
    completedSessionsCount: filteredSessions.length,
    buckets,
    taskBreakdown,
    sessions: filteredSessions,
  };
}
