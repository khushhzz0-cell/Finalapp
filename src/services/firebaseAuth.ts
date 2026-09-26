import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in using Google OAuth popup
 */
export async function signInWithGoogle(): Promise<AuthUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user) return null;
    return {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
  } catch (error: any) {
    // If popup was closed by user or cancelled, log quietly
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.info('Google sign-in popup dismissed.');
      return null;
    }
    console.error('Google sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Failed to sign out:', error);
    throw error;
  }
}

/**
 * Subscribe to authentication state changes
 */
export function subscribeToAuth(
  onUserChanged: (user: AuthUser | null) => void
): () => void {
  return onAuthStateChanged(auth, (firebaseUser: User | null) => {
    if (firebaseUser) {
      onUserChanged({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
    } else {
      onUserChanged(null);
    }
  });
}

/**
 * Get current authenticated user synchronous snapshot
 */
export function getCurrentAuthUser(): AuthUser | null {
  const current = auth.currentUser;
  if (!current) return null;
  return {
    uid: current.uid,
    email: current.email,
    displayName: current.displayName,
    photoURL: current.photoURL,
  };
}
