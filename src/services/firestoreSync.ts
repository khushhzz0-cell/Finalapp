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
import firebaseConfig from '../../firebase-applet-config.json';
import { DatabaseDump } from '../types';

// Initialize Firebase singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

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

export function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  statusListeners.forEach(fn => fn(status));
}

/**
 * Remove undefined values to prevent Firestore unsupported field value errors
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (value === undefined ? null : value))
  );
}

/**
 * Formats a 4-digit pin into a valid document key
 */
export function getPinDocId(pin: string): string {
  const cleaned = pin.replace(/\D/g, '').slice(0, 4) || '1234';
  return `pin_${cleaned}`;
}

/**
 * Test server connection on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(firestoreDb, 'workspaces', 'health_check');
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
 * Load workspace by 4-digit unique user code
 */
export async function loadPinWorkspace(pin: string): Promise<DatabaseDump | null> {
  const docId = getPinDocId(pin);
  try {
    setSyncStatus('syncing');
    const docRef = doc(firestoreDb, 'workspaces', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DatabaseDump;
      setSyncStatus('synced');
      return data;
    }
    setSyncStatus('connected');
    return null;
  } catch (error) {
    console.error(`Failed to load workspace for PIN ${pin}:`, error);
    setSyncStatus('error');
    return null;
  }
}

let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Save workspace by 4-digit unique user code with debouncing
 */
export function savePinWorkspace(pin: string, data: DatabaseDump): Promise<void> {
  const docId = getPinDocId(pin);
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSyncStatus('syncing');

    saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(firestoreDb, 'workspaces', docId);
        const cleaned = sanitizeForFirestore({
          ...data,
          ownerPin: pin,
          lastSyncedAt: new Date().toISOString(),
        });
        await setDoc(docRef, cleaned, { merge: true });
        setSyncStatus('synced');
        resolve();
      } catch (error) {
        console.error(`Failed to save workspace for PIN ${pin}:`, error);
        setSyncStatus('error');
        reject(error);
      }
    }, 300);
  });
}

/**
 * Real-time subscription to workspace for 4-digit unique user code
 */
export function subscribeToPinWorkspace(
  pin: string,
  onUpdate: (data: DatabaseDump) => void
): Unsubscribe {
  const docId = getPinDocId(pin);
  const docRef = doc(firestoreDb, 'workspaces', docId);

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
      console.warn(`Snapshot subscription warning for PIN ${pin}:`, error.message);
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
    }
  );
}
