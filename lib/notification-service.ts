import {
  NotificationRecord,
  NotificationCategory,
  NotificationPriority,
  NotificationSettings,
  ReminderDefinition,
  AIDailyBriefing,
  DEFAULT_NOTIFICATION_SETTINGS,
} from './notification-types';

export { DEFAULT_NOTIFICATION_SETTINGS };

export const NOTIFICATION_STORAGE_KEY = 'life_os_notifications_v1';
export const REMINDERS_STORAGE_KEY = 'life_os_reminders_v1';
export const NOTIFICATION_SETTINGS_KEY = 'life_os_notif_settings_v1';
export const BRIEFINGS_STORAGE_KEY = 'life_os_briefings_v1';

// Category metadata for UI styling and icons
export const NOTIFICATION_CATEGORIES: {
  id: NotificationCategory;
  label: string;
  description: string;
}[] = [
  { id: 'tasks', label: 'Tasks & Deadlines', description: 'Reminders for approaching and overdue tasks' },
  { id: 'habits', label: 'Habit Schedules', description: 'Timely prompts for daily and weekly habits' },
  { id: 'routines', label: 'Daily Routines', description: 'Morning kick-off, evening reviews, weekly reflections' },
  { id: 'goals_savings', label: 'Goals & Wealth', description: 'Milestones, deadlines, and savings contributions' },
  { id: 'custom', label: 'Custom Reminders', description: 'User-scheduled personal alerts' },
  { id: 'ai_briefing', label: 'AI Daily Briefings', description: 'Smart daily executive briefings' },
  { id: 'system', label: 'System Alerts', description: 'Sync, offline warnings, and platform notices' },
];

/**
 * Generate a unique ID (safe for both browser and server)
 */
export function generateNotificationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'notif_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

/**
 * Check if the given time is within quiet hours
 */
export function isWithinQuietHours(
  timeStr: string, // "HH:mm"
  quietHours?: { enabled: boolean; start: string; end: string }
): boolean {
  if (!quietHours || !quietHours.enabled) return false;
  const { start, end } = quietHours;
  if (!start || !end) return false;

  // Same day interval (e.g. 01:00 to 05:00)
  if (start < end) {
    return timeStr >= start && timeStr < end;
  }
  // Overnight interval (e.g. 22:00 to 07:00)
  return timeStr >= start || timeStr < end;
}

/**
 * Checks if quiet hours are currently active based on system clock
 */
export function isQuietHoursActive(
  quietHours?: { enabled?: boolean; start?: string; end?: string }
): boolean {
  if (!quietHours || !quietHours.enabled || !quietHours.start || !quietHours.end) return false;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return isWithinQuietHours(timeStr, { enabled: true, start: quietHours.start, end: quietHours.end });
}

/**
 * Plays a short, pleasant audible chime via Web Audio API if browser audio is supported
 */
export function playNotificationSound(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

/**
 * Format relative time for notifications (e.g., "5m ago", "2h ago", "Yesterday")
 */
export function formatNotificationTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

/**
 * Prune notifications older than retention days (default: 30 days)
 * Retention only cleans up notification records, NEVER underlying tasks or goals.
 */
export function pruneExpiredNotifications(
  notifications: NotificationRecord[],
  retentionDays = 30
): NotificationRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffTime = cutoff.getTime();

  return notifications.filter((n) => {
    try {
      const created = new Date(n.createdAt).getTime();
      return created >= cutoffTime;
    } catch {
      return true;
    }
  });
}

/**
 * Converts a base64 VAPID public key string to a Uint8Array required by PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Dispatches a push notification delivery attempt to server-side Web Push route
 */
export async function triggerWebPushNotification(
  userId: string,
  notification: NotificationRecord,
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/notifications/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        userId,
        notification,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, ...data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error delivering push';
    return { success: false, error: message };
  }
}

/**
 * Requests an AI Daily Briefing from the server
 */
export async function requestAIDailyBriefing(
  payload: {
    userId?: string;
    date?: string;
    dateKey?: string;
    userName?: string;
    tone?: string;
    pendingTasksCount?: number;
    highPriorityTasks?: string[];
    habitsDueCount?: number;
    habitsCompletedCount?: number;
    activeGoalsCount?: number;
    focusGoalTitle?: string;
    totalSavingsBalance?: number;
    lastNightSleepHours?: number;
    stats?: {
      tasksDueCount?: number;
      tasksCompletedCount?: number;
      habitsScheduledCount?: number;
      habitsCompletedCount?: number;
      streakDays?: number;
      upcomingGoalsCount?: number;
    };
    todayTasks?: { title: string; priority: string; completed: boolean }[];
    todayHabits?: { name: string; completed: boolean }[];
  },
  idToken?: string
): Promise<{ success: boolean; briefing?: AIDailyBriefing; error?: string }> {
  try {
    const res = await fetch('/api/ai/daily-briefing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, briefing: data.briefing };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate AI briefing';
    return { success: false, error: message };
  }
}

/**
 * Generates a formatted JSON backup string for notification records before bulk cleanup.
 */
export function createNotificationsBackupJson(notifications: NotificationRecord[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      count: notifications.length,
      notifications,
    },
    null,
    2
  );
}
