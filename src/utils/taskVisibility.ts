import type { Task } from '../types';
import type { CircleRole } from '../constants';

export function canUserSeeTask(
  task: Task,
  userId: string,
  role: CircleRole | null
): boolean {
  // Backward compat: tasks without visibility are circle-wide
  const visibility = task.visibility ?? 'circle';

  if (visibility === 'circle') return true;
  if (role === 'admin') return true;
  if (task.createdByUid === userId) return true;
  if (task.visibleToUids?.includes(userId)) return true;

  return false;
}

export function computeVisibleToUids(
  visibility: string,
  creatorUid: string,
  assigneeUids: string[],
  explicitUids: string[] = []
): string[] {
  if (visibility === 'circle') return [];
  const uids = new Set<string>([creatorUid, ...assigneeUids]);
  if (visibility === 'specific') {
    explicitUids.forEach((uid) => uids.add(uid));
  }
  return [...uids];
}
