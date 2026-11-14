import {
  db,
  auth,
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDocsFromServer,
  getDoc,
  query,
  where,
  limit,
  User,
} from './firebase';
import { startAfter, Query, QuerySnapshot, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Habit, HabitCompletion, Todo, UserSettings, Goal, SleepLog, SavingsGoal, SavingsTransaction, SavingsSettings } from './types';
import { NotificationRecord, ReminderDefinition, NotificationSettings, PushSubscriptionRecord, AIDailyBriefing } from './notification-types';
import { normalizeIsoTimestamp, normalizeTimestampMs } from './reminder-engine';
import { recordNotificationDiagnostic } from './notification-diagnostics';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Deeply sanitizes an object for Firestore by removing any undefined values
 * which would otherwise cause Firestore to reject the write with:
 * "Unsupported field value: undefined"
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === 'number' && Number.isNaN(data)) {
    return null as unknown as T;
  }
  if (data instanceof Date) {
    return data.toISOString() as unknown as T;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned as T;
}

export function getPendingQueueKey(userId?: string): string {
  const uid =
    userId ||
    auth.currentUser?.uid ||
    (typeof window !== 'undefined' ? localStorage.getItem('life_os_cached_uid') : null);
  return uid ? `lifeos_pending_writes_${uid}` : 'lifeos_pending_cloud_writes';
}

export interface PendingWrite {
  type:
    | 'habit'
    | 'habit_delete'
    | 'completion'
    | 'completion_delete'
    | 'todo'
    | 'todo_delete'
    | 'goal'
    | 'goal_delete'
    | 'sleep'
    | 'sleep_delete'
    | 'savings_goal'
    | 'savings_goal_delete'
    | 'savings_transaction'
    | 'savings_transaction_delete'
    | 'savings_settings'
    | 'settings'
    | 'notifications_clear_all'
    | 'notifications_delete_batch';
  data?: any;
  id?: string;
  timestamp: number;
}

export function queuePendingWrite(write: PendingWrite, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPendingQueueKey(userId);
    const raw = localStorage.getItem(key);
    const queue: PendingWrite[] = raw ? JSON.parse(raw) : [];
    const targetId = write.id || (write.data && write.data.id) || (write.type === 'settings' ? 'settings' : '');
    // Deduplicate: replace any older pending write for the exact same item
    const deduplicated = queue.filter((item) => {
      const itemId = item.id || (item.data && item.data.id) || (item.type === 'settings' ? 'settings' : '');
      return !(itemId && itemId === targetId);
    });
    deduplicated.push(write);
    localStorage.setItem(key, JSON.stringify(deduplicated.slice(-150)));
  } catch {}
}

export function removePendingWrite(type: string, id: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPendingQueueKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const queue: PendingWrite[] = JSON.parse(raw);
    const filtered = queue.filter((item) => {
      const itemId = item.id || (item.data && item.data.id) || (item.type === 'settings' ? 'settings' : '');
      return !(item.type === type && itemId === id);
    });
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {}
}

export function getPendingWriteIds(type?: string, userId?: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const key = getPendingQueueKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const queue: PendingWrite[] = JSON.parse(raw);
    const ids = new Set<string>();
    for (const item of queue) {
      if (!type || item.type === type) {
        const id = item.id || (item.data && item.data.id);
        if (id) ids.add(id);
      }
    }
    return ids;
  } catch {
    return new Set();
  }
}

let isFlushing = false;
export async function flushPendingCloudWrites(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !userId || isFlushing) return;
  try {
    const key = getPendingQueueKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const queue: PendingWrite[] = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    isFlushing = true;
    const remaining: PendingWrite[] = [];

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'habit':
            if (item.data) await syncHabitToCloud(userId, item.data, false);
            break;
          case 'habit_delete':
            if (item.id) await deleteHabitFromCloud(userId, item.id, false);
            break;
          case 'completion':
            if (item.data) await syncCompletionToCloud(userId, item.data, false);
            break;
          case 'completion_delete':
            if (item.id) await deleteCompletionFromCloud(userId, item.id, false);
            break;
          case 'todo':
            if (item.data) await syncTodoToCloud(userId, item.data, false);
            break;
          case 'todo_delete':
            if (item.id) await deleteTodoFromCloud(userId, item.id, false);
            break;
          case 'goal':
            if (item.data) await syncGoalToCloud(userId, item.data, false);
            break;
          case 'goal_delete':
            if (item.id) await deleteGoalFromCloud(userId, item.id, false);
            break;
          case 'sleep':
            if (item.data) await syncSleepLogToCloud(userId, item.data, false);
            break;
          case 'sleep_delete':
            if (item.id) await deleteSleepLogFromCloud(userId, item.id, false);
            break;
          case 'savings_goal':
            if (item.data) await syncSavingsGoalToCloud(userId, item.data, false);
            break;
          case 'savings_goal_delete':
            if (item.id) await deleteSavingsGoalFromCloud(userId, item.id, false);
            break;
          case 'savings_transaction':
            if (item.data) await syncSavingsTransactionToCloud(userId, item.data, false);
            break;
          case 'savings_transaction_delete':
            if (item.id) await deleteSavingsTransactionFromCloud(userId, item.id, false);
            break;
          case 'savings_settings':
            if (item.data) await syncSavingsSettingsToCloud(userId, item.data, false);
            break;
          case 'settings':
            if (item.data) await syncSettingsToCloud(userId, item.data, false);
            break;
          case 'notifications_clear_all':
            if (item.data?.clearedAt) {
              await syncDismissedNotificationsToCloud(
                userId,
                Array.isArray(item.data.keys) ? item.data.keys : [],
                item.data.clearedAt
              );
              await deleteAllNotificationsFromCloud(userId, [], item.data.clearedAt);
            }
            break;
          case 'notifications_delete_batch':
            if (Array.isArray(item.data?.ids) && item.data.ids.length > 0) {
              if (Array.isArray(item.data.keys)) {
                await syncDismissedNotificationsToCloud(userId, item.data.keys, item.data.clearedAllAt ?? null);
              }
              await deleteNotificationsBatchFromCloud(userId, item.data.ids);
            }
            break;
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(key, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('Failed to flush pending cloud writes:', err);
  } finally {
    isFlushing = false;
  }
}

export function isOfflineFirestoreError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const code = (error as { code?: string } | null)?.code || '';
  const errMsg = error instanceof Error ? error.message : String(error);
  return (
    code === 'unavailable' ||
    errMsg.includes('Could not reach Cloud Firestore backend') ||
    errMsg.includes('offline mode') ||
    errMsg.includes('unavailable') ||
    errMsg.includes('Failed to get document because the client is offline') ||
    errMsg.includes('offline')
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code || '';
  const isPermissionError =
    code === 'permission-denied' || errMsg.includes('Missing or insufficient permissions');

  if (!isPermissionError && isOfflineFirestoreError(error)) {
    console.info('Firestore operating in resilient offline cache mode:', errMsg);
    if (rethrow) {
      throw new Error(errMsg || 'Firestore backend is currently offline');
    }
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  const jsonErr = JSON.stringify(errInfo);
  console.error('Firestore Error:', jsonErr);
  if (rethrow || isPermissionError) {
    throw new Error(jsonErr);
  }
}

export async function saveUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      cleanForFirestore({
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function recordCloudDeletion(userId: string, id: string, type: string): Promise<void> {
  if (!userId || !id) return;
  try {
    const delRef = doc(db, 'users', userId, 'deletions', id);
    await setDoc(delRef, { id, type, deletedAt: new Date().toISOString() }, { merge: true });
  } catch {}
}

export async function clearCloudDeletion(userId: string, id: string): Promise<void> {
  if (!userId || !id) return;
  try {
    const delRef = doc(db, 'users', userId, 'deletions', id);
    await deleteDoc(delRef);
  } catch {}
}

export async function syncHabitToCloud(userId: string, habit: Habit, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'habit', data: habit, timestamp: Date.now() });
  }
  try {
    const habitRef = doc(db, 'users', userId, 'habits', habit.id);
    await setDoc(habitRef, cleanForFirestore(habit), { merge: true });
    clearCloudDeletion(userId, habit.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('habit', habit.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/habits/${habit.id}`);
  }
}

export async function deleteHabitFromCloud(userId: string, habitId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'habit_delete', id: habitId, timestamp: Date.now() });
  }
  try {
    const habitRef = doc(db, 'users', userId, 'habits', habitId);
    const delRef = doc(db, 'users', userId, 'deletions', habitId);
    const batch = writeBatch(db);
    batch.delete(habitRef);
    batch.set(delRef, { id: habitId, type: 'habit', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();

    if (shouldQueue) {
      removePendingWrite('habit_delete', habitId);
    }

    // Also delete any completions linked to this habit from Firestore
    try {
      const compQuery = query(
        collection(db, 'users', userId, 'habitCompletions'),
        where('habitId', '==', habitId)
      );
      const compSnap = await getDocs(compQuery);
      if (!compSnap.empty) {
        const compBatch = writeBatch(db);
        compSnap.forEach((docSnap) => {
          compBatch.delete(docSnap.ref);
          const compDelRef = doc(db, 'users', userId, 'deletions', docSnap.id);
          compBatch.set(compDelRef, { id: docSnap.id, type: 'completion', deletedAt: new Date().toISOString() }, { merge: true });
        });
        await compBatch.commit();
      }
    } catch (e) {
      console.warn('Could not batch delete habit completions:', e);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/habits/${habitId}`);
  }
}

export async function syncCompletionToCloud(userId: string, completion: HabitCompletion, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'completion', data: completion, timestamp: Date.now() });
  }
  try {
    const compRef = doc(db, 'users', userId, 'habitCompletions', completion.id);
    await setDoc(compRef, cleanForFirestore(completion), { merge: true });
    clearCloudDeletion(userId, completion.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('completion', completion.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/habitCompletions/${completion.id}`);
  }
}

export async function deleteCompletionFromCloud(userId: string, completionId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'completion_delete', id: completionId, timestamp: Date.now() });
  }
  try {
    const compRef = doc(db, 'users', userId, 'habitCompletions', completionId);
    const delRef = doc(db, 'users', userId, 'deletions', completionId);
    const batch = writeBatch(db);
    batch.delete(compRef);
    batch.set(delRef, { id: completionId, type: 'completion', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('completion_delete', completionId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/habitCompletions/${completionId}`);
  }
}

export async function syncTodoToCloud(userId: string, todo: Todo, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'todo', data: todo, timestamp: Date.now() });
  }
  try {
    const todoRef = doc(db, 'users', userId, 'todos', todo.id);
    await setDoc(todoRef, cleanForFirestore(todo), { merge: true });
    clearCloudDeletion(userId, todo.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('todo', todo.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/todos/${todo.id}`);
  }
}

export async function deleteTodoFromCloud(userId: string, todoId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'todo_delete', id: todoId, timestamp: Date.now() });
  }
  try {
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    const delRef = doc(db, 'users', userId, 'deletions', todoId);
    const batch = writeBatch(db);
    batch.delete(todoRef);
    batch.set(delRef, { id: todoId, type: 'todo', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('todo_delete', todoId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/todos/${todoId}`);
  }
}

export async function syncGoalToCloud(userId: string, goal: Goal, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'goal', data: goal, timestamp: Date.now() });
  }
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goal.id);
    await setDoc(goalRef, cleanForFirestore(goal), { merge: true });
    clearCloudDeletion(userId, goal.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('goal', goal.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/goals/${goal.id}`);
  }
}

export async function deleteGoalFromCloud(userId: string, goalId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'goal_delete', id: goalId, timestamp: Date.now() });
  }
  try {
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    const delRef = doc(db, 'users', userId, 'deletions', goalId);
    const batch = writeBatch(db);
    batch.delete(goalRef);
    batch.set(delRef, { id: goalId, type: 'goal', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('goal_delete', goalId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/goals/${goalId}`);
  }
}

export async function syncSleepLogToCloud(userId: string, sleepLog: SleepLog, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'sleep', data: sleepLog, timestamp: Date.now() });
  }
  try {
    const sleepRef = doc(db, 'users', userId, 'sleepLogs', sleepLog.id);
    await setDoc(sleepRef, cleanForFirestore(sleepLog), { merge: true });
    clearCloudDeletion(userId, sleepLog.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('sleep', sleepLog.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/sleepLogs/${sleepLog.id}`);
  }
}

export async function deleteSleepLogFromCloud(userId: string, sleepLogId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'sleep_delete', id: sleepLogId, timestamp: Date.now() });
  }
  try {
    const sleepRef = doc(db, 'users', userId, 'sleepLogs', sleepLogId);
    const delRef = doc(db, 'users', userId, 'deletions', sleepLogId);
    const batch = writeBatch(db);
    batch.delete(sleepRef);
    batch.set(delRef, { id: sleepLogId, type: 'sleep', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('sleep_delete', sleepLogId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/sleepLogs/${sleepLogId}`);
  }
}

export async function syncSettingsToCloud(userId: string, settings: UserSettings, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'settings', data: settings, timestamp: Date.now() });
  }
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    await setDoc(settingsRef, cleanForFirestore(settings), { merge: true });
    if (shouldQueue) {
      removePendingWrite('settings', 'settings');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/settings/user_settings`);
  }
}

export async function syncSavingsGoalToCloud(userId: string, goal: SavingsGoal, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'savings_goal', data: goal, timestamp: Date.now() });
  }
  try {
    const goalRef = doc(db, 'users', userId, 'savingsGoals', goal.id);
    await setDoc(goalRef, cleanForFirestore(goal), { merge: true });
    clearCloudDeletion(userId, goal.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('savings_goal', goal.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/savingsGoals/${goal.id}`);
  }
}

export async function deleteSavingsGoalFromCloud(userId: string, goalId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'savings_goal_delete', id: goalId, timestamp: Date.now() });
  }
  try {
    const goalRef = doc(db, 'users', userId, 'savingsGoals', goalId);
    const delRef = doc(db, 'users', userId, 'deletions', goalId);
    const batch = writeBatch(db);
    batch.delete(goalRef);
    batch.set(delRef, { id: goalId, type: 'savings_goal', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('savings_goal_delete', goalId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/savingsGoals/${goalId}`);
  }
}

export async function syncSavingsTransactionToCloud(userId: string, transaction: SavingsTransaction, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'savings_transaction', data: transaction, timestamp: Date.now() });
  }
  try {
    const txRef = doc(db, 'users', userId, 'savingsTransactions', transaction.id);
    await setDoc(txRef, cleanForFirestore(transaction), { merge: true });
    clearCloudDeletion(userId, transaction.id).catch(() => {});
    if (shouldQueue) {
      removePendingWrite('savings_transaction', transaction.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/savingsTransactions/${transaction.id}`);
  }
}

export async function deleteSavingsTransactionFromCloud(userId: string, transactionId: string, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'savings_transaction_delete', id: transactionId, timestamp: Date.now() });
  }
  try {
    const txRef = doc(db, 'users', userId, 'savingsTransactions', transactionId);
    const delRef = doc(db, 'users', userId, 'deletions', transactionId);
    const batch = writeBatch(db);
    batch.delete(txRef);
    batch.set(delRef, { id: transactionId, type: 'savings_transaction', deletedAt: new Date().toISOString() }, { merge: true });
    await batch.commit();
    if (shouldQueue) {
      removePendingWrite('savings_transaction_delete', transactionId);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/savingsTransactions/${transactionId}`);
  }
}

export async function syncSavingsSettingsToCloud(userId: string, settings: SavingsSettings, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'savings_settings', data: settings, timestamp: Date.now() });
  }
  try {
    const settingsRef = doc(db, 'users', userId, 'savingsSettings', 'settings');
    await setDoc(settingsRef, cleanForFirestore(settings), { merge: true });
    if (shouldQueue) {
      removePendingWrite('savings_settings', 'savings_settings');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/savingsSettings/settings`);
  }
}

export async function syncNotificationToCloud(userId: string, notification: NotificationRecord): Promise<void> {
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notification.id);
    await setDoc(notifRef, cleanForFirestore(notification), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/notifications/${notification.id}`, true);
  }
}

export async function updateNotificationInCloud(
  userId: string,
  notificationId: string,
  updates: Partial<NotificationRecord>
): Promise<void> {
  if (!userId || !notificationId) return;
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notifRef, cleanForFirestore(updates));
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (error?.code === 'not-found' || msg.includes('No document to update')) {
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/notifications/${notificationId}`, true);
  }
}

export async function deleteNotificationFromCloud(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Cannot confirm cloud deletion while offline.');
  }
  try {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(notifRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notifications/${notificationId}`, true);
  }
}

export async function deleteNotificationsBatchFromCloud(
  userId: string,
  notificationIds: string[]
): Promise<{ deletedCount: number }> {
  if (!userId || !notificationIds || notificationIds.length === 0) {
    return { deletedCount: 0 };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Cannot confirm cloud batch deletion while offline.');
  }

  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean)));
  const CHUNK_SIZE = 250;
  let deletedCount = 0;

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
    let lastError: unknown = null;
    let committed = false;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const batch = writeBatch(db);
        for (const id of chunk) {
          batch.delete(doc(db, 'users', userId, 'notifications', id));
        }
        await batch.commit();
        deletedCount += chunk.length;
        committed = true;
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 2 && !isOfflineFirestoreError(err)) {
          await new Promise((res) => setTimeout(res, 250 * attempt));
        }
      }
    }

    if (!committed) {
      recordNotificationDiagnostic({
        event: 'cloud_batch_delete_failed',
        count: chunk.length,
        note: lastError instanceof Error ? lastError.message : String(lastError),
      });
      handleFirestoreError(
        lastError,
        OperationType.DELETE,
        `users/${userId}/notifications`,
        true
      );
    }
  }

  return { deletedCount };
}

export async function deleteAllNotificationsFromCloud(
  userId: string,
  knownIds: string[] = [],
  clearedAt?: string | null
): Promise<{ deletedCount: number; verifiedEmpty: boolean }> {
  if (!userId) return { deletedCount: 0, verifiedEmpty: true };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Cannot confirm cloud purge while offline.');
  }

  const clearedMs = normalizeTimestampMs(clearedAt);
  let totalDeleted = 0;
  const deletedIdSet = new Set<string>();

  try {
    const notifCol = collection(db, 'users', userId, 'notifications');
    let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    const MAX_PAGES = 100;

    for (let page = 0; page < MAX_PAGES; page++) {
      const pageQuery: Query<DocumentData> = lastDoc
        ? query(notifCol, startAfter(lastDoc), limit(250))
        : query(notifCol, limit(250));

      const snap: QuerySnapshot<DocumentData> = await getDocsFromServer(pageQuery);
      if (snap.empty) {
        break;
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      const idsToDelete: string[] = [];

      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Partial<NotificationRecord>;
        if (clearedMs !== null) {
          const docCreatedMs = normalizeTimestampMs(data?.createdAt);
          // Skip docs demonstrably created strictly AFTER clearedAt
          if (docCreatedMs !== null && docCreatedMs > clearedMs) {
            continue;
          }
        }
        idsToDelete.push(docSnap.id);
      }

      if (idsToDelete.length > 0) {
        const res = await deleteNotificationsBatchFromCloud(userId, idsToDelete);
        totalDeleted += res.deletedCount;
        idsToDelete.forEach((id) => deletedIdSet.add(id));
      }

      if (snap.docs.length < 250) {
        break;
      }
    }

    // Also ensure any knownIds not returned by the page scan (e.g. pending writes) are deleted
    const remainingKnown = knownIds.filter((id) => id && !deletedIdSet.has(id));
    if (remainingKnown.length > 0) {
      const res = await deleteNotificationsBatchFromCloud(userId, remainingKnown);
      totalDeleted += res.deletedCount;
    }

    // Authoritative server verification check
    const verifySnap = await getDocsFromServer(query(notifCol, limit(50)));
    const lingeringPreClearIds: string[] = [];
    verifySnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<NotificationRecord>;
      const docCreatedMs = normalizeTimestampMs(data?.createdAt);
      if (clearedMs === null || docCreatedMs === null || docCreatedMs <= clearedMs) {
        lingeringPreClearIds.push(docSnap.id);
      }
    });

    if (lingeringPreClearIds.length > 0) {
      recordNotificationDiagnostic({
        event: 'cloud_purge_lingering_retry',
        count: lingeringPreClearIds.length,
      });
      const retryRes = await deleteNotificationsBatchFromCloud(userId, lingeringPreClearIds);
      totalDeleted += retryRes.deletedCount;

      const finalVerifySnap = await getDocsFromServer(query(notifCol, limit(50)));
      const stillLingering = finalVerifySnap.docs.filter((d) => {
        const docCreatedMs = normalizeTimestampMs((d.data() as Partial<NotificationRecord>)?.createdAt);
        return clearedMs === null || docCreatedMs === null || docCreatedMs <= clearedMs;
      });
      if (stillLingering.length > 0) {
        throw new Error(`Cloud verification failed: ${stillLingering.length} notifications still remain on server.`);
      }
    }

    recordNotificationDiagnostic({
      event: 'cloud_purge_verified_empty',
      count: totalDeleted,
    });

    return { deletedCount: totalDeleted, verifiedEmpty: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/notifications`, true);
    return { deletedCount: totalDeleted, verifiedEmpty: false };
  }
}

export async function markAllNotificationsReadInCloud(
  userId: string,
  notificationIds: string[],
  shouldCancel?: () => boolean
): Promise<void> {
  if (!userId || !notificationIds || notificationIds.length === 0) return;
  const uniqueIds = Array.from(new Set(notificationIds.filter(Boolean)));
  const nowIso = new Date().toISOString();
  const CHUNK_SIZE = 250;

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    if (shouldCancel?.()) {
      recordNotificationDiagnostic({
        event: 'mark_all_read_aborted_for_delete',
        count: uniqueIds.length - i,
      });
      break;
    }
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
    try {
      const batch = writeBatch(db);
      for (const id of chunk) {
        const ref = doc(db, 'users', userId, 'notifications', id);
        batch.update(ref, { read: true, readAt: nowIso });
      }
      await batch.commit();
    } catch {
      if (shouldCancel?.()) break;
      await Promise.allSettled(
        chunk.map((id) =>
          updateDoc(doc(db, 'users', userId, 'notifications', id), { read: true, readAt: nowIso }).catch(() => {})
        )
      );
    }
  }
}

export interface CloudDismissedNotificationsState {
  keys: string[];
  clearedAllAt?: string | null;
  updatedAt?: string;
}

export async function syncDismissedNotificationsToCloud(
  userId: string,
  keys: string[],
  clearedAllAt?: string | null
): Promise<void> {
  if (!userId) return;
  try {
    const ref = doc(db, 'users', userId, 'notificationSettings', 'dismissed');
    const payload: CloudDismissedNotificationsState = {
      keys: Array.from(new Set(keys.filter((k) => typeof k === 'string' && k.length > 0))).slice(-1500),
      clearedAllAt: clearedAllAt || null,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, cleanForFirestore(payload), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/notificationSettings/dismissed`, true);
  }
}

export async function syncReminderToCloud(userId: string, reminder: ReminderDefinition): Promise<void> {
  try {
    const remRef = doc(db, 'users', userId, 'reminders', reminder.id);
    await setDoc(remRef, cleanForFirestore(reminder), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/reminders/${reminder.id}`);
  }
}

export async function deleteReminderFromCloud(userId: string, reminderId: string): Promise<void> {
  try {
    const remRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(remRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/reminders/${reminderId}`);
  }
}

export async function syncNotificationSettingsToCloud(userId: string, settings: NotificationSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'users', userId, 'notificationSettings', 'settings');
    await setDoc(settingsRef, cleanForFirestore(settings), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/notificationSettings/settings`);
  }
}

export async function syncPushSubscriptionToCloud(userId: string, subscription: PushSubscriptionRecord): Promise<void> {
  try {
    const subRef = doc(db, 'users', userId, 'pushSubscriptions', subscription.id);
    await setDoc(subRef, cleanForFirestore(subscription), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/pushSubscriptions/${subscription.id}`);
  }
}

export async function deletePushSubscriptionFromCloud(userId: string, subscriptionId: string): Promise<void> {
  try {
    const subRef = doc(db, 'users', userId, 'pushSubscriptions', subscriptionId);
    await deleteDoc(subRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/pushSubscriptions/${subscriptionId}`);
  }
}

export async function syncAIBriefingToCloud(userId: string, briefing: AIDailyBriefing): Promise<void> {
  try {
    const brRef = doc(db, 'users', userId, 'aiBriefings', briefing.id);
    await setDoc(brRef, cleanForFirestore(briefing), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/aiBriefings/${briefing.id}`);
  }
}

export async function uploadInitialDataToCloud(
  userId: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  settings: UserSettings,
  goals: Goal[] = [],
  sleepLogs: SleepLog[] = [],
  savingsGoals: SavingsGoal[] = [],
  savingsTransactions: SavingsTransaction[] = [],
  savingsSettings?: SavingsSettings
): Promise<boolean> {
  try {
    const batch = writeBatch(db);

    habits.forEach((h) => {
      const ref = doc(db, 'users', userId, 'habits', h.id);
      batch.set(ref, cleanForFirestore(h), { merge: true });
    });

    completions.forEach((c) => {
      const ref = doc(db, 'users', userId, 'habitCompletions', c.id);
      batch.set(ref, cleanForFirestore(c), { merge: true });
    });

    todos.forEach((t) => {
      const ref = doc(db, 'users', userId, 'todos', t.id);
      batch.set(ref, cleanForFirestore(t), { merge: true });
    });

    goals.forEach((g) => {
      const ref = doc(db, 'users', userId, 'goals', g.id);
      batch.set(ref, cleanForFirestore(g), { merge: true });
    });

    sleepLogs.forEach((s) => {
      const ref = doc(db, 'users', userId, 'sleepLogs', s.id);
      batch.set(ref, cleanForFirestore(s), { merge: true });
    });

    savingsGoals.forEach((sg) => {
      const ref = doc(db, 'users', userId, 'savingsGoals', sg.id);
      batch.set(ref, cleanForFirestore(sg), { merge: true });
    });

    savingsTransactions.forEach((st) => {
      const ref = doc(db, 'users', userId, 'savingsTransactions', st.id);
      batch.set(ref, cleanForFirestore(st), { merge: true });
    });

    if (savingsSettings) {
      const savSettingsRef = doc(db, 'users', userId, 'savingsSettings', 'settings');
      batch.set(savSettingsRef, cleanForFirestore(savingsSettings), { merge: true });
    }

    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    batch.set(settingsRef, cleanForFirestore(settings), { merge: true });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error uploading initial data to Firestore:', error);
    return false;
  }
}

/**
 * Synchronize all local habits, completions, todos, goals, sleep logs, and settings to the cloud in batch.
 * Used for automatic offline re-sync and manual cloud backup.
 */
export async function syncAllLocalDataToCloud(
  userId: string,
  habits: Habit[] = [],
  completions: HabitCompletion[] = [],
  todos: Todo[] = [],
  settings: UserSettings,
  goals: Goal[] = [],
  sleepLogs: SleepLog[] = []
): Promise<boolean> {
  if (!userId) return false;
  try {
    const validHabits = (habits || []).filter(
      (h) => h && typeof h.id === 'string' && h.id.trim() !== ''
    );
    const validCompletions = (completions || []).filter(
      (c) => c && typeof c.id === 'string' && c.id.trim() !== ''
    );
    const validTodos = (todos || []).filter(
      (t) => t && typeof t.id === 'string' && t.id.trim() !== ''
    );
    const validGoals = (goals || []).filter(
      (g) => g && typeof g.id === 'string' && g.id.trim() !== ''
    );
    const validSleepLogs = (sleepLogs || []).filter(
      (s) => s && typeof s.id === 'string' && s.id.trim() !== ''
    );

    const ops: Array<{ ref: any; data: any }> = [];

    validHabits.forEach((h) => {
      ops.push({
        ref: doc(db, 'users', userId, 'habits', h.id),
        data: cleanForFirestore(h),
      });
    });

    validCompletions.forEach((c) => {
      ops.push({
        ref: doc(db, 'users', userId, 'habitCompletions', c.id),
        data: cleanForFirestore(c),
      });
    });

    validTodos.forEach((t) => {
      ops.push({
        ref: doc(db, 'users', userId, 'todos', t.id),
        data: cleanForFirestore(t),
      });
    });

    validGoals.forEach((g) => {
      ops.push({
        ref: doc(db, 'users', userId, 'goals', g.id),
        data: cleanForFirestore(g),
      });
    });

    validSleepLogs.forEach((s) => {
      ops.push({
        ref: doc(db, 'users', userId, 'sleepLogs', s.id),
        data: cleanForFirestore(s),
      });
    });

    if (settings) {
      ops.push({
        ref: doc(db, 'users', userId, 'settings', 'user_settings'),
        data: cleanForFirestore(settings),
      });
    }

    // Execute in batches of 100 with resilient per-doc fallback
    const BATCH_SIZE = 100;
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const chunk = ops.slice(i, i + BATCH_SIZE);
      try {
        const batch = writeBatch(db);
        for (const op of chunk) {
          batch.set(op.ref, op.data, { merge: true });
        }
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch write encountered error, falling back to individual writes:', batchErr);
        await Promise.allSettled(
          chunk.map((op) => setDoc(op.ref, op.data, { merge: true }))
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Error in syncAllLocalDataToCloud:', error);
    try {
      if (settings) {
        await setDoc(doc(db, 'users', userId, 'settings', 'user_settings'), cleanForFirestore(settings), { merge: true });
      }
      return true;
    } catch {
      return false;
    }
  }
}

export interface CloudSnapshotMeta {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface CloudDataResult {
  habits: Habit[] | null;
  completions: HabitCompletion[] | null;
  todos: Todo[] | null;
  goals: Goal[] | null;
  sleepLogs: SleepLog[] | null;
  savingsGoals: SavingsGoal[] | null;
  savingsTransactions: SavingsTransaction[] | null;
  savingsSettings: SavingsSettings | null;
  settings: UserSettings | null;
  deletions: Map<string, string>;
}

/**
 * Fetch all cloud data for a user from Firestore concurrently.
 */
export async function fetchAllCloudData(userId: string): Promise<CloudDataResult | null> {
  if (!userId) return null;
  try {
    const [habitsRes, compRes, todosRes, goalsRes, sleepRes, savingsGoalsRes, savingsTxRes, savingsSettingsRes, settingsRes, delRes] = await Promise.allSettled([
      getDocs(collection(db, 'users', userId, 'habits')),
      getDocs(collection(db, 'users', userId, 'habitCompletions')),
      getDocs(collection(db, 'users', userId, 'todos')),
      getDocs(collection(db, 'users', userId, 'goals')),
      getDocs(collection(db, 'users', userId, 'sleepLogs')),
      getDocs(collection(db, 'users', userId, 'savingsGoals')),
      getDocs(collection(db, 'users', userId, 'savingsTransactions')),
      getDoc(doc(db, 'users', userId, 'savingsSettings', 'settings')),
      getDoc(doc(db, 'users', userId, 'settings', 'user_settings')),
      getDocs(collection(db, 'users', userId, 'deletions')),
    ]);

    const habits: Habit[] | null =
      habitsRes.status === 'fulfilled'
        ? habitsRes.value.docs.map((d) => d.data() as Habit)
        : null;

    const completions: HabitCompletion[] | null =
      compRes.status === 'fulfilled'
        ? compRes.value.docs.map((d) => d.data() as HabitCompletion)
        : null;

    const todos: Todo[] | null =
      todosRes.status === 'fulfilled'
        ? todosRes.value.docs.map((d) => d.data() as Todo).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : null;

    const goals: Goal[] | null =
      goalsRes.status === 'fulfilled'
        ? goalsRes.value.docs.map((d) => d.data() as Goal)
        : null;

    const sleepLogs: SleepLog[] | null =
      sleepRes.status === 'fulfilled'
        ? sleepRes.value.docs.map((d) => d.data() as SleepLog).sort((a, b) => b.date.localeCompare(a.date))
        : null;

    const savingsGoals: SavingsGoal[] | null =
      savingsGoalsRes.status === 'fulfilled'
        ? savingsGoalsRes.value.docs.map((d) => d.data() as SavingsGoal)
        : null;

    const savingsTransactions: SavingsTransaction[] | null =
      savingsTxRes.status === 'fulfilled'
        ? savingsTxRes.value.docs.map((d) => d.data() as SavingsTransaction).sort((a, b) => b.date.localeCompare(a.date))
        : null;

    let savingsSettings: SavingsSettings | null = null;
    if (savingsSettingsRes.status === 'fulfilled' && savingsSettingsRes.value.exists()) {
      savingsSettings = savingsSettingsRes.value.data() as SavingsSettings;
    }

    let settings: UserSettings | null = null;
    if (settingsRes.status === 'fulfilled' && settingsRes.value.exists()) {
      settings = settingsRes.value.data() as UserSettings;
    }

    const deletions = new Map<string, string>();
    if (delRes.status === 'fulfilled') {
      delRes.value.forEach((d) => {
        const data = d.data();
        if (data && data.id && data.deletedAt) {
          deletions.set(data.id, data.deletedAt);
        }
      });
    }

    return { habits, completions, todos, goals, sleepLogs, savingsGoals, savingsTransactions, savingsSettings, settings, deletions };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function checkHasCloudData(userId: string): Promise<boolean> {
  try {
    const habitsCol = collection(db, 'users', userId, 'habits');
    const habitsSnap = await getDocs(habitsCol);
    if (!habitsSnap.empty) return true;

    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) return true;

    const todosCol = collection(db, 'users', userId, 'todos');
    const todosSnap = await getDocs(todosCol);
    if (!todosSnap.empty) return true;

    const goalsCol = collection(db, 'users', userId, 'goals');
    const goalsSnap = await getDocs(goalsCol);
    if (!goalsSnap.empty) return true;

    const compCol = collection(db, 'users', userId, 'habitCompletions');
    const compSnap = await getDocs(compCol);
    if (!compSnap.empty) return true;

    const sleepCol = collection(db, 'users', userId, 'sleepLogs');
    const sleepSnap = await getDocs(sleepCol);
    if (!sleepSnap.empty) return true;

    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return false;
  }
}

export function subscribeToUserCloudData(
  userId: string,
  handlers: {
    onHabits: (habits: Habit[], meta?: CloudSnapshotMeta) => void;
    onCompletions: (completions: HabitCompletion[], meta?: CloudSnapshotMeta) => void;
    onTodos: (todos: Todo[], meta?: CloudSnapshotMeta) => void;
    onGoals?: (goals: Goal[], meta?: CloudSnapshotMeta) => void;
    onSleepLogs?: (sleepLogs: SleepLog[], meta?: CloudSnapshotMeta) => void;
    onSavingsGoals?: (savingsGoals: SavingsGoal[], meta?: CloudSnapshotMeta) => void;
    onSavingsTransactions?: (savingsTransactions: SavingsTransaction[], meta?: CloudSnapshotMeta) => void;
    onSavingsSettings?: (savingsSettings: SavingsSettings, meta?: CloudSnapshotMeta) => void;
    onNotifications?: (notifications: NotificationRecord[], meta?: CloudSnapshotMeta) => void;
    onDismissedNotifications?: (state: CloudDismissedNotificationsState, meta?: CloudSnapshotMeta) => void;
    onReminders?: (reminders: ReminderDefinition[], meta?: CloudSnapshotMeta) => void;
    onNotificationSettings?: (settings: NotificationSettings, meta?: CloudSnapshotMeta) => void;
    onAIBriefings?: (briefings: AIDailyBriefing[], meta?: CloudSnapshotMeta) => void;
    onSettings: (settings: UserSettings, meta?: CloudSnapshotMeta) => void;
    onDeletions?: (deletions: Map<string, string>) => void;
  }
): () => void {
  let isUnsubscribed = false;
  const activeUnsubs = new Map<string, () => void>();
  const retryTimers = new Map<string, NodeJS.Timeout>();
  const retryAttempts = new Map<string, number>();

  const attachListener = (key: string, attachFn: (onError: (err: unknown) => void) => () => void, operation: OperationType, path: string) => {
    if (isUnsubscribed || !userId) return;

    const existingUnsub = activeUnsubs.get(key);
    if (existingUnsub) {
      try {
        existingUnsub();
      } catch {}
      activeUnsubs.delete(key);
    }

    const existingTimer = retryTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      retryTimers.delete(key);
    }

    const onError = (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string } | null)?.code || '';
      // Log error cleanly without tearing down healthy sibling listeners
      if (code === 'permission-denied' || errMsg.includes('Missing or insufficient permissions')) {
        console.error(`Firestore listener permission error [${path}]:`, errMsg);
        return;
      }
      handleFirestoreError(err, operation, path, false);
      if (isUnsubscribed || errMsg.includes('INTERNAL ASSERTION FAILED')) {
        return;
      }
      const attempt = (retryAttempts.get(key) || 0) + 1;
      retryAttempts.set(key, attempt);
      const delayMs = Math.min(60000, 5000 * Math.pow(2, Math.min(attempt - 1, 3)));
      if (!retryTimers.has(key)) {
        const timer = setTimeout(() => {
          retryTimers.delete(key);
          if (!isUnsubscribed) {
            attachListener(key, attachFn, operation, path);
          }
        }, delayMs);
        retryTimers.set(key, timer);
      }
    };

    try {
      const unsub = attachFn(onError);
      activeUnsubs.set(key, unsub);
    } catch (err) {
      onError(err);
    }
  };

  attachListener(
    'habits',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'habits'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('habits');
          const list: Habit[] = [];
          snap.forEach((d) => list.push(d.data() as Habit));
          handlers.onHabits(list, {
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
          });
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/habits`
  );

  attachListener(
    'completions',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'habitCompletions'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('completions');
          const list: HabitCompletion[] = [];
          snap.forEach((d) => list.push(d.data() as HabitCompletion));
          handlers.onCompletions(list, {
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
          });
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/habitCompletions`
  );

  attachListener(
    'todos',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'todos'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('todos');
          const list: Todo[] = [];
          snap.forEach((d) => list.push(d.data() as Todo));
          list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          handlers.onTodos(list, {
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
          });
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/todos`
  );

  attachListener(
    'goals',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'goals'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('goals');
          const list: Goal[] = [];
          snap.forEach((d) => list.push(d.data() as Goal));
          if (handlers.onGoals) {
            handlers.onGoals(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/goals`
  );

  attachListener(
    'sleepLogs',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'sleepLogs'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('sleepLogs');
          const list: SleepLog[] = [];
          snap.forEach((d) => list.push(d.data() as SleepLog));
          list.sort((a, b) => b.date.localeCompare(a.date));
          if (handlers.onSleepLogs) {
            handlers.onSleepLogs(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/sleepLogs`
  );

  attachListener(
    'savingsGoals',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'savingsGoals'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('savingsGoals');
          const list: SavingsGoal[] = [];
          snap.forEach((d) => list.push(d.data() as SavingsGoal));
          if (handlers.onSavingsGoals) {
            handlers.onSavingsGoals(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/savingsGoals`
  );

  attachListener(
    'savingsTransactions',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'savingsTransactions'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('savingsTransactions');
          const list: SavingsTransaction[] = [];
          snap.forEach((d) => list.push(d.data() as SavingsTransaction));
          list.sort((a, b) => b.date.localeCompare(a.date));
          if (handlers.onSavingsTransactions) {
            handlers.onSavingsTransactions(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/savingsTransactions`
  );

  attachListener(
    'savingsSettings',
    (onError) =>
      onSnapshot(
        doc(db, 'users', userId, 'savingsSettings', 'settings'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('savingsSettings');
          if (snap.exists() && handlers.onSavingsSettings) {
            handlers.onSavingsSettings(snap.data() as SavingsSettings, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.GET,
    `users/${userId}/savingsSettings/settings`
  );

  attachListener(
    'settings',
    (onError) =>
      onSnapshot(
        doc(db, 'users', userId, 'settings', 'user_settings'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('settings');
          if (snap.exists()) {
            handlers.onSettings(snap.data() as UserSettings, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.GET,
    `users/${userId}/settings/user_settings`
  );

  attachListener(
    'notifications',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'notifications'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('notifications');
          const list: NotificationRecord[] = [];
          snap.forEach((d) => {
            const raw = d.data() as Record<string, unknown>;
            const normalizedCreatedAt = normalizeIsoTimestamp(raw?.createdAt, '');
            list.push({
              ...(raw as unknown as NotificationRecord),
              id: (typeof raw?.id === 'string' && raw.id) ? raw.id : d.id,
              createdAt: normalizedCreatedAt,
            });
          });
          list.sort((a, b) => (normalizeTimestampMs(b.createdAt) ?? 0) - (normalizeTimestampMs(a.createdAt) ?? 0));
          recordNotificationDiagnostic({
            event: 'snapshot_notifications',
            count: list.length,
            fromCache: snap.metadata.fromCache,
            hasPendingWrites: snap.metadata.hasPendingWrites,
          });
          if (handlers.onNotifications) {
            handlers.onNotifications(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/notifications`
  );

  attachListener(
    'dismissedNotifications',
    (onError) =>
      onSnapshot(
        doc(db, 'users', userId, 'notificationSettings', 'dismissed'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('dismissedNotifications');
          if (handlers.onDismissedNotifications) {
            const raw = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
            const data: CloudDismissedNotificationsState = raw
              ? {
                  keys: Array.isArray(raw.keys) ? (raw.keys as string[]) : [],
                  clearedAllAt: raw.clearedAllAt ? normalizeIsoTimestamp(raw.clearedAllAt, '') || null : null,
                  updatedAt: raw.updatedAt ? normalizeIsoTimestamp(raw.updatedAt, '') : undefined,
                }
              : { keys: [], clearedAllAt: null };
            handlers.onDismissedNotifications(data, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.GET,
    `users/${userId}/notificationSettings/dismissed`
  );

  attachListener(
    'reminders',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'reminders'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('reminders');
          const list: ReminderDefinition[] = [];
          snap.forEach((d) => list.push(d.data() as ReminderDefinition));
          if (handlers.onReminders) {
            handlers.onReminders(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/reminders`
  );

  attachListener(
    'notificationSettings',
    (onError) =>
      onSnapshot(
        doc(db, 'users', userId, 'notificationSettings', 'settings'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('notificationSettings');
          if (snap.exists() && handlers.onNotificationSettings) {
            handlers.onNotificationSettings(snap.data() as NotificationSettings, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.GET,
    `users/${userId}/notificationSettings/settings`
  );

  attachListener(
    'aiBriefings',
    (onError) =>
      onSnapshot(
        collection(db, 'users', userId, 'aiBriefings'),
        (snap) => {
          if (isUnsubscribed) return;
          retryAttempts.delete('aiBriefings');
          const list: AIDailyBriefing[] = [];
          snap.forEach((d) => list.push(d.data() as AIDailyBriefing));
          list.sort((a, b) => (b.dateKey || b.date || '').localeCompare(a.dateKey || a.date || ''));
          if (handlers.onAIBriefings) {
            handlers.onAIBriefings(list, {
              fromCache: snap.metadata.fromCache,
              hasPendingWrites: snap.metadata.hasPendingWrites,
            });
          }
        },
        onError
      ),
    OperationType.LIST,
    `users/${userId}/aiBriefings`
  );

  attachListener(
    'deletions',
    () =>
      onSnapshot(
        collection(db, 'users', userId, 'deletions'),
        (snap) => {
          if (isUnsubscribed) return;
          const map = new Map<string, string>();
          snap.forEach((d) => {
            const data = d.data();
            if (data && data.id && data.deletedAt) {
              map.set(data.id, data.deletedAt);
            }
          });
          if (handlers.onDeletions) {
            handlers.onDeletions(map);
          }
        },
        () => {}
      ),
    OperationType.LIST,
    `users/${userId}/deletions`
  );

  return () => {
    isUnsubscribed = true;
    retryTimers.forEach((timer) => clearTimeout(timer));
    retryTimers.clear();
    activeUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeUnsubs.clear();
  };
}
