export type TodoTaskType = 'study' | 'non_study';

export type StudySubject =
  | 'Mathematics'
  | 'Science'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Social Science'
  | 'English'
  | 'Hindi'
  | 'Other'
  | string;

export const DEFAULT_STUDY_SUBJECTS: readonly string[] = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Social Science',
  'English',
  'Hindi',
  'Other',
];

export const STUDY_DURATION_PRESETS: readonly { label: string; minutes: number }[] = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h 30m', minutes: 90 },
  { label: '2h', minutes: 120 },
];

export interface StudyPauseInterval {
  pausedAt: number; // epoch ms
  resumedAt?: number; // epoch ms
  durationMs?: number;
}

export type StudySessionStatus = 'completed' | 'cancelled';
export type StudySessionSource = 'timer' | 'stopwatch_converted';

export interface StudySession {
  id: string;
  userId?: string;
  dateKey: string; // YYYY-MM-DD local date when session ended or started
  taskId?: string | null;
  taskNameSnapshot: string;
  isUnlinked?: boolean;
  startTimestamp: number; // epoch ms
  endTimestamp: number; // epoch ms
  actualDurationMs: number;
  actualDurationMinutes: number; // minutes spent
  pauseCount: number;
  totalPausedMs: number;
  pauseIntervals?: StudyPauseInterval[];
  notes?: string;
  status: StudySessionStatus;
  source: StudySessionSource;
  stopwatchRecordId?: string;
  convertedFromStopwatchId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface ActiveStudyTimerState {
  sessionId: string;
  userId?: string;
  taskId?: string | null;
  taskNameSnapshot: string;
  isUnlinked?: boolean;
  startTimestamp: number; // epoch ms
  segmentStartTimestamp?: number; // epoch ms of current running segment
  accumulatedActiveMs: number;
  pausedAtTimestamp?: number; // epoch ms when currently paused
  pausedAt?: number;
  pauseCount: number;
  pauseIntervals?: StudyPauseInterval[];
  totalPausedMs: number;
  notes: string;
  status: 'running' | 'paused';
  updatedAt: string;
}

export interface StopwatchLap {
  lapNumber: number;
  splitMs: number; // elapsed since previous lap (or start)
  cumulativeMs: number; // total elapsed up to this lap
  recordedAt: string; // ISO
  label?: string;
}

export interface StopwatchRecord {
  id: string;
  userId?: string;
  title?: string;
  notes?: string;
  dateKey: string; // YYYY-MM-DD
  startTimestamp: number; // epoch ms
  endTimestamp: number; // epoch ms
  elapsedMs: number;
  laps: StopwatchLap[];
  convertedToStudySessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveStopwatchState {
  stopwatchId: string;
  sessionId?: string;
  title?: string;
  startTimestamp: number;
  segmentStartTimestamp?: number;
  accumulatedMs: number;
  pausedAt?: number;
  status: 'running' | 'paused';
  laps: StopwatchLap[];
  updatedAt: string;
}

export type StudyAttachmentKind = 'image' | 'document' | 'video';

export interface StudyNoteAttachment {
  id: string;
  kind: StudyAttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string; // ISO
}

export interface StudyNoteVideoLink {
  id: string;
  url: string;
  title?: string;
  platform: 'youtube' | 'external';
  embedUrl?: string;
  addedAt: string; // ISO
}

export interface StudyNote {
  id: string;
  userId?: string;
  title: string;
  subject: StudySubject;
  contentMarkdown: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  attachments: StudyNoteAttachment[];
  videoLinks: StudyNoteVideoLink[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type StudyAnalyticsRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface StudyDailyMetric {
  dateKey: string;
  label: string;
  shortLabel: string;
  plannedMinutes: number;
  estimatedCompletedMinutes: number;
  actualStudiedMinutes: number;
  actualStudiedMs: number;
  studyTasksTotal: number;
  studyTasksCompleted: number;
  sessionsCount: number;
}

export interface StudyTaskAnalyticsRow {
  taskId: string;
  title: string;
  dateKey: string;
  completed: boolean;
  plannedMinutes: number;
  estimatedCompletedMinutes: number;
  actualStudiedMs: number;
  actualStudiedMinutes: number;
  sessionsCount: number;
}

export interface StudyAnalyticsSummary {
  startDate: string;
  endDate: string;
  plannedMinutes: number;
  estimatedCompletedMinutes: number;
  remainingPlannedMinutes: number;
  actualStudiedMinutes: number;
  actualStudiedMs: number;
  studyTasksTotal: number;
  studyTasksCompleted: number;
  completedSessionsCount: number;
  buckets: StudyDailyMetric[];
  taskBreakdown: StudyTaskAnalyticsRow[];
  sessions: StudySession[];
}

export interface StudyDashboardSummary {
  dateKey: string;
  plannedMinutes: number;
  estimatedCompletedMinutes: number;
  remainingStudyMinutes: number;
  actualStudiedMinutes: number;
  actualStudiedMs: number;
  studyTasksTotal: number;
  studyTasksCompleted: number;
  studyTaskProgressPct: number;
}
