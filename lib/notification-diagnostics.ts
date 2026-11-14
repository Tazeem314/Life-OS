'use client';

export interface NotificationDiagnosticEntry {
  ts: string;
  event: string;
  count?: number;
  fromCache?: boolean;
  hasPendingWrites?: boolean;
  gen?: number;
  epoch?: number;
  note?: string;
}

const MAX_DIAG_ENTRIES = 120;
const diagBuffer: NotificationDiagnosticEntry[] = [];

export function recordNotificationDiagnostic(
  entry: Omit<NotificationDiagnosticEntry, 'ts'>
): void {
  const fullEntry: NotificationDiagnosticEntry = {
    ts: new Date().toISOString(),
    ...entry,
  };
  diagBuffer.push(fullEntry);
  if (diagBuffer.length > MAX_DIAG_ENTRIES) {
    diagBuffer.splice(0, diagBuffer.length - MAX_DIAG_ENTRIES);
  }

  if (typeof window !== 'undefined') {
    (window as unknown as { __LIFEOS_NOTIF_DIAG__?: NotificationDiagnosticEntry[] }).__LIFEOS_NOTIF_DIAG__ = diagBuffer;
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[LifeOS:NotifDiag]', fullEntry.event, {
        count: fullEntry.count,
        fromCache: fullEntry.fromCache,
        hasPendingWrites: fullEntry.hasPendingWrites,
        gen: fullEntry.gen,
        epoch: fullEntry.epoch,
        note: fullEntry.note,
      });
    }
  }
}

export function getNotificationDiagnostics(): NotificationDiagnosticEntry[] {
  return [...diagBuffer];
}
