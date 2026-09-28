import { DatabaseDump } from '../types';

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

/**
 * Check whether a PIN workspace already exists on server
 */
export async function checkPinExists(pin: string): Promise<boolean> {
  const code = cleanPin(pin);
  try {
    const res = await fetch(`/api/sync/${code}/check`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return !!json.exists;
    }
    return false;
  } catch {
    return false;
  }
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

    const payload = await res.json();
    if (payload && payload.exists && payload.data) {
      setSyncStatus('synced');
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

let saveDebounceTimer: NodeJS.Timeout | null = null;
let pendingResolvers: Array<() => void> = [];
let pendingRejectors: Array<(err: any) => void> = [];
let pendingSaveDump: DatabaseDump | null = null;
let pendingSavePin: string | null = null;
let isSaveInFlight = false;

async function flushSaveQueue(): Promise<void> {
  if (isSaveInFlight || !pendingSaveDump || !pendingSavePin) {
    return;
  }

  isSaveInFlight = true;
  const code = pendingSavePin;
  const data = pendingSaveDump;
  const resolvers = [...pendingResolvers];
  const rejectors = [...pendingRejectors];

  // Reset queue before calling so new incoming saves can queue up
  pendingSaveDump = null;
  pendingSavePin = null;
  pendingResolvers = [];
  pendingRejectors = [];

  setSyncStatus('syncing');

  try {
    const tabId = getTabId();
    const payload: DatabaseDump = {
      ...data,
      ownerPin: code,
      sourceTabId: tabId,
      lastSyncedAt: new Date().toISOString(),
    };

    const res = await fetch(`/api/sync/${code}`, {
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

    // Broadcast to local tabs on the same browser for zero-delay synchronization
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(`focusdo_sync_${code}`);
        channel.postMessage({
          type: 'update',
          pin: code,
          data: payload,
          sourceTabId: tabId,
        });
        channel.close();
      }
    } catch {}

    setSyncStatus('synced');
    resolvers.forEach(r => r());
  } catch (error) {
    console.warn(`Failed to save workspace for PIN ${code}:`, error);
    if (!navigator.onLine) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('error');
    }
    rejectors.forEach(rej => rej(error));
  } finally {
    isSaveInFlight = false;
    // If a new save was queued while this one was in flight, flush it now
    if (pendingSaveDump && pendingSavePin) {
      flushSaveQueue();
    }
  }
}

/**
 * Save workspace by 4-digit code with robust debouncing & anti-collision queue
 */
export function savePinWorkspace(
  pin: string,
  data: DatabaseDump,
  immediate = false
): Promise<void> {
  const code = cleanPin(pin);

  return new Promise((resolve, reject) => {
    pendingSavePin = code;
    pendingSaveDump = data;
    pendingResolvers.push(resolve);
    pendingRejectors.push(reject);

    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }

    if (immediate) {
      flushSaveQueue();
    } else {
      saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        flushSaveQueue();
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
