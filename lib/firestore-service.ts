import {
  db,
  auth,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc,
  query,
  where,
  User,
} from './firebase';
import { Habit, HabitCompletion, Todo, UserSettings, Goal, SleepLog } from './types';

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

const PENDING_QUEUE_KEY = 'lifeos_pending_cloud_writes';

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
    | 'settings';
  data?: any;
  id?: string;
  timestamp: number;
}

export function queuePendingWrite(write: PendingWrite): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    const queue: PendingWrite[] = raw ? JSON.parse(raw) : [];
    const targetId = write.id || (write.data && write.data.id) || (write.type === 'settings' ? 'settings' : '');
    // Deduplicate: replace any older pending write for the exact same item
    const deduplicated = queue.filter((item) => {
      const itemId = item.id || (item.data && item.data.id) || (item.type === 'settings' ? 'settings' : '');
      return !(itemId && itemId === targetId);
    });
    deduplicated.push(write);
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(deduplicated.slice(-150)));
  } catch {}
}

export function removePendingWrite(type: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    if (!raw) return;
    const queue: PendingWrite[] = JSON.parse(raw);
    const filtered = queue.filter((item) => {
      const itemId = item.id || (item.data && item.data.id) || (item.type === 'settings' ? 'settings' : '');
      return !(item.type === type && itemId === id);
    });
    localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(filtered));
  } catch {}
}

let isFlushing = false;
export async function flushPendingCloudWrites(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !userId || isFlushing) return;
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
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
          case 'settings':
            if (item.data) await syncSettingsToCloud(userId, item.data, false);
            break;
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(PENDING_QUEUE_KEY);
    }
  } catch (err) {
    console.warn('Failed to flush pending cloud writes:', err);
  } finally {
    isFlushing = false;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
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

export async function syncHabitToCloud(userId: string, habit: Habit, shouldQueue = true): Promise<void> {
  if (shouldQueue) {
    queuePendingWrite({ type: 'habit', data: habit, timestamp: Date.now() });
  }
  try {
    const habitRef = doc(db, 'users', userId, 'habits', habit.id);
    await setDoc(habitRef, cleanForFirestore(habit), { merge: true });
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
    await deleteDoc(habitRef);
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
        const batch = writeBatch(db);
        compSnap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
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
    await deleteDoc(compRef);
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
    await deleteDoc(todoRef);
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
    await deleteDoc(goalRef);
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
    await deleteDoc(sleepRef);
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

export async function uploadInitialDataToCloud(
  userId: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  settings: UserSettings,
  goals: Goal[] = [],
  sleepLogs: SleepLog[] = []
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
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  settings: UserSettings,
  goals: Goal[] = [],
  sleepLogs: SleepLog[] = []
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

    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    batch.set(settingsRef, cleanForFirestore(settings), { merge: true });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error in syncAllLocalDataToCloud:', error);
    return false;
  }
}

/**
 * Fetch all cloud data for a user from Firestore.
 */
export async function fetchAllCloudData(userId: string): Promise<{
  habits: Habit[];
  completions: HabitCompletion[];
  todos: Todo[];
  goals: Goal[];
  settings: UserSettings | null;
} | null> {
  try {
    const habitsSnap = await getDocs(collection(db, 'users', userId, 'habits'));
    const habits: Habit[] = [];
    habitsSnap.forEach((d) => habits.push(d.data() as Habit));

    const compSnap = await getDocs(collection(db, 'users', userId, 'habitCompletions'));
    const completions: HabitCompletion[] = [];
    compSnap.forEach((d) => completions.push(d.data() as HabitCompletion));

    const todosSnap = await getDocs(collection(db, 'users', userId, 'todos'));
    const todos: Todo[] = [];
    todosSnap.forEach((d) => todos.push(d.data() as Todo));
    todos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const goalsSnap = await getDocs(collection(db, 'users', userId, 'goals'));
    const goals: Goal[] = [];
    goalsSnap.forEach((d) => goals.push(d.data() as Goal));

    const settingsSnap = await getDoc(doc(db, 'users', userId, 'settings', 'user_settings'));
    const settings = settingsSnap.exists() ? (settingsSnap.data() as UserSettings) : null;

    return { habits, completions, todos, goals, settings };
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

    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return false;
  }
}

export function subscribeToUserCloudData(
  userId: string,
  handlers: {
    onHabits: (habits: Habit[]) => void;
    onCompletions: (completions: HabitCompletion[]) => void;
    onTodos: (todos: Todo[]) => void;
    onGoals?: (goals: Goal[]) => void;
    onSleepLogs?: (sleepLogs: SleepLog[]) => void;
    onSettings: (settings: UserSettings) => void;
  }
): () => void {
  let isUnsubscribed = false;
  let retryTimer: NodeJS.Timeout | null = null;
  let activeUnsubs: (() => void)[] = [];

  const setupSubscriptions = () => {
    if (isUnsubscribed || !userId) return;

    // Clean up existing listeners
    activeUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeUnsubs = [];

    const handleListenerError = (operation: OperationType, path: string) => (err: unknown) => {
      handleFirestoreError(err, operation, path);
      if (isUnsubscribed) return;
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!isUnsubscribed) {
            setupSubscriptions();
          }
        }, 2500);
      }
    };

    try {
      const unsubHabits = onSnapshot(
        collection(db, 'users', userId, 'habits'),
        (snap) => {
          if (isUnsubscribed) return;
          const list: Habit[] = [];
          snap.forEach((d) => list.push(d.data() as Habit));
          handlers.onHabits(list);
        },
        handleListenerError(OperationType.LIST, `users/${userId}/habits`)
      );
      activeUnsubs.push(unsubHabits);

      const unsubCompletions = onSnapshot(
        collection(db, 'users', userId, 'habitCompletions'),
        (snap) => {
          if (isUnsubscribed) return;
          const list: HabitCompletion[] = [];
          snap.forEach((d) => list.push(d.data() as HabitCompletion));
          handlers.onCompletions(list);
        },
        handleListenerError(OperationType.LIST, `users/${userId}/habitCompletions`)
      );
      activeUnsubs.push(unsubCompletions);

      const unsubTodos = onSnapshot(
        collection(db, 'users', userId, 'todos'),
        (snap) => {
          if (isUnsubscribed) return;
          const list: Todo[] = [];
          snap.forEach((d) => list.push(d.data() as Todo));
          list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          handlers.onTodos(list);
        },
        handleListenerError(OperationType.LIST, `users/${userId}/todos`)
      );
      activeUnsubs.push(unsubTodos);

      const unsubGoals = onSnapshot(
        collection(db, 'users', userId, 'goals'),
        (snap) => {
          if (isUnsubscribed) return;
          const list: Goal[] = [];
          snap.forEach((d) => list.push(d.data() as Goal));
          if (handlers.onGoals) {
            handlers.onGoals(list);
          }
        },
        handleListenerError(OperationType.LIST, `users/${userId}/goals`)
      );
      activeUnsubs.push(unsubGoals);

      const unsubSleepLogs = onSnapshot(
        collection(db, 'users', userId, 'sleepLogs'),
        (snap) => {
          if (isUnsubscribed) return;
          const list: SleepLog[] = [];
          snap.forEach((d) => list.push(d.data() as SleepLog));
          list.sort((a, b) => b.date.localeCompare(a.date));
          if (handlers.onSleepLogs) {
            handlers.onSleepLogs(list);
          }
        },
        handleListenerError(OperationType.LIST, `users/${userId}/sleepLogs`)
      );
      activeUnsubs.push(unsubSleepLogs);

      const unsubSettings = onSnapshot(
        doc(db, 'users', userId, 'settings', 'user_settings'),
        (snap) => {
          if (isUnsubscribed) return;
          if (snap.exists()) {
            handlers.onSettings(snap.data() as UserSettings);
          }
        },
        handleListenerError(OperationType.GET, `users/${userId}/settings/user_settings`)
      );
      activeUnsubs.push(unsubSettings);
    } catch (err) {
      console.warn('Failed to attach firestore listeners:', err);
      if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!isUnsubscribed) setupSubscriptions();
        }, 2500);
      }
    }
  };

  setupSubscriptions();

  return () => {
    isUnsubscribed = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    activeUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeUnsubs = [];
  };
}
