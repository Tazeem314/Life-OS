export type NotificationCategory =
  | 'tasks'
  | 'habits'
  | 'routines'
  | 'goals_savings'
  | 'custom'
  | 'ai_briefing'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeliveryStatus = 'created' | 'pushed' | 'push_failed' | 'in_app_only';

export interface NotificationRecord {
  id: string;
  userId?: string;
  category: NotificationCategory;
  type?: NotificationCategory | string; // Alias for category
  title: string;
  message: string;
  createdAt: string; // ISO
  read: boolean;
  readAt?: string;
  priority: NotificationPriority;
  relatedType?: 'todo' | 'habit' | 'goal' | 'savings' | 'sleep' | 'routine' | string;
  relatedId?: string;
  sourceType?: string;
  sourceId?: string;
  deepLink?: string;
  idempotencyKey?: string;
  deduplicationKey?: string; // Alias for idempotencyKey
  deliveryStatus?: DeliveryStatus;
  snoozeUntil?: string; // ISO timestamp
  actionLabel?: string;
  actionDeepLink?: string;
}

export type ReminderType =
  | 'task'
  | 'habit'
  | 'morning_routine'
  | 'evening_routine'
  | 'weekly_review'
  | 'custom';

export type ReminderRecurrence =
  | 'none'
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'custom_days';

export interface ReminderDefinition {
  id: string;
  userId?: string;
  title: string;
  message?: string;
  type: ReminderType;
  targetDate?: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm (24h)
  timeOfDay?: string; // Alias for targetTime (e.g. "09:00")
  timeZone: string;
  recurring: ReminderRecurrence;
  recurrenceDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  deepLink?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredDate?: string;
  lastTriggeredOccurrence?: string;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // "22:00"
  end: string; // "07:00"
}

export interface NotificationSettings {
  enabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  timeZone: string;
  categories: {
    tasks: boolean;
    habits: boolean;
    routines: boolean;
    goals_savings: boolean;
    custom: boolean;
    ai_briefing: boolean;
    system: boolean;
  };
  quietHours: QuietHoursConfig;
  morningBriefingTime: string; // "08:00"
  eveningReviewTime: string; // "20:00"
  weeklyReviewDay: number; // 0 = Sunday
  weeklyReviewTime: string; // "18:00"
  leadTimeMinutes: number; // e.g. 15
  aiBriefingEnabled: boolean;
  briefingTone?: 'executive' | 'motivational' | 'minimal';
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  inAppEnabled: true,
  pushEnabled: false,
  soundEnabled: true,
  timeZone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  categories: {
    tasks: true,
    habits: true,
    routines: true,
    goals_savings: true,
    custom: true,
    ai_briefing: true,
    system: true,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
  morningBriefingTime: '08:00',
  eveningReviewTime: '20:00',
  weeklyReviewDay: 0, // Sunday
  weeklyReviewTime: '18:00',
  leadTimeMinutes: 15,
  aiBriefingEnabled: true,
  briefingTone: 'executive',
};

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface AIDailyBriefing {
  id: string;
  userId?: string;
  date?: string; // YYYY-MM-DD
  dateKey?: string; // YYYY-MM-DD
  headline?: string;
  summary: string;
  keyPriorities?: string[];
  focusGoal?: string;
  actionAdvice?: string;
  stats?: {
    tasksDueCount: number;
    tasksCompletedCount: number;
    habitsScheduledCount: number;
    habitsCompletedCount: number;
    streakDays: number;
    upcomingGoalsCount: number;
  };
  tone?: string;
  createdAt: string;
}
