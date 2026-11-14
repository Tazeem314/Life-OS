import { Habit, Todo, Goal, HabitCompletion } from './types';
import {
  NotificationRecord,
  NotificationSettings,
  ReminderDefinition,
  DEFAULT_NOTIFICATION_SETTINGS,
} from './notification-types';
import { isWithinQuietHours, generateNotificationId } from './notification-service';

export interface ReminderEvaluationContext {
  userId?: string;
  settings?: NotificationSettings;
  habits?: Habit[];
  habitCompletions?: (HabitCompletion | { habitId: string; date?: string; dateKey?: string })[];
  todos?: Todo[];
  tasks?: Todo[];
  goals?: Goal[];
  savingsGoals?: unknown[];
  customReminders?: ReminderDefinition[];
  existingNotifications?: NotificationRecord[];
  dismissedKeys?: Set<string> | string[];
  clearedAllAt?: string | null;
  currentDateKey?: string; // "YYYY-MM-DD"
  currentTimeStr?: string; // "HH:mm"
  currentDate?: Date;
}

/**
 * Normalizes any timestamp value (ISO string, epoch ms, or Firestore Timestamp-like object)
 * into epoch milliseconds, returning null if missing or invalid.
 */
export function normalizeTimestampMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && /^\d+$/.test(trimmed)) {
      return numeric;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === 'object') {
    const maybeTs = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      try {
        const ms = maybeTs.toMillis();
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    const secs = typeof maybeTs.seconds === 'number' ? maybeTs.seconds : maybeTs._seconds;
    if (typeof secs === 'number' && Number.isFinite(secs)) {
      return secs * 1000;
    }
  }
  return null;
}

/**
 * Formats an epoch/Timestamp/ISO timestamp into a canonical ISO string if valid.
 */
export function normalizeIsoTimestamp(value: unknown, fallback?: string): string {
  const ms = normalizeTimestampMs(value);
  if (ms !== null) {
    return new Date(ms).toISOString();
  }
  return fallback ?? '';
}

function getLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLocalTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Normalizes an idempotency/deduplication key so that userId differences
 * (e.g. 'local_user' vs Firebase UID, or cross-session rehydration)
 * still resolve to the exact same canonical dismissal key.
 */
export function stripUserIdFromNotificationKey(key?: string, userId?: string): string | null {
  if (!key || typeof key !== 'string') return null;

  let stripped = key;
  if (userId && stripped.includes(`_${userId}_`)) {
    stripped = stripped.replace(`_${userId}_`, '_');
  } else if (stripped.includes('_local_user_')) {
    stripped = stripped.replace('_local_user_', '_');
  } else {
    const match = stripped.match(
      /^(task_overdue|task_due|habit_prompt|routine_morning|routine_evening|routine_weekly|goal_target|custom_rem)_([A-Za-z0-9_-]{8,}|local_user)_(.+)$/
    );
    if (match) {
      stripped = `${match[1]}_${match[3]}`;
    }
  }

  return stripped !== key ? stripped : null;
}

/**
 * Derives canonical dismissal/suppression keys associated with a notification record.
 * Keeping the per-notification key set compact prevents unbounded growth in storage.
 */
export function getNotificationDismissalKeys(
  notif: Partial<NotificationRecord> & { id?: string },
  userId?: string,
  fallbackDateKey?: string
): string[] {
  const keys = new Set<string>();

  if (notif.id) keys.add(notif.id);

  const createdMs = normalizeTimestampMs(notif.createdAt);
  const dateKey =
    fallbackDateKey ||
    (createdMs !== null
      ? getLocalDateKey(new Date(createdMs))
      : typeof notif.createdAt === 'string' && notif.createdAt.length >= 10
      ? notif.createdAt.slice(0, 10)
      : undefined);

  const candidateKeys = [notif.idempotencyKey, notif.deduplicationKey].filter(
    (k): k is string => Boolean(k && typeof k === 'string')
  );

  for (const k of candidateKeys) {
    const stripped = stripUserIdFromNotificationKey(k, notif.userId || userId);
    keys.add(stripped ? `c:${stripped}` : `c:${k}`);
    keys.add(k);
  }

  const entityId = notif.relatedId || notif.sourceId;
  if (notif.category && entityId && dateKey) {
    keys.add(`e:${notif.category}:${entityId}:${dateKey}`);
  }

  return Array.from(keys);
}

/**
 * Returns true if a notification matches any dismissed key or predates (or lacks timestamp under) the Clear All watermark.
 */
export function isNotificationDismissed(
  notif: Partial<NotificationRecord> & { id?: string },
  dismissedKeys: Set<string>,
  clearedAllAt?: string | null,
  userId?: string
): boolean {
  const clearedMs = normalizeTimestampMs(clearedAllAt);
  if (clearedMs !== null) {
    const createdMs = normalizeTimestampMs(notif.createdAt);
    // Any notification without a valid timestamp or created at/before clearedAllAt is suppressed
    if (createdMs === null || createdMs <= clearedMs) {
      return true;
    }
  }

  if (!dismissedKeys || dismissedKeys.size === 0) {
    return false;
  }

  const keys = getNotificationDismissalKeys(notif, userId);
  return keys.some((k) => dismissedKeys.has(k));
}

/**
 * Evaluates whether a trigger timestamp/schedule predates a Delete-All watermark.
 * Ensures that after clicking "Delete All Notifications", previously triggered alerts from today
 * stay hidden, while brand-new tasks/habits/goals/reminders created or scheduled strictly after
 * clearedAllAt can still fire normally.
 */
function wasTriggerCoveredByClearAll(
  clearedMs: number | null,
  clearedDateKey: string | null,
  clearedTimeStr: string | null,
  currentDateKey: string,
  scheduleTimeStr?: string | null,
  sourceUpdatedAt?: unknown,
  sourceCreatedAt?: unknown
): boolean {
  if (clearedMs === null || !clearedDateKey) return false;

  // Only suppress same-day (or earlier) triggers; future days start fresh
  if (currentDateKey > clearedDateKey) {
    return false;
  }

  // If the underlying entity (task/habit/goal/reminder) was created or edited strictly AFTER clearedAllAt,
  // allow it to evaluate as a brand-new/updated future event.
  const updatedMs = normalizeTimestampMs(sourceUpdatedAt);
  const createdMs = normalizeTimestampMs(sourceCreatedAt);
  if ((updatedMs !== null && updatedMs > clearedMs) || (createdMs !== null && createdMs > clearedMs)) {
    return false;
  }

  // If this trigger has a scheduled HH:mm strictly after clearedTimeStr on the same day,
  // it had NOT fired yet when Delete All was clicked -> allow it when its time arrives!
  if (scheduleTimeStr && clearedTimeStr && currentDateKey === clearedDateKey) {
    if (scheduleTimeStr > clearedTimeStr) {
      return false;
    }
  }

  // Otherwise this alert was already active/eligible at or before clearedAllAt -> keep suppressed.
  return true;
}

/**
 * Evaluates all productivity and routine conditions to determine if any new notifications should be dispatched.
 * Guarantees idempotency via stable unique idempotencyKey hashes, canonical dismissal matching,
 * and strict clearedAllAt watermark enforcement.
 */
export function evaluateReminders(context: ReminderEvaluationContext): NotificationRecord[] {
  const settings = context.settings || DEFAULT_NOTIFICATION_SETTINGS;
  if (!settings || (settings.enabled === false && !settings.inAppEnabled && !settings.pushEnabled)) {
    return [];
  }

  const userId = context.userId || 'local_user';
  const habits = context.habits || [];
  const habitCompletions = context.habitCompletions || [];
  const todos = context.todos || context.tasks || [];
  const goals = context.goals || [];
  const customReminders = context.customReminders || [];
  const existingNotifications = context.existingNotifications || [];

  const now = context.currentDate || new Date();
  const currentDateKey = context.currentDateKey || getLocalDateKey(now);
  const currentTimeStr = context.currentTimeStr || getLocalTimeStr(now);

  const clearedMs = normalizeTimestampMs(context.clearedAllAt);
  const clearedDate = clearedMs !== null ? new Date(clearedMs) : null;
  const clearedDateKey = clearedDate ? getLocalDateKey(clearedDate) : null;
  const clearedTimeStr = clearedDate ? getLocalTimeStr(clearedDate) : null;

  const existingKeys = new Set<string>();
  for (const n of existingNotifications) {
    for (const k of getNotificationDismissalKeys(n, userId, currentDateKey)) {
      existingKeys.add(k);
    }
  }

  const dismissedKeys = new Set<string>(
    Array.isArray(context.dismissedKeys)
      ? context.dismissedKeys
      : context.dismissedKeys instanceof Set
      ? Array.from(context.dismissedKeys)
      : []
  );

  const newNotifications: NotificationRecord[] = [];
  const inQuietHours = isWithinQuietHours(currentTimeStr, settings.quietHours);

  const queueNotification = (
    notif: Omit<NotificationRecord, 'id' | 'userId' | 'createdAt' | 'read' | 'deliveryStatus'>,
    idempotencyKey: string
  ) => {
    const candidateRecord: Partial<NotificationRecord> = {
      ...notif,
      userId,
      idempotencyKey,
      deduplicationKey: idempotencyKey,
    };
    const allCandidateKeys = getNotificationDismissalKeys(candidateRecord, userId, currentDateKey);

    if (allCandidateKeys.some((k) => existingKeys.has(k) || dismissedKeys.has(k))) {
      return;
    }

    for (const k of allCandidateKeys) {
      existingKeys.add(k);
    }

    const deliveryStatus = inQuietHours ? 'in_app_only' : settings.pushEnabled ? 'created' : 'in_app_only';

    newNotifications.push({
      ...notif,
      id: generateNotificationId(),
      userId,
      type: notif.category,
      idempotencyKey,
      deduplicationKey: idempotencyKey,
      createdAt: now.toISOString(),
      read: false,
      deliveryStatus,
    });
  };

  // ==========================================
  // 1. TASK REMINDERS & DEADLINE EVALUATION
  // ==========================================
  if (settings.categories?.tasks) {
    for (const todo of todos) {
      if (todo.completed) continue;

      // Overdue task alert: date is before today
      if (todo.date && todo.date < currentDateKey) {
        if (
          !wasTriggerCoveredByClearAll(
            clearedMs,
            clearedDateKey,
            clearedTimeStr,
            currentDateKey,
            '00:00',
            (todo as any).updatedAt,
            (todo as any).createdAt
          )
        ) {
          const overdueKey = `task_overdue_${userId}_${todo.id}_${currentDateKey}`;
          queueNotification(
            {
              category: 'tasks',
              title: 'Overdue Task',
              message: `"${todo.title}" was due on ${todo.date}. Tap to complete or reschedule.`,
              priority: todo.priority === 'high' ? 'urgent' : 'high',
              relatedType: 'todo',
              relatedId: todo.id,
              deepLink: '/?tab=todos',
            },
            overdueKey
          );
        }
      }

      // Today's task with specific dueTime
      if (todo.date === currentDateKey && todo.dueTime) {
        if (todo.dueTime <= currentTimeStr) {
          if (
            !wasTriggerCoveredByClearAll(
              clearedMs,
              clearedDateKey,
              clearedTimeStr,
              currentDateKey,
              todo.dueTime,
              (todo as any).updatedAt,
              (todo as any).createdAt
            )
          ) {
            const dueKey = `task_due_${userId}_${todo.id}_${currentDateKey}_${todo.dueTime}`;
            queueNotification(
              {
                category: 'tasks',
                title: `Task Due: ${todo.title}`,
                message: todo.notes ? `${todo.notes.slice(0, 80)}...` : 'Scheduled for right now in Life OS.',
                priority: todo.priority === 'high' ? 'high' : 'normal',
                relatedType: 'todo',
                relatedId: todo.id,
                deepLink: '/?tab=todos',
              },
              dueKey
            );
          }
        }
      }
    }
  }

  // ==========================================
  // 2. HABIT SCHEDULE REMINDERS
  // ==========================================
  if (settings.categories?.habits) {
    const todayCompletions = new Set(
      habitCompletions
        .filter((c: any) => c.date === currentDateKey || c.dateKey === currentDateKey)
        .map((c: any) => c.habitId)
    );
    const dayOfWeek = new Date(currentDateKey + 'T12:00:00Z').getUTCDay();

    for (const habit of habits) {
      if (habit.status === 'paused') continue;
      if (todayCompletions.has(habit.id)) continue;

      let isScheduled = false;
      if (habit.frequency === 'daily') isScheduled = true;
      else if (habit.frequency === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
      else if (habit.frequency === 'weekly') {
        isScheduled = habit.daysOfWeek ? habit.daysOfWeek.includes(dayOfWeek) : true;
      } else {
        isScheduled = true;
      }

      if (!isScheduled) continue;

      const targetTime = habit.reminderTime || '18:00';
      if (targetTime <= currentTimeStr) {
        if (
          !wasTriggerCoveredByClearAll(
            clearedMs,
            clearedDateKey,
            clearedTimeStr,
            currentDateKey,
            targetTime,
            (habit as any).updatedAt,
            (habit as any).createdAt
          )
        ) {
          const habitKey = `habit_prompt_${userId}_${habit.id}_${currentDateKey}`;
          queueNotification(
            {
              category: 'habits',
              title: `Habit Check-in: ${habit.name}`,
              message: `Keep your streak alive! Have you completed "${habit.name}" today?`,
              priority: 'normal',
              relatedType: 'habit',
              relatedId: habit.id,
              deepLink: '/?tab=habits',
            },
            habitKey
          );
        }
      }
    }
  }

  // ==========================================
  // 3. DAILY & WEEKLY ROUTINES
  // ==========================================
  if (settings.categories?.routines) {
    const morningTime = settings.morningBriefingTime || '08:00';
    if (
      currentTimeStr >= morningTime &&
      !wasTriggerCoveredByClearAll(clearedMs, clearedDateKey, clearedTimeStr, currentDateKey, morningTime)
    ) {
      const morningKey = `routine_morning_${userId}_${currentDateKey}`;
      const uncompletedTodosCount = todos.filter((t) => t.date === currentDateKey && !t.completed).length;
      queueNotification(
        {
          category: 'routines',
          title: 'Morning Daily Briefing',
          message:
            uncompletedTodosCount > 0
              ? `You have ${uncompletedTodosCount} priority task${uncompletedTodosCount === 1 ? '' : 's'} lined up for today. Let's make it productive!`
              : 'Start your morning with focus. Plan your day and check in with your goals.',
          priority: 'normal',
          relatedType: 'routine',
          relatedId: 'morning_briefing',
          deepLink: '/?tab=dashboard',
        },
        morningKey
      );
    }

    const eveningTime = settings.eveningReviewTime || '20:00';
    if (
      currentTimeStr >= eveningTime &&
      !wasTriggerCoveredByClearAll(clearedMs, clearedDateKey, clearedTimeStr, currentDateKey, eveningTime)
    ) {
      const eveningKey = `routine_evening_${userId}_${currentDateKey}`;
      const completedToday = todos.filter((t) => t.date === currentDateKey && t.completed).length;
      queueNotification(
        {
          category: 'routines',
          title: 'Evening Reflection & Review',
          message:
            completedToday > 0
              ? `Great progress today with ${completedToday} completed tasks! Take a moment to review and wind down.`
              : 'End your day with clarity. Review what got done and prepare for tomorrow.',
          priority: 'low',
          relatedType: 'routine',
          relatedId: 'evening_review',
          deepLink: '/?tab=dashboard',
        },
        eveningKey
      );
    }

    const currentDayOfWeek = new Date(currentDateKey + 'T12:00:00Z').getUTCDay();
    const weeklyTime = settings.weeklyReviewTime || '18:00';
    if (
      currentDayOfWeek === (settings.weeklyReviewDay ?? 0) &&
      currentTimeStr >= weeklyTime &&
      !wasTriggerCoveredByClearAll(clearedMs, clearedDateKey, clearedTimeStr, currentDateKey, weeklyTime)
    ) {
      const weeklyKey = `routine_weekly_${userId}_${currentDateKey}`;
      queueNotification(
        {
          category: 'routines',
          title: 'Weekly Strategy & Goal Review',
          message: 'Time for your weekly review. Calibrate long-term goals and align your next sprint.',
          priority: 'normal',
          relatedType: 'goal',
          relatedId: 'weekly_review',
          deepLink: '/?tab=goals',
        },
        weeklyKey
      );
    }
  }

  // ==========================================
  // 4. GOALS & SAVINGS MILESTONES
  // ==========================================
  if (settings.categories?.goals_savings) {
    for (const goal of goals) {
      if (goal.status === 'completed' || (goal.status as unknown) === 'archived') continue;
      const targetDate = (goal as any).targetDate || goal.deadline;
      if (targetDate && targetDate === currentDateKey) {
        if (
          !wasTriggerCoveredByClearAll(
            clearedMs,
            clearedDateKey,
            clearedTimeStr,
            currentDateKey,
            '00:00',
            (goal as any).updatedAt,
            (goal as any).createdAt
          )
        ) {
          const goalKey = `goal_target_${userId}_${goal.id}_${currentDateKey}`;
          queueNotification(
            {
              category: 'goals_savings',
              title: `Goal Target Date: ${goal.title}`,
              message: `Today is the target completion date for "${goal.title}". Check your roadmaps and milestone progress.`,
              priority: 'high',
              relatedType: 'goal',
              relatedId: goal.id,
              deepLink: '/?tab=goals',
            },
            goalKey
          );
        }
      }
    }
  }

  // ==========================================
  // 5. CUSTOM REMINDERS
  // ==========================================
  if (settings.categories?.custom) {
    const dayOfWeek = new Date(currentDateKey + 'T12:00:00Z').getUTCDay();

    for (const rem of customReminders) {
      if (!rem.enabled) continue;

      let isDueToday = false;
      if (rem.recurring === 'none') {
        isDueToday = rem.targetDate === currentDateKey;
      } else if (rem.recurring === 'daily') {
        isDueToday = true;
      } else if (rem.recurring === 'weekdays') {
        isDueToday = dayOfWeek >= 1 && dayOfWeek <= 5;
      } else if (rem.recurring === 'weekly' || rem.recurring === 'custom_days') {
        isDueToday = rem.recurrenceDays ? rem.recurrenceDays.includes(dayOfWeek) : true;
      }

      const targetTime = rem.targetTime || rem.timeOfDay;
      if (isDueToday && targetTime && targetTime <= currentTimeStr) {
        if (
          !wasTriggerCoveredByClearAll(
            clearedMs,
            clearedDateKey,
            clearedTimeStr,
            currentDateKey,
            targetTime,
            rem.updatedAt,
            rem.createdAt
          )
        ) {
          const customKey = `custom_rem_${userId}_${rem.id}_${currentDateKey}_${targetTime}`;
          queueNotification(
            {
              category: 'custom',
              title: rem.title,
              message: rem.message || 'Custom reminder triggered from Life OS.',
              priority: 'normal',
              relatedType: 'routine',
              relatedId: rem.id,
              deepLink: rem.deepLink || '/?tab=notifications',
            },
            customKey
          );
        }
      }
    }
  }

  return newNotifications;
}

export const evaluateAllReminders = evaluateReminders;
