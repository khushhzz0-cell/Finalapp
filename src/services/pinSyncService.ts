import { DatabaseDump } from '../types';
import { storage } from '../db/storage';

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
  statusListeners.forEach(fn => {
    try {
      fn(status);
    } catch (e) {
      console.warn('Sync status listener error:', e);
    }
  });
}

/**
 * Clean 4-digit code
 */
export function cleanPin(pin: string): string {
  const digits = pin.replace(/\D/g, '').slice(0, 4);
  return digits.padStart(4, '0').slice(-4);
}

/**
 * Check backend server connectivity
 */
export async function testServerConnection(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      setSyncStatus('connected');
      return true;
    }
    setSyncStatus('offline');
    return false;
  } catch {
    setSyncStatus('offline');
    return false;
  }
}

export interface PinDetailedStatus {
  exists: boolean;
  pin: string;
  source: 'cloud' | 'local' | 'both' | 'none';
  projectsCount: number;
  routinesCount: number;
  habitsCount: number;
  lastSyncedAt: string | null;
}

/**
 * Read PIN from URL query or hash if provided (e.g. ?pin=9999 or #9999)
 */
export function getPinFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin') || params.get('code');
    if (pinParam) {
      const clean = pinParam.replace(/\D/g, '').slice(0, 4);
      if (clean.length === 4) return clean;
    }
    const hash = window.location.hash.replace(/\D/g, '').slice(0, 4);
    if (hash.length === 4) return hash;
  } catch {}
  return null;
}

/**
 * Fetch all existing PIN workspaces known by the server
 */
export async function fetchServerPins(): Promise<Array<{
  pin: string;
  projectsCount: number;
  routinesCount: number;
  habitsCount: number;
  lastSyncedAt: string | null;
}>> {
  try {
    const res = await fetch('/api/sync/pins', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.pins)) {
        // Register each into local storage known pins
        data.pins.forEach((p: any) => {
          if (p && p.pin) {
            storage.addKnownPin(p.pin);
          }
        });
        return data.pins;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Detailed existence check combining local cache and server backend
 */
export async function checkPinExistsDetailed(pin: string): Promise<PinDetailedStatus> {
  const code = cleanPin(pin);
  const localSummary = storage.getLocalPinSummary(code);
  const hasLocal = storage.hasLocalDataForPin(code);

  let cloudExists = false;
  let cloudStats: any = null;

  try {
    const res = await fetch(`/api/sync/${code}/check`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const json = await res.json();
      cloudExists = !!json.exists;
      cloudStats = json.stats;
    }
  } catch {
    cloudExists = false;
  }

  const exists = hasLocal || cloudExists;
  let source: 'cloud' | 'local' | 'both' | 'none' = 'none';
  if (hasLocal && cloudExists) source = 'both';
  else if (cloudExists) source = 'cloud';
  else if (hasLocal) source = 'local';

  const projectsCount = cloudStats?.projectsCount ?? localSummary?.projectsCount ?? 0;
  const routinesCount = cloudStats?.routinesCount ?? localSummary?.routinesCount ?? 0;
  const habitsCount = cloudStats?.habitsCount ?? localSummary?.habitsCount ?? 0;
  const lastSyncedAt = cloudStats?.lastSyncedAt ?? localSummary?.lastSaved ?? null;

  if (exists) {
    storage.addKnownPin(code);
  }

  return {
    exists,
    pin: code,
    source,
    projectsCount,
    routinesCount,
    habitsCount,
    lastSyncedAt,
  };
}

/**
 * Check whether a PIN workspace exists (in local cache or on cloud server)
 */
export async function checkPinExists(pin: string): Promise<boolean> {
  const code = cleanPin(pin);
  if (storage.hasLocalDataForPin(code)) {
    return true;
  }
  const detailed = await checkPinExistsDetailed(code);
  return detailed.exists;
}

/**
 * Load workspace by 4-digit code
 */
export async function loadPinWorkspace(pin: string): Promise<DatabaseDump | null> {
  const code = cleanPin(pin);
  try {
    setSyncStatus('syncing');
    const res = await fetch(`/api/sync/${code}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      setSyncStatus('connected');
      return null;
    }

    const payload = await res.json();
    if (payload && payload.exists && payload.data) {
      setSyncStatus('synced');
      storage.addKnownPin(code);
      return payload.data as DatabaseDump;
    }

    setSyncStatus('connected');
    return null;
  } catch (error) {
    console.warn(`Failed to fetch workspace for PIN ${code}:`, error);
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('error');
    }
    return null;
  }
}

// Unique tab session ID to prevent echo loops
export function getTabId(): string {
  if (typeof window === 'undefined') return 'server';
  if (!(window as any).__focusdo_tab_id) {
    (window as any).__focusdo_tab_id = 'tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
  }
  return (window as any).__focusdo_tab_id;
}

// Per-PIN pending save queues so switching PINs NEVER clobbers or destroys another PIN's pending writes
interface PendingPinEntry {
  pin: string;
  data: DatabaseDump;
  timer: any;
  resolvers: Array<() => void>;
  rejectors: Array<(err: any) => void>;
  inFlight: boolean;
}

const pinQueues = new Map<string, PendingPinEntry>();

async function executePinWrite(pin: string): Promise<void> {
  const entry = pinQueues.get(pin);
  if (!entry || entry.inFlight) return;

  entry.inFlight = true;
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }

  const data = entry.data;
  const resolvers = [...entry.resolvers];
  const rejectors = [...entry.rejectors];

  // Reset entry queue so subsequent incoming edits for this pin can queue freshly
  entry.resolvers = [];
  entry.rejectors = [];

  setSyncStatus('syncing');

  try {
    const tabId = getTabId();
    const payload: DatabaseDump = {
      ...data,
      ownerPin: pin,
      sourceTabId: tabId,
      lastSyncedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/sync/${pin}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tab-id': tabId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    // Register pin locally
    storage.addKnownPin(pin);

    // Broadcast to local tabs on the same browser for zero-delay synchronization
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(`focusdo_sync_${pin}`);
        channel.postMessage({
          type: 'update',
          pin,
          data: payload,
          sourceTabId: tabId,
        });
        channel.close();
      }
    } catch {}

    setSyncStatus('synced');
    resolvers.forEach(r => r());
  } catch (error) {
    console.warn(`Failed to save workspace for PIN ${pin}:`, error);
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('error');
    }
    rejectors.forEach(rej => rej(error));
  } finally {
    entry.inFlight = false;
    // If more items accumulated while in flight, re-flush
    if (entry.resolvers.length > 0) {
      executePinWrite(pin);
    } else {
      pinQueues.delete(pin);
    }
  }
}

/**
 * Flush any pending queued write for a specific PIN immediately
 */
export async function flushPinSave(pin: string): Promise<void> {
  const code = cleanPin(pin);
  const entry = pinQueues.get(code);
  if (entry) {
    await executePinWrite(code);
  }
}

/**
 * Flush all pending queued writes across all PINs immediately
 */
export async function flushAllPendingSaves(): Promise<void> {
  const pins = Array.from(pinQueues.keys());
  await Promise.all(pins.map(pin => executePinWrite(pin)));
}

/**
 * Save workspace by 4-digit code with per-PIN isolation and anti-collision guarantee
 */
export function savePinWorkspace(
  pin: string,
  data: DatabaseDump,
  immediate = false
): Promise<void> {
  const code = cleanPin(pin);

  return new Promise((resolve, reject) => {
    let entry = pinQueues.get(code);
    if (!entry) {
      entry = {
        pin: code,
        data,
        timer: null,
        resolvers: [],
        rejectors: [],
        inFlight: false,
      };
      pinQueues.set(code, entry);
    } else {
      entry.data = data;
    }

    entry.resolvers.push(resolve);
    entry.rejectors.push(reject);

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    if (immediate) {
      executePinWrite(code);
    } else {
      entry.timer = setTimeout(() => {
        if (entry) {
          entry.timer = null;
        }
        executePinWrite(code);
      }, 300);
    }
  });
}

/**
 * Real-time subscription to workspace for 4-digit code across tabs, browsers, and devices
 */
export function subscribeToPinWorkspace(
  pin: string,
  onUpdate: (data: DatabaseDump) => void
): () => void {
  const code = cleanPin(pin);
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let broadcastChannel: BroadcastChannel | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  const myTabId = getTabId();

  // 1. BroadcastChannel for instant local cross-tab sync
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel(`focusdo_sync_${code}`);
      broadcastChannel.onmessage = (event) => {
        if (isClosed) return;
        const msg = event.data;
        if (
          msg &&
          msg.type === 'update' &&
          msg.pin === code &&
          msg.data &&
          msg.sourceTabId !== myTabId &&
          msg.data?.sourceTabId !== myTabId
        ) {
          setSyncStatus('synced');
          onUpdate(msg.data);
        }
      };
    }
  } catch (err) {
    console.warn('BroadcastChannel not available:', err);
  }

  // 2. Server-Sent Events (SSE) for multi-device live sync
  const connectSSE = () => {
    if (isClosed) return;

    try {
      eventSource = new EventSource(`/api/sync/${code}/events`);

      eventSource.onopen = () => {
        if (isClosed) {
          eventSource?.close();
          return;
        }
        setSyncStatus('synced');
      };

      eventSource.onmessage = (event) => {
        if (isClosed) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.type === 'update' && msg.pin === code && msg.data) {
            // CRITICAL: Ignore self-echo! If this update originated from our own tab,
            // we already have the latest optimistic state. Applying it back causes
            // race conditions where recently checked items revert themselves!
            if (msg.sourceTabId === myTabId || msg.data?.sourceTabId === myTabId) {
              return;
            }
            setSyncStatus('synced');
            onUpdate(msg.data);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        if (isClosed) return;
        eventSource?.close();
        eventSource = null;

        // Auto reconnect after 4 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSSE();
          }, 4000);
        }
      };
    } catch (err) {
      console.warn('SSE connection error:', err);
    }
  };

  connectSSE();

  return () => {
    isClosed = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  };
}
