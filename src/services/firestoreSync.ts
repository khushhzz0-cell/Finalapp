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
import { auth } from './firebaseAuth';

// Initialize Firebase singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Error handling conforming to Firebase Integration Skill
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

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

export function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  statusListeners.forEach(fn => fn(status));
}

/**
 * Test server connection on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  const testPath = 'workspaces/health_check';
  try {
    const testDocRef = doc(firestoreDb, 'workspaces', 'health_check');
    await getDocFromServer(testDocRef);
    setSyncStatus('connected');
    return true;
  } catch (err: any) {
    if (err?.message?.includes('the client is offline') || !navigator.onLine) {
      setSyncStatus('offline');
    } else {
      handleFirestoreError(err, OperationType.GET, testPath);
    }
    return false;
  }
}

// -------------------------------------------------------------
// USER-SCOPED WORKSPACE PERSISTENCE
// -------------------------------------------------------------

/**
 * Load user workspace from Firestore
 */
export async function loadUserWorkspace(userId: string): Promise<DatabaseDump | null> {
  const docPath = `users/${userId}/workspace/main`;
  try {
    setSyncStatus('syncing');
    const docRef = doc(firestoreDb, 'users', userId, 'workspace', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DatabaseDump;
      setSyncStatus('synced');
      return data;
    }
    setSyncStatus('connected');
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    setSyncStatus('error');
    return null;
  }
}

let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Save user workspace with debounce and status tracking
 */
export function saveUserWorkspace(userId: string, data: DatabaseDump): Promise<void> {
  const docPath = `users/${userId}/workspace/main`;
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSyncStatus('syncing');

    saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(firestoreDb, 'users', userId, 'workspace', 'main');
        const cleaned = sanitizeForFirestore({
          ...data,
          ownerId: userId,
          lastSyncedAt: new Date().toISOString(),
        });
        await setDoc(docRef, cleaned, { merge: true });
        setSyncStatus('synced');
        resolve();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
        setSyncStatus('error');
        reject(error);
      }
    }, 350);
  });
}

/**
 * Subscribe to real-time changes for a specific user's workspace
 */
export function subscribeToUserWorkspace(
  userId: string,
  onUpdate: (data: DatabaseDump) => void
): Unsubscribe {
  const docPath = `users/${userId}/workspace/main`;
  const docRef = doc(firestoreDb, 'users', userId, 'workspace', 'main');

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
      handleFirestoreError(error, OperationType.GET, docPath);
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
    }
  );
}

// -------------------------------------------------------------
// UN-AUTHENTICATED / SHARED FALLBACK WORKSPACE
// -------------------------------------------------------------

export async function loadWorkspaceFromFirestore(): Promise<DatabaseDump | null> {
  const docPath = 'workspaces/main';
  try {
    setSyncStatus('syncing');
    const docRef = doc(firestoreDb, 'workspaces', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DatabaseDump;
      setSyncStatus('synced');
      return data;
    }
    setSyncStatus('connected');
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    setSyncStatus('error');
    return null;
  }
}

export function saveWorkspaceToFirestore(data: DatabaseDump): Promise<void> {
  const docPath = 'workspaces/main';
  return new Promise((resolve, reject) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    setSyncStatus('syncing');

    saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(firestoreDb, 'workspaces', 'main');
        const cleaned = sanitizeForFirestore({
          ...data,
          lastSyncedAt: new Date().toISOString(),
        });
        await setDoc(docRef, cleaned, { merge: true });
        setSyncStatus('synced');
        resolve();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
        setSyncStatus('error');
        reject(error);
      }
    }, 350);
  });
}

export function subscribeToFirestoreWorkspace(
  onUpdate: (data: DatabaseDump) => void
): Unsubscribe {
  const docPath = 'workspaces/main';
  const docRef = doc(firestoreDb, 'workspaces', 'main');

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
      handleFirestoreError(error, OperationType.GET, docPath);
      if (!navigator.onLine) {
        setSyncStatus('offline');
      } else {
        setSyncStatus('error');
      }
    }
  );
}
