/// <reference types="vitest/globals" />
import { canUserSeeTask, computeVisibleToUids } from './taskVisibility';
import type { Task } from '../types';
import { Timestamp } from 'firebase/firestore';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'todo',
    assigneeUids: [],
    visibility: 'circle',
    visibleToUids: [],
    dueDate: null,
    dueDateYYYYMM: null,
    location: null,
    resourceLinks: [],
    rationale: null,
    pointsOfContact: [],
    recurrence: null,
    createdByUid: 'creator-1',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    searchTerms: [],
    ...overrides,
  } as Task;
}

describe('canUserSeeTask', () => {
  describe('backward compatibility', () => {
    it('returns true when task has no visibility field (legacy)', () => {
      const task = makeTask();
      delete (task as unknown as Record<string, unknown>).visibility;
      expect(canUserSeeTask(task, 'any-user', 'readonly')).toBe(true);
    });
  });

  describe('circle visibility', () => {
    it('returns true for any member when visibility is circle', () => {
      expect(canUserSeeTask(makeTask({ visibility: 'circle' }), 'anyone', 'readonly')).toBe(true);
    });
  });

  describe('admin override', () => {
    it('returns true for admin regardless of visibility', () => {
      const task = makeTask({ visibility: 'private', createdByUid: 'other', visibleToUids: [] });
      expect(canUserSeeTask(task, 'admin-user', 'admin')).toBe(true);
    });
  });

  describe('creator access', () => {
    it('returns true when userId matches createdByUid', () => {
      const task = makeTask({ visibility: 'specific', createdByUid: 'user-1', visibleToUids: [] });
      expect(canUserSeeTask(task, 'user-1', 'readonly')).toBe(true);
    });
  });

  describe('explicit uid list', () => {
    it('returns true when userId is in visibleToUids', () => {
      const task = makeTask({ visibility: 'specific', createdByUid: 'other', visibleToUids: ['user-1', 'user-2'] });
      expect(canUserSeeTask(task, 'user-2', 'professional')).toBe(true);
    });
  });

  describe('default deny', () => {
    it('returns false when none of the conditions match', () => {
      const task = makeTask({ visibility: 'private', createdByUid: 'other', visibleToUids: ['other-2'] });
      expect(canUserSeeTask(task, 'excluded-user', 'professional')).toBe(false);
    });

    it('returns false for readonly user on private task they did not create', () => {
      const task = makeTask({ visibility: 'private', createdByUid: 'creator', visibleToUids: [] });
      expect(canUserSeeTask(task, 'readonly-user', 'readonly')).toBe(false);
    });
  });
});

describe('computeVisibleToUids', () => {
  it('returns empty array for circle visibility', () => {
    expect(computeVisibleToUids('circle', 'u1', ['u2'])).toEqual([]);
  });

  it('returns creator + assignees for private visibility', () => {
    const result = computeVisibleToUids('private', 'u1', ['u2', 'u3']);
    expect(result).toContain('u1');
    expect(result).toContain('u2');
    expect(result).toContain('u3');
    expect(result).toHaveLength(3);
  });

  it('returns union of creator + assignees + explicit for specific visibility', () => {
    const result = computeVisibleToUids('specific', 'u1', ['u2'], ['u3', 'u4']);
    expect(result).toContain('u1');
    expect(result).toContain('u2');
    expect(result).toContain('u3');
    expect(result).toContain('u4');
    expect(result).toHaveLength(4);
  });

  it('deduplicates when creator is also an assignee', () => {
    const result = computeVisibleToUids('private', 'u1', ['u1', 'u2']);
    expect(result).toHaveLength(2);
  });

  it('deduplicates when explicit overlaps with assignees', () => {
    const result = computeVisibleToUids('specific', 'u1', ['u2'], ['u2', 'u3']);
    expect(result).toHaveLength(3);
  });

  it('defaults explicitUids to empty array when omitted', () => {
    const result = computeVisibleToUids('specific', 'u1', ['u2']);
    expect(result).toContain('u1');
    expect(result).toContain('u2');
    expect(result).toHaveLength(2);
  });
});
