import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  enableNetwork,
  disableNetwork,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase app once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Use the isolated database specified in firebase-applet-config.json with resilient caching and ignoreUndefinedProperties
const targetDatabaseId = firebaseConfig.firestoreDatabaseId;
export const db = (() => {
  const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

  if (isBrowser) {
    // 1. Attempt multi-tab persistent cache
    try {
      const multiTabSettings = {
        ignoreUndefinedProperties: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      };
      return targetDatabaseId
        ? initializeFirestore(app, multiTabSettings, targetDatabaseId)
        : initializeFirestore(app, multiTabSettings);
    } catch {
      // 2. Attempt single-tab persistent cache (common for mobile Safari WebViews)
      try {
        const singleTabSettings = {
          ignoreUndefinedProperties: true,
          localCache: persistentLocalCache({}),
        };
        return targetDatabaseId
          ? initializeFirestore(app, singleTabSettings, targetDatabaseId)
          : initializeFirestore(app, singleTabSettings);
      } catch {
        // 3. Fallback to memory cache with ignoreUndefinedProperties
        try {
          const memorySettings = {
            ignoreUndefinedProperties: true,
            localCache: memoryLocalCache(),
          };
          return targetDatabaseId
            ? initializeFirestore(app, memorySettings, targetDatabaseId)
            : initializeFirestore(app, memorySettings);
        } catch {
          // Final fallback
          return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
        }
      }
    }
  }

  // Server-side fallback
  try {
    const srvSettings = { ignoreUndefinedProperties: true };
    return targetDatabaseId
      ? initializeFirestore(app, srvSettings, targetDatabaseId)
      : initializeFirestore(app, srvSettings);
  } catch {
    return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
  }
})();

let isNetworkDisabled = false;

export async function disableFirestoreNetwork(): Promise<void> {
  try {
    isNetworkDisabled = true;
    await disableNetwork(db);
  } catch {}
}

/**
 * Re-enables Firestore network connection only if it was explicitly disabled.
 * Prevents redundant enableNetwork() calls that corrupt WatchChangeAggregator in Firestore Web SDK.
 */
export async function reconnectFirestore(): Promise<void> {
  if (!isNetworkDisabled) return;
  try {
    isNetworkDisabled = false;
    await enableNetwork(db);
  } catch (err) {
    // If already enabled or not supported in current state, ignore silently
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in with Google (Gmail)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.info('Google sign-in popup was closed by user.');
    } else {
      console.error('Google sign in error:', error);
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  onAuthStateChanged,
};
export type { User };
