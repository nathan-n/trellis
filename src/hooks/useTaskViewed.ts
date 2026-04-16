import { useCallback, useSyncExternalStore } from 'react';
import type { Task } from '../types';

// Module-level shared store so all components calling useTaskViewed
// stay in sync when any of them calls markViewed. Without this, each
// hook instance has its own useState and the Sidebar badge would not
// update until a full page refresh re-seeded state from localStorage.

type Listener = () => void;

function getStorageKey(circleId: string, userId: string): string {
  return `trellis_viewed_tasks_${circleId}_${userId}`;
}

const cache = new Map<string, Set<string>>();
const listeners = new Map<string, Set<Listener>>();
const EMPTY_SET: Set<string> = new Set();

function loadFromStorage(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
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

function subscribe(key: string, listener: Listener): () => void {
  let subs = listeners.get(key);
  if (!subs) {
    subs = new Set();
    listeners.set(key, subs);
  }
  subs.add(listener);
  return () => {
    subs!.delete(listener);
    if (subs!.size === 0) listeners.delete(key);
  };
}

function addToSet(key: string, taskId: string) {
  const current = getSet(key);
  if (current.has(taskId)) return;
  const next = new Set(current);
  next.add(taskId);
  cache.set(key, next);
  try {
    localStorage.setItem(key, JSON.stringify([...next]));
  } catch { /* ignore */ }
  notify(key);
}

// Sync across browser tabs: when another tab writes to localStorage,
// refresh our cache and notify subscribers.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith('trellis_viewed_tasks_')) return;
    try {
      const parsed = e.newValue ? new Set<string>(JSON.parse(e.newValue)) : new Set<string>();
      cache.set(e.key, parsed);
      notify(e.key);
    } catch { /* ignore */ }
  });
}

export function useTaskViewed(circleId: string | undefined, userId: string | undefined) {
  const key = circleId && userId ? getStorageKey(circleId, userId) : null;

  const sub = useCallback(
    (listener: Listener) => (key ? subscribe(key, listener) : () => {}),
    [key]
  );
  const getSnapshot = useCallback(
    () => (key ? getSet(key) : EMPTY_SET),
    [key]
  );

  const viewedSet = useSyncExternalStore(sub, getSnapshot, getSnapshot);

  const markViewed = useCallback((taskId: string) => {
    if (!key) return;
    addToSet(key, taskId);
  }, [key]);

  const isTaskUnseen = useCallback((task: Task): boolean => {
    if (!userId) return false;
    if (task.createdByUid === userId) return false;
    return !viewedSet.has(task.id);
  }, [userId, viewedSet]);

  const getUnseenCount = useCallback((tasks: Task[]): number => {
    if (!userId) return 0;
    return tasks.filter((t) => t.createdByUid !== userId && !viewedSet.has(t.id)).length;
  }, [userId, viewedSet]);

  return { isTaskUnseen, markViewed, getUnseenCount };
}
