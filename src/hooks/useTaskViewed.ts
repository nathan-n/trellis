import { useCallback, useSyncExternalStore } from 'react';
import type { Task } from '../types';
import taskViewedStore from './taskViewedStore';

// Thin React wrapper around the shared task-viewed store. All state lives in
// the module-level store so every component that calls this hook re-renders
// when markViewed runs anywhere — fixes the stale sidebar badge problem.
// Core logic + tests live in ./taskViewedStore.ts.

const EMPTY_SET: Set<string> = new Set();

export function useTaskViewed(circleId: string | undefined, userId: string | undefined) {
  const key = circleId && userId ? taskViewedStore.getStorageKey(circleId, userId) : null;

  const sub = useCallback(
    (listener: () => void) => (key ? taskViewedStore.subscribe(key, listener) : () => {}),
    [key]
  );
  const getSnapshot = useCallback(
    () => (key ? taskViewedStore.getSet(key) : EMPTY_SET),
    [key]
  );

  const viewedSet = useSyncExternalStore(sub, getSnapshot, getSnapshot);

  const markViewed = useCallback((taskId: string) => {
    if (!key) return;
    taskViewedStore.addToSet(key, taskId);
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
