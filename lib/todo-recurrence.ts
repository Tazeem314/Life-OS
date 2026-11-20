import { Todo, TodoRecurrence } from './types';
import { addDays, DAYS_SHORT, getDayOfWeek, getTodayKey } from './date-utils';

export const DEFAULT_TODO_RECURRENCE_HORIZON_DAYS = 30;
export const MAX_TODO_RECURRENCE_HORIZON_DAYS = 365;
const MAX_GENERATION_ITERATIONS = 400;

export function normalizeTodoRecurrence(recurrence?: TodoRecurrence | string): TodoRecurrence {
  if (recurrence === 'daily' || recurrence === 'weekdays' || recurrence === 'weekly') {
    return recurrence;
  }
  return 'none';
}

export function normalizeRecurrenceDays(
  recurrence: TodoRecurrence,
  anchorDate: string,
  days?: number[]
): number[] {
  if (recurrence === 'none' || recurrence === 'daily') {
    return [];
  }

  const sanitized = Array.isArray(days)
    ? Array.from(new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b)
    : [];

  if (recurrence === 'weekdays') {
    return sanitized.length > 0 ? sanitized : [1, 2, 3, 4, 5];
  }

  // 'weekly'
  if (sanitized.length > 0) {
    return sanitized;
  }
  return [getDayOfWeek(anchorDate)];
}

export function isTodoScheduledForDate(
  recurrence: TodoRecurrence | undefined,
  recurrenceDays: number[] | undefined,
  startDate: string,
  targetDate: string
): boolean {
  const mode = normalizeTodoRecurrence(recurrence);
  if (mode === 'none') {
    return targetDate === startDate;
  }

  if (targetDate < startDate) {
    return false;
  }

  if (mode === 'daily') {
    return true;
  }

  const dow = getDayOfWeek(targetDate);
  const normalizedDays = normalizeRecurrenceDays(mode, startDate, recurrenceDays);
  return normalizedDays.includes(dow);
}

export function buildRecurringTodoSeriesId(): string {
  return `rseries_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function buildRecurringTodoId(seriesId: string, dateKey: string): string {
  const safeSeries = seriesId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeDate = dateKey.replace(/[^0-9-]/g, '');
  return `todo_rec_${safeSeries}_${safeDate}`;
}

export function getTodoHorizonEndDate(
  todayKey: string,
  startDate: string,
  selectedDate?: string
): string {
  const thirtyFromToday = addDays(todayKey, DEFAULT_TODO_RECURRENCE_HORIZON_DAYS);
  const thirtyFromStart = addDays(startDate, DEFAULT_TODO_RECURRENCE_HORIZON_DAYS);
  const selectedHorizon = selectedDate ? addDays(selectedDate, 14) : todayKey;

  let horizon = thirtyFromToday > thirtyFromStart ? thirtyFromToday : thirtyFromStart;
  if (selectedHorizon > horizon) {
    horizon = selectedHorizon;
  }

  const maxFromToday = addDays(todayKey, MAX_TODO_RECURRENCE_HORIZON_DAYS);
  const hardCap = thirtyFromStart > maxFromToday ? thirtyFromStart : maxFromToday;

  return horizon <= hardCap ? horizon : hardCap;
}

export function getRecurrenceSummaryText(
  recurrence?: TodoRecurrence,
  recurrenceDays?: number[],
  anchorDate?: string
): string {
  const mode = normalizeTodoRecurrence(recurrence);
  if (mode === 'none') return 'One-time';
  if (mode === 'daily') return 'Daily';

  const days = normalizeRecurrenceDays(mode, anchorDate || getTodayKey(), recurrenceDays);
  if (mode === 'weekdays') {
    const isStandardWeekdays =
      days.length === 5 &&
      days[0] === 1 &&
      days[1] === 2 &&
      days[2] === 3 &&
      days[3] === 4 &&
      days[4] === 5;
    if (isStandardWeekdays) return 'Weekdays';
  }

  if (days.length === 7) return 'Daily';
  if (days.length === 1) {
    return `Every ${DAYS_SHORT[days[0]]}`;
  }
  return days.map((d) => DAYS_SHORT[d]).join(', ');
}

export interface GenerateRecurringTodosOptions {
  seriesId: string;
  startDate: string;
  horizonEndDate: string;
  existingTodos: Todo[];
  deletedIds?: Set<string>;
  skippedOccurrences?: Set<string>; // `${seriesId}_${dateKey}`
  nowIso?: string;
}

export function generateRecurringTodoInstances(
  template: Omit<Todo, 'id' | 'createdAt' | 'updatedAt' | 'order'>,
  options: GenerateRecurringTodosOptions
): Todo[] {
  const recurrence = normalizeTodoRecurrence(template.recurrence);
  if (recurrence === 'none') return [];

  const {
    seriesId,
    startDate,
    horizonEndDate,
    existingTodos,
    deletedIds = new Set<string>(),
    skippedOccurrences = new Set<string>(),
    nowIso = new Date().toISOString(),
  } = options;

  const normalizedDays = normalizeRecurrenceDays(recurrence, startDate, template.recurrenceDays);

  // Track max order per date across existing todos so newly added occurrences append cleanly
  const maxOrderByDate = new Map<string, number>();
  const existingKeys = new Set<string>();
  const existingIds = new Set<string>();

  for (const t of existingTodos) {
    existingIds.add(t.id);
    if (t.recurrenceSeriesId) {
      existingKeys.add(`${t.recurrenceSeriesId}_${t.date}`);
    }
    const prevMax = maxOrderByDate.get(t.date) ?? -1;
    if ((t.order ?? 0) > prevMax) {
      maxOrderByDate.set(t.date, t.order ?? 0);
    }
  }

  const created: Todo[] = [];
  let cursor = startDate;
  let iterations = 0;

  while (cursor <= horizonEndDate && iterations < MAX_GENERATION_ITERATIONS) {
    iterations += 1;

    if (isTodoScheduledForDate(recurrence, normalizedDays, startDate, cursor)) {
      const deterministicId = buildRecurringTodoId(seriesId, cursor);
      const occurrenceKey = `${seriesId}_${cursor}`;

      const alreadyExists =
        existingIds.has(deterministicId) || existingKeys.has(occurrenceKey);
      const wasDeleted =
        deletedIds.has(deterministicId) || skippedOccurrences.has(occurrenceKey);

      if (!alreadyExists && !wasDeleted) {
        const nextOrder = (maxOrderByDate.get(cursor) ?? -1) + 1;
        maxOrderByDate.set(cursor, nextOrder);
        existingIds.add(deterministicId);
        existingKeys.add(occurrenceKey);

        created.push({
          id: deterministicId,
          title: template.title.trim(),
          date: cursor,
          priority: template.priority,
          dueTime: template.dueTime || undefined,
          notes: template.notes || undefined,
          category: template.category || 'General',
          taskType: template.taskType,
          estimatedDurationMinutes: template.estimatedDurationMinutes,
          completed: cursor === template.date ? Boolean(template.completed) : false,
          order: nextOrder,
          recurrence,
          recurrenceDays: normalizedDays.length > 0 ? normalizedDays : undefined,
          recurrenceSeriesId: seriesId,
          recurrenceStartDate: template.recurrenceStartDate || startDate,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    cursor = addDays(cursor, 1);
  }

  return created;
}

export interface FindMissingRecurringOptions {
  todayKey?: string;
  selectedDate?: string;
  deletedIds?: Set<string>;
  skippedOccurrences?: Set<string>;
  nowIso?: string;
}

/**
 * Inspects active recurring to-do series and materializes any scheduled instances
 * from max(todayKey, seriesStartDate) through the current rolling horizon that have not
 * yet been created or explicitly deleted.
 */
export function findMissingRecurringTodoInstances(
  todos: Todo[],
  options: FindMissingRecurringOptions = {}
): Todo[] {
  const todayKey = options.todayKey || getTodayKey();
  const deletedIds = options.deletedIds || new Set<string>();
  const skippedOccurrences = options.skippedOccurrences || new Set<string>();
  const nowIso = options.nowIso || new Date().toISOString();

  // Group recurring todos by seriesId and pick the latest instance per series as canonical template
  const seriesMap = new Map<string, Todo[]>();
  for (const t of todos) {
    if (t.recurrence && t.recurrence !== 'none' && t.recurrenceSeriesId) {
      const list = seriesMap.get(t.recurrenceSeriesId) || [];
      list.push(t);
      seriesMap.set(t.recurrenceSeriesId, list);
    }
  }

  if (seriesMap.size === 0) return [];

  const missingAll: Todo[] = [];
  const augmentedTodos = [...todos];

  for (const [seriesId, instances] of seriesMap.entries()) {
    // Pick the most recently updated / latest scheduled instance as template
    const sorted = [...instances].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    const template = sorted[0];
    if (!template || !template.recurrence || template.recurrence === 'none') continue;

    // Anchor start date to series start or earliest existing instance date
    let seriesStart = template.recurrenceStartDate || template.date;
    for (const inst of instances) {
      if (inst.recurrenceStartDate && inst.recurrenceStartDate < seriesStart) {
        seriesStart = inst.recurrenceStartDate;
      }
      if (inst.date < seriesStart) {
        seriesStart = inst.date;
      }
    }

    // Only materialize missing dates from today forward (or seriesStart if in the future)
    // so historical dates before today are never retroactively backfilled if user didn't want them.
    const materializeFrom = todayKey > seriesStart ? todayKey : seriesStart;
    const horizonEndDate = getTodoHorizonEndDate(todayKey, seriesStart, options.selectedDate);

    // Filter dates in [materializeFrom .. horizonEndDate] that match schedule anchored at seriesStart
    const days = normalizeRecurrenceDays(
      template.recurrence,
      seriesStart,
      template.recurrenceDays
    );

    const existingIds = new Set(augmentedTodos.map((t) => t.id));
    const existingKeys = new Set(
      augmentedTodos
        .filter((t) => t.recurrenceSeriesId)
        .map((t) => `${t.recurrenceSeriesId}_${t.date}`)
    );
    const maxOrderByDate = new Map<string, number>();
    for (const t of augmentedTodos) {
      const prev = maxOrderByDate.get(t.date) ?? -1;
      if ((t.order ?? 0) > prev) maxOrderByDate.set(t.date, t.order ?? 0);
    }

    let cursor = materializeFrom;
    let iterations = 0;

    while (cursor <= horizonEndDate && iterations < MAX_GENERATION_ITERATIONS) {
      iterations += 1;

      if (isTodoScheduledForDate(template.recurrence, days, seriesStart, cursor)) {
        const deterministicId = buildRecurringTodoId(seriesId, cursor);
        const occurrenceKey = `${seriesId}_${cursor}`;

        const alreadyExists =
          existingIds.has(deterministicId) || existingKeys.has(occurrenceKey);
        const wasDeleted =
          deletedIds.has(deterministicId) || skippedOccurrences.has(occurrenceKey);

        if (!alreadyExists && !wasDeleted) {
          const nextOrder = (maxOrderByDate.get(cursor) ?? -1) + 1;
          maxOrderByDate.set(cursor, nextOrder);
          existingIds.add(deterministicId);
          existingKeys.add(occurrenceKey);

          const instance: Todo = {
            id: deterministicId,
            title: template.title,
            date: cursor,
            priority: template.priority,
            dueTime: template.dueTime || undefined,
            notes: template.notes || undefined,
            category: template.category || 'General',
            taskType: template.taskType,
            estimatedDurationMinutes: template.estimatedDurationMinutes,
            completed: false,
            order: nextOrder,
            recurrence: template.recurrence,
            recurrenceDays: days.length > 0 ? days : undefined,
            recurrenceSeriesId: seriesId,
            recurrenceStartDate: seriesStart,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          missingAll.push(instance);
          augmentedTodos.push(instance);
        }
      }

      cursor = addDays(cursor, 1);
    }
  }

  return missingAll;
}
