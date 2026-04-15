import { useState, useCallback } from 'react';
import type { Task } from '../types';

function getStorageKey(circleId: string, userId: string): string {
  return `trellis_viewed_tasks_${circleId}_${userId}`;
}

function loadViewedSet(circleId: string | undefined, userId: string | undefined): Set<string> {
  if (!circleId || !userId) return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(circleId, userId));
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

export function useTaskViewed(circleId: string | undefined, userId: string | undefined) {
  const [viewedSet, setViewedSet] = useState<Set<string>>(() => loadViewedSet(circleId, userId));

  const markViewed = useCallback((taskId: string) => {
    if (!circleId || !userId) return;
    setViewedSet((prev) => {
      if (prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.add(taskId);
      try {
        localStorage.setItem(getStorageKey(circleId, userId), JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, [circleId, userId]);

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
