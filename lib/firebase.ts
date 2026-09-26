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

// Use the isolated database specified in firebase-applet-config.json with ignoreUndefinedProperties
const targetDatabaseId = firebaseConfig.firestoreDatabaseId;
export const db = (() => {
  try {
    return targetDatabaseId
      ? initializeFirestore(app, { ignoreUndefinedProperties: true }, targetDatabaseId)
      : initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    return targetDatabaseId ? getFirestore(app, targetDatabaseId) : getFirestore(app);
  }
})();

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
