/// <reference types="vitest/globals" />
import { createTaskViewedStore, isTaskViewedKey, type StorageLike } from './taskViewedStore';

// In-memory Map-backed storage mock — mirrors the parts of localStorage the
// store actually uses (getItem/setItem).
function makeMockStorage(initial: Record<string, string> = {}): StorageLike & { inspect: () => Record<string, string> } {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    inspect: () => Object.fromEntries(data),
  };
}

describe('isTaskViewedKey', () => {
  it('identifies our prefixed keys', () => {
    expect(isTaskViewedKey('trellis_viewed_tasks_c1_u1')).toBe(true);
  });
  it('rejects unrelated keys', () => {
    expect(isTaskViewedKey('some_other_key')).toBe(false);
    expect(isTaskViewedKey('')).toBe(false);
    expect(isTaskViewedKey(null)).toBe(false);
    expect(isTaskViewedKey(undefined)).toBe(false);
  });
});

describe('createTaskViewedStore.getStorageKey', () => {
  it('namespaces by circle and user', () => {
    const store = createTaskViewedStore(makeMockStorage());
    expect(store.getStorageKey('circle-A', 'user-1')).toBe('trellis_viewed_tasks_circle-A_user-1');
    expect(store.getStorageKey('circle-A', 'user-2')).not.toBe(store.getStorageKey('circle-A', 'user-1'));
  });
});

describe('createTaskViewedStore.getSet', () => {
  it('returns an empty Set for a never-seen key', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const k = store.getStorageKey('c', 'u');
    expect(store.getSet(k).size).toBe(0);
  });

  it('seeds the Set from storage on first access', () => {
    const key = 'trellis_viewed_tasks_c_u';
    const storage = makeMockStorage({ [key]: JSON.stringify(['t1', 't2']) });
    const store = createTaskViewedStore(storage);
    const set = store.getSet(key);
    expect(set.has('t1')).toBe(true);
    expect(set.has('t2')).toBe(true);
  });

  it('tolerates malformed JSON (returns empty Set)', () => {
    const key = 'trellis_viewed_tasks_c_u';
    const storage = makeMockStorage({ [key]: '{{ not json }}' });
    const store = createTaskViewedStore(storage);
    expect(store.getSet(key).size).toBe(0);
  });
});

describe('createTaskViewedStore.addToSet', () => {
  it('adds a task id, persists to storage, and notifies subscribers', () => {
    const storage = makeMockStorage();
    const store = createTaskViewedStore(storage);
    const key = store.getStorageKey('c', 'u');

    let notified = 0;
    store.subscribe(key, () => { notified += 1; });

    store.addToSet(key, 'task-1');

    expect(store.getSet(key).has('task-1')).toBe(true);
    expect(notified).toBe(1);
    // Persisted as JSON array
    expect(JSON.parse(storage.inspect()[key])).toEqual(['task-1']);
  });

  it('is idempotent — adding the same id twice does not re-notify', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const key = store.getStorageKey('c', 'u');
    let notified = 0;
    store.subscribe(key, () => { notified += 1; });

    store.addToSet(key, 'task-1');
    store.addToSet(key, 'task-1');

    expect(notified).toBe(1);
    expect(store.getSet(key).size).toBe(1);
  });

  it('does not notify subscribers for OTHER keys', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const keyA = store.getStorageKey('circleA', 'user');
    const keyB = store.getStorageKey('circleB', 'user');

    let aNotified = 0;
    let bNotified = 0;
    store.subscribe(keyA, () => { aNotified += 1; });
    store.subscribe(keyB, () => { bNotified += 1; });

    store.addToSet(keyA, 'task-in-A');

    expect(aNotified).toBe(1);
    expect(bNotified).toBe(0);
  });
});

describe('createTaskViewedStore.subscribe', () => {
  it('multiple subscribers to the same key all receive notifications (the Sidebar/TaskDetailPage sync invariant)', () => {
    // THIS IS THE REGRESSION-GUARD for the original bug: Sidebar and
    // TaskDetailPage both use useTaskViewed; marking viewed in one must
    // update the other without a page refresh.
    const store = createTaskViewedStore(makeMockStorage());
    const key = store.getStorageKey('c', 'u');

    let sidebarRenders = 0;
    let taskPageRenders = 0;
    store.subscribe(key, () => { sidebarRenders += 1; });
    store.subscribe(key, () => { taskPageRenders += 1; });

    store.addToSet(key, 'task-42');

    expect(sidebarRenders).toBe(1);
    expect(taskPageRenders).toBe(1);
  });

  it('returns an unsubscribe function that stops future notifications', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const key = store.getStorageKey('c', 'u');

    let notified = 0;
    const unsub = store.subscribe(key, () => { notified += 1; });

    store.addToSet(key, 'task-1');
    expect(notified).toBe(1);

    unsub();
    store.addToSet(key, 'task-2');
    expect(notified).toBe(1); // no additional notification after unsub
  });
});

describe('createTaskViewedStore.refresh (cross-tab sync)', () => {
  it('updates the cache with fresh data and notifies subscribers', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const key = store.getStorageKey('c', 'u');
    let notified = 0;
    store.subscribe(key, () => { notified += 1; });

    // Simulate another tab having added task-9 and task-10
    store.refresh(key, JSON.stringify(['task-9', 'task-10']));

    expect(store.getSet(key).has('task-9')).toBe(true);
    expect(store.getSet(key).has('task-10')).toBe(true);
    expect(notified).toBe(1);
  });

  it('treats null newValue as an emptied Set', () => {
    const store = createTaskViewedStore(makeMockStorage({
      'trellis_viewed_tasks_c_u': JSON.stringify(['old']),
    }));
    const key = 'trellis_viewed_tasks_c_u';
    // Prime the cache
    expect(store.getSet(key).has('old')).toBe(true);

    store.refresh(key, null);
    expect(store.getSet(key).size).toBe(0);
  });

  it('tolerates malformed JSON without throwing', () => {
    const store = createTaskViewedStore(makeMockStorage());
    const key = store.getStorageKey('c', 'u');
    // Should not throw
    expect(() => store.refresh(key, '{ not json')).not.toThrow();
  });
});

describe('createTaskViewedStore.isolation', () => {
  it('two store instances do not share state (factory really is isolating)', () => {
    const a = createTaskViewedStore(makeMockStorage());
    const b = createTaskViewedStore(makeMockStorage());
    const key = a.getStorageKey('c', 'u');

    a.addToSet(key, 'task-1');

    expect(a.getSet(key).has('task-1')).toBe(true);
    expect(b.getSet(key).has('task-1')).toBe(false);
  });
});
