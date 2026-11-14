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
  setLogLevel,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDocsFromServer,
  getDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

// Initialize Firebase app once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Suppress transient warning noise while preserving genuine Firestore error logs
try {
  setLogLevel('error');
} catch {}

// Use the isolated database specified in firebase-applet-config.json.
// Use experimentalForceLongPolling + useFetchStreams: false in the browser so WebChannel/fetch-stream
// interceptors (extensions/proxies/iframes) cannot stall streams and trigger 10s offline timeouts.
const targetDatabaseId = firebaseConfig.firestoreDatabaseId;
type BrowserFirestoreSettings = Parameters<typeof initializeFirestore>[1] & {
  useFetchStreams?: boolean;
};

export const db = (() => {
  const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

  if (isBrowser) {
    // 1. Attempt multi-tab persistent cache
    try {
      const multiTabSettings: BrowserFirestoreSettings = {
        ignoreUndefinedProperties: true,
        experimentalForceLongPolling: true,
        useFetchStreams: false,
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
        const singleTabSettings: BrowserFirestoreSettings = {
          ignoreUndefinedProperties: true,
          experimentalForceLongPolling: true,
          useFetchStreams: false,
          localCache: persistentLocalCache({}),
        };
        return targetDatabaseId
          ? initializeFirestore(app, singleTabSettings, targetDatabaseId)
          : initializeFirestore(app, singleTabSettings);
      } catch {
        // 3. Fallback to memory cache with ignoreUndefinedProperties
        try {
          const memorySettings: BrowserFirestoreSettings = {
            ignoreUndefinedProperties: true,
            experimentalForceLongPolling: true,
            useFetchStreams: false,
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

  // Server-side fallback (Node.js does not support browser long-polling flags)
  try {
    const srvSettings = { ignoreUndefinedProperties: true };
    return targetDatabaseId
      ? initializeFirestore(app, srvSettings, targetDatabaseId)
      : initializeFirestore(app, srvSettings);
  } catch {
    return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
  }
})();

// Validate connection to Firestore on browser boot (non-blocking)
if (typeof window !== 'undefined') {
  (async function testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
    }
  })();
}

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
  updateDoc,
  getDocs,
  getDocsFromServer,
  getDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  where,
  limit,
  onAuthStateChanged,
};
export type { User };
