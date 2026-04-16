import { useCallback, useSyncExternalStore } from 'react';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Task } from '../types';
import taskViewedStore from './taskViewedStore';

// Thin React wrapper around the shared task-viewed store. All state lives in
// the module-level store so every component that calls this hook re-renders
// when markViewed runs anywhere — fixes the stale sidebar badge problem.
// Core logic + tests live in ./taskViewedStore.ts.
//
// markViewed also writes arrayUnion to the user's member doc so viewed state
// propagates across devices (see useTaskViewedSync for the read side). The
// Firestore write is silent-fail — local state still updates instantly.

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
    if (!key || !circleId || !userId) return;
    // Update local store first so the UI responds instantly.
    taskViewedStore.addToSet(key, taskId);
    // Best-effort Firestore sync so other devices converge. Silent-fail —
    // local state already reflects the change.
    updateDoc(doc(db, 'circles', circleId, 'members', userId), {
      viewedTaskIds: arrayUnion(taskId),
    }).catch(() => { /* silent */ });
  }, [key, circleId, userId]);

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
