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
import { Habit, HabitCompletion, Todo, UserSettings } from './types';

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
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned as T;
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

export async function syncHabitToCloud(userId: string, habit: Habit): Promise<void> {
  try {
    const habitRef = doc(db, 'users', userId, 'habits', habit.id);
    await setDoc(habitRef, cleanForFirestore(habit), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/habits/${habit.id}`);
  }
}

export async function deleteHabitFromCloud(userId: string, habitId: string): Promise<void> {
  try {
    const habitRef = doc(db, 'users', userId, 'habits', habitId);
    await deleteDoc(habitRef);

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

export async function syncCompletionToCloud(userId: string, completion: HabitCompletion): Promise<void> {
  try {
    const compRef = doc(db, 'users', userId, 'habitCompletions', completion.id);
    await setDoc(compRef, cleanForFirestore(completion), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/habitCompletions/${completion.id}`);
  }
}

export async function deleteCompletionFromCloud(userId: string, completionId: string): Promise<void> {
  try {
    const compRef = doc(db, 'users', userId, 'habitCompletions', completionId);
    await deleteDoc(compRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/habitCompletions/${completionId}`);
  }
}

export async function syncTodoToCloud(userId: string, todo: Todo): Promise<void> {
  try {
    const todoRef = doc(db, 'users', userId, 'todos', todo.id);
    await setDoc(todoRef, cleanForFirestore(todo), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/todos/${todo.id}`);
  }
}

export async function deleteTodoFromCloud(userId: string, todoId: string): Promise<void> {
  try {
    const todoRef = doc(db, 'users', userId, 'todos', todoId);
    await deleteDoc(todoRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/todos/${todoId}`);
  }
}

export async function syncSettingsToCloud(userId: string, settings: UserSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'user_settings');
    await setDoc(settingsRef, cleanForFirestore(settings), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/settings/user_settings`);
  }
}

export async function uploadInitialDataToCloud(
  userId: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  settings: UserSettings
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
 * Synchronize all local habits, completions, todos, and settings to the cloud in batch.
 * Used for automatic offline re-sync and manual cloud backup.
 */
export async function syncAllLocalDataToCloud(
  userId: string,
  habits: Habit[],
  completions: HabitCompletion[],
  todos: Todo[],
  settings: UserSettings
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

    const settingsSnap = await getDoc(doc(db, 'users', userId, 'settings', 'user_settings'));
    const settings = settingsSnap.exists() ? (settingsSnap.data() as UserSettings) : null;

    return { habits, completions, todos, settings };
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
    onSettings: (settings: UserSettings) => void;
  }
): () => void {
  const unsubHabits = onSnapshot(
    collection(db, 'users', userId, 'habits'),
    (snap) => {
      const list: Habit[] = [];
      snap.forEach((d) => list.push(d.data() as Habit));
      handlers.onHabits(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/habits`)
  );

  const unsubCompletions = onSnapshot(
    collection(db, 'users', userId, 'habitCompletions'),
    (snap) => {
      const list: HabitCompletion[] = [];
      snap.forEach((d) => list.push(d.data() as HabitCompletion));
      handlers.onCompletions(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/habitCompletions`)
  );

  const unsubTodos = onSnapshot(
    collection(db, 'users', userId, 'todos'),
    (snap) => {
      const list: Todo[] = [];
      snap.forEach((d) => list.push(d.data() as Todo));
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      handlers.onTodos(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/todos`)
  );

  const unsubSettings = onSnapshot(
    doc(db, 'users', userId, 'settings', 'user_settings'),
    (snap) => {
      if (snap.exists()) {
        handlers.onSettings(snap.data() as UserSettings);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, `users/${userId}/settings/user_settings`)
  );

  return () => {
    unsubHabits();
    unsubCompletions();
    unsubTodos();
    unsubSettings();
  };
}
