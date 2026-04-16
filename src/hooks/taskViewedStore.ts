// Shared task-viewed store. Keeps per-(circleId, userId) Sets of viewed task
// IDs in memory with localStorage persistence, and notifies subscribers when
// a change happens in any component — so the Sidebar badge updates reactively
// when TaskDetailPage calls markViewed.
//
// Factored as a factory (createTaskViewedStore) to make the core logic pure
// and easily testable with a mock storage. The default singleton wires to
// window.localStorage and the browser storage event for cross-tab sync.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TaskViewedStore {
  getStorageKey(circleId: string, userId: string): string;
  /** Read the Set for a key, loading from storage on first access. */
  getSet(key: string): Set<string>;
  /** Subscribe to changes for a key. Returns an unsubscribe function. */
  subscribe(key: string, listener: () => void): () => void;
  /** Add a task ID to the Set, persist, and notify subscribers. Idempotent. */
  addToSet(key: string, taskId: string): void;
  /**
   * Update the cached Set from an external source (e.g., a `storage` event
   * from another tab) and notify subscribers. newValue=null treats the key
   * as empty.
   */
  refresh(key: string, newValue: string | null): void;
  /**
   * Merge remote IDs into the local Set WITHOUT replacing existing local
   * writes. Used by the Firestore sync hook so that unsynced local marks
   * are preserved while new IDs from other devices are surfaced. If all
   * remoteIds are already present locally (subset), this is a no-op — no
   * notify, no localStorage write.
   */
  setRemoteState(key: string, remoteIds: string[]): void;
}

const STORAGE_KEY_PREFIX = 'trellis_viewed_tasks_';

/** True when `key` is one of ours (used by the storage-event handler). */
export function isTaskViewedKey(key: string | null | undefined): boolean {
  return Boolean(key && key.startsWith(STORAGE_KEY_PREFIX));
}

export function createTaskViewedStore(storage: StorageLike): TaskViewedStore {
  const cache = new Map<string, Set<string>>();
  const listeners = new Map<string, Set<() => void>>();

  function getStorageKey(circleId: string, userId: string): string {
    return `${STORAGE_KEY_PREFIX}${circleId}_${userId}`;
  }

  function loadFromStorage(key: string): Set<string> {
    try {
      const raw = storage.getItem(key);
      if (raw) return new Set(JSON.parse(raw));
    } catch { /* ignore parse errors */ }
    return new Set();
  }

  function getSet(key: string): Set<string> {
    let set = cache.get(key);
    if (!set) {
      set = loadFromStorage(key);
      cache.set(key, set);
    }
    return set;
  }

  function notify(key: string) {
    const subs = listeners.get(key);
    if (!subs) return;
    subs.forEach((l) => l());
  }

  function subscribe(key: string, listener: () => void): () => void {
    let subs = listeners.get(key);
    if (!subs) {
      subs = new Set();
      listeners.set(key, subs);
    }
    subs.add(listener);
    return () => {
      const current = listeners.get(key);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) listeners.delete(key);
    };
  }

  function addToSet(key: string, taskId: string) {
    const current = getSet(key);
    if (current.has(taskId)) return;
    const next = new Set(current);
    next.add(taskId);
    cache.set(key, next);
    try {
      storage.setItem(key, JSON.stringify([...next]));
    } catch { /* ignore storage errors */ }
    notify(key);
  }

  function refresh(key: string, newValue: string | null) {
    try {
      const parsed = newValue ? new Set<string>(JSON.parse(newValue)) : new Set<string>();
      cache.set(key, parsed);
      notify(key);
    } catch { /* ignore parse errors */ }
  }

  function setRemoteState(key: string, remoteIds: string[]) {
    const current = getSet(key);
    // No-op fast path: all remoteIds are already local.
    let hasNew = false;
    for (const id of remoteIds) {
      if (!current.has(id)) { hasNew = true; break; }
    }
    if (!hasNew) return;
    // Merge: union of current (local) + remote. Never delete local items.
    const next = new Set(current);
    for (const id of remoteIds) next.add(id);
    cache.set(key, next);
    try {
      storage.setItem(key, JSON.stringify([...next]));
    } catch { /* ignore */ }
    notify(key);
  }

  return { getStorageKey, getSet, subscribe, addToSet, refresh, setRemoteState };
}

// ─── Default singleton ─────────────────────────────────────────────────────

const noopStorage: StorageLike = {
  getItem: () => null,
  setItem: () => { /* no-op */ },
};

const defaultStore: TaskViewedStore =
  typeof window !== 'undefined' && window.localStorage
    ? createTaskViewedStore(window.localStorage)
    : createTaskViewedStore(noopStorage);

// Sync across browser tabs: when another tab writes to localStorage,
// refresh our cache and notify subscribers.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (!isTaskViewedKey(e.key)) return;
    defaultStore.refresh(e.key as string, e.newValue);
  });
}

export default defaultStore;
