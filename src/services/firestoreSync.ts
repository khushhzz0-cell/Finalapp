import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DatabaseDump } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(app);
const auth = getAuth(app);

// Attempt anonymous sign-in in background so that request.auth is populated if rules require it
signInAnonymously(auth).catch(err => {
  // Silent catch: unauthenticated access also works with open rules
  console.debug('Anonymous auth note:', err?.message);
});

// Single primary workspace document ID for cloud persistence across devices
const WORKSPACE_COLLECTION = 'workspaces';
const WORKSPACE_DOC_ID = 'main';

/**
 * Remove undefined values to prevent Firestore unsupported field value errors
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (value === undefined ? null : value))
  );
}

export type SyncStatus = 'connected' | 'syncing' | 'synced' | 'offline' | 'error';

let currentSyncStatus: SyncStatus = 'connected';
const statusListeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  statusListeners.forEach(fn => fn(status));
}

/**
 * Test server connection on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(firestoreDb, WORKSPACE_COLLECTION, 'health_check');
    await getDocFromServer(testDocRef);
    setSyncStatus('connected');
    return true;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || !navigator.onLine) {
      setSyncStatus('offline');
    } else {
      console.warn('Firestore connection note:', err?.message);
    }
    return false;
  }
}

/**
 * Load workspace data from Firestore
 */
export async function loadWorkspaceFromFirestore(): Promise<DatabaseDump | null> {
  try {
    setSyncStatus('syncing');
    const docRef = doc(firestoreDb, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DatabaseDump;
      setSyncStatus('synced');
      return data;
    }
    setSyncStatus('connected');
    return null;
  } catch (error) {
    console.error('Failed to load from Firestore:', error);
    setSyncStatus('error');
    return null;
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
let pendingSavePromise: Promise<void> | null = null;

/**
 * Debounced save to Firestore with status tracking
 */
export function saveWorkspaceToFirestore(data: DatabaseDump): Promise<void> {
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSyncStatus('syncing');

    saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(firestoreDb, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
        const cleaned = sanitizeForFirestore(data);
        await setDoc(docRef, cleaned, { merge: true });
        setSyncStatus('synced');
        resolve();
      } catch (error) {
        console.error('Failed to write to Firestore:', error);
        setSyncStatus('error');
        reject(error);
      }
    }, 350);
  });
}

/**
 * Subscribe to real-time changes from Firestore (multi-tab / multi-device sync)
 */
export function subscribeToFirestoreWorkspace(
  onUpdate: (data: DatabaseDump) => void
): Unsubscribe {
  const docRef = doc(firestoreDb, WORKSPACE_COLLECTION, WORKSPACE_DOC_ID);
  
  return onSnapshot(
    docRef,
    snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.data() as DatabaseDump;
        setSyncStatus('synced');
        onUpdate(data);
      }
    },
    error => {
      console.warn('Firestore snapshot subscription warning:', error.message);
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
    }
  );
}
