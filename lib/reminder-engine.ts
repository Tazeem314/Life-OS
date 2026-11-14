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
  currentDateKey?: string; // "YYYY-MM-DD"
  currentTimeStr?: string; // "HH:mm"
  currentDate?: Date;
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
    // Generic pattern: <prefix>_<uid_or_local_user>_<rest>
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
 * Derives all dismissal/suppression keys associated with a notification record.
 * Storing and checking all of these prevents deleted notifications from returning
 * under different userId prefixes, legacy keys, or reminder re-evaluations.
 */
export function getNotificationDismissalKeys(
  notif: Partial<NotificationRecord> & { id?: string },
  userId?: string,
  fallbackDateKey?: string
): string[] {
  const keys = new Set<string>();

  if (notif.id) keys.add(notif.id);

  const dateKey =
    fallbackDateKey ||
    (typeof notif.createdAt === 'string' && notif.createdAt.length >= 10
      ? notif.createdAt.slice(0, 10)
      : undefined);

  const candidateKeys = [notif.idempotencyKey, notif.deduplicationKey].filter(
    (k): k is string => Boolean(k && typeof k === 'string')
  );

  for (const k of candidateKeys) {
    keys.add(k);
    const stripped = stripUserIdFromNotificationKey(k, notif.userId || userId);
    if (stripped) {
      keys.add(`canonical:${stripped}`);
    } else {
      keys.add(`canonical:${k}`);
    }
  }

  const entityId = notif.relatedId || notif.sourceId;
  if (notif.category && entityId && dateKey) {
    keys.add(`canonical:entity:${notif.category}:${entityId}:${dateKey}`);
    keys.add(`${notif.category}_${entityId}_${dateKey}`);
  }

  if (notif.category === 'routines' && dateKey) {
    const titleLower = (notif.title || '').toLowerCase();
    if (titleLower.includes('morning')) {
      keys.add(`canonical:routine_morning_${dateKey}`);
    } else if (titleLower.includes('evening')) {
      keys.add(`canonical:routine_evening_${dateKey}`);
    } else if (titleLower.includes('weekly')) {
      keys.add(`canonical:routine_weekly_${dateKey}`);
    }
  }

  return Array.from(keys);
}

/**
 * Returns true if a notification matches any dismissed key or predates the Clear All watermark.
 */
export function isNotificationDismissed(
  notif: Partial<NotificationRecord> & { id?: string },
  dismissedKeys: Set<string>,
  clearedAllAt?: string | null,
  userId?: string
): boolean {
  if (clearedAllAt && notif.createdAt) {
    const createdMs = Date.parse(notif.createdAt);
    const clearedMs = Date.parse(clearedAllAt);
    if (!Number.isNaN(createdMs) && !Number.isNaN(clearedMs) && createdMs <= clearedMs) {
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
 * Evaluates all productivity and routine conditions to determine if any new notifications should be dispatched.
 * Guarantees idempotency via stable unique idempotencyKey hashes and canonical dismissal matching.
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
  const currentDateKey =
    context.currentDateKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTimeStr =
    context.currentTimeStr ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

  // Helper to push notification if idempotency key (or any canonical key) is not taken or previously dismissed/deleted
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
      createdAt: new Date().toISOString(),
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

      // Today's task with specific dueTime
      if (todo.date === currentDateKey && todo.dueTime) {
        if (todo.dueTime <= currentTimeStr) {
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
      // Skip if already completed today
      if (todayCompletions.has(habit.id)) continue;

      // Check if habit is scheduled today
      let isScheduled = false;
      if (habit.frequency === 'daily') isScheduled = true;
      else if (habit.frequency === 'weekdays') isScheduled = dayOfWeek >= 1 && dayOfWeek <= 5;
      else if (habit.frequency === 'weekly') {
        isScheduled = habit.daysOfWeek ? habit.daysOfWeek.includes(dayOfWeek) : true;
      } else {
        isScheduled = true;
      }

      if (!isScheduled) continue;

      // Habit reminder time
      const targetTime = habit.reminderTime || '18:00';
      if (targetTime <= currentTimeStr) {
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

  // ==========================================
  // 3. DAILY & WEEKLY ROUTINES
  // ==========================================
  if (settings.categories?.routines) {
    // Morning Kick-off
    if (currentTimeStr >= (settings.morningBriefingTime || '08:00')) {
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

    // Evening Wind-down
    if (currentTimeStr >= (settings.eveningReviewTime || '20:00')) {
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

    // Weekly Planning / Review
    const currentDayOfWeek = new Date(currentDateKey + 'T12:00:00Z').getUTCDay();
    if (currentDayOfWeek === (settings.weeklyReviewDay ?? 0) && currentTimeStr >= (settings.weeklyReviewTime || '18:00')) {
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

  return newNotifications;
}

export const evaluateAllReminders = evaluateReminders;
