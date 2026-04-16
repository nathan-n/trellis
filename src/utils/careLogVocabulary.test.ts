/// <reference types="vitest/globals" />
import { Timestamp } from 'firebase/firestore';
import type { CareLog } from '../types';
import { Mood, SleepQuality } from '../constants';
import { tallyVocabulary } from './careLogVocabulary';

function makeLog(overrides: Partial<CareLog> = {}): CareLog {
  const ts = Timestamp.fromDate(new Date('2026-04-14T09:00:00'));
  return {
    id: 'log-1',
    authorUid: 'user-1',
    authorName: 'Alice',
    logDate: '2026-04-14',
    logTimestamp: ts,
    meals: [],
    hydration: [],
    mood: Mood.CALM,
    moodNotes: null,
    sleep: { quality: SleepQuality.FAIR, hoursSlept: null, notes: null },
    behaviors: [],
    activities: [],
    generalNotes: null,
    isShiftHandoff: false,
    shiftSummary: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  };
}

describe('tallyVocabulary', () => {
  it('returns empty array for empty input', () => {
    expect(tallyVocabulary([], 'behaviors')).toEqual([]);
    expect(tallyVocabulary([], 'activities')).toEqual([]);
  });

  it('sorts by frequency descending (most-used first)', () => {
    const logs = [
      makeLog({ behaviors: ['wandering'] }),
      makeLog({ behaviors: ['wandering'] }),
      makeLog({ behaviors: ['wandering'] }),
      makeLog({ behaviors: ['sundowning'] }),
      makeLog({ behaviors: ['sundowning'] }),
      makeLog({ behaviors: ['agitation'] }),
    ];
    expect(tallyVocabulary(logs, 'behaviors')).toEqual(['wandering', 'sundowning', 'agitation']);
  });

  it('uses alphabetical tiebreak when counts are equal (determinism)', () => {
    const logs = [
      makeLog({ behaviors: ['zebra'] }),
      makeLog({ behaviors: ['apple'] }),
      makeLog({ behaviors: ['mango'] }),
    ];
    expect(tallyVocabulary(logs, 'behaviors')).toEqual(['apple', 'mango', 'zebra']);
  });

  it('dedupes case-insensitively while preserving first-seen display casing', () => {
    // "Sundowning" seen first → kept as display. "sundowning" and
    // "SUNDOWNING" are counted toward the same entry.
    const logs = [
      makeLog({ behaviors: ['Sundowning'] }),
      makeLog({ behaviors: ['sundowning'] }),
      makeLog({ behaviors: ['SUNDOWNING'] }),
      makeLog({ behaviors: ['wandering'] }),
    ];
    const result = tallyVocabulary(logs, 'behaviors');
    expect(result[0]).toBe('Sundowning'); // 3 occurrences, most-used, first-seen casing
    expect(result[1]).toBe('wandering');
    expect(result).toHaveLength(2); // deduped to 2 entries, not 4
  });

  it('trims whitespace and drops empty strings', () => {
    const logs = [
      makeLog({ behaviors: ['  wandering  ', '', ' ', 'agitation'] }),
    ];
    const result = tallyVocabulary(logs, 'behaviors');
    expect(result).toEqual(['agitation', 'wandering']); // trimmed; alpha tiebreak
  });

  it('operates independently on behaviors vs activities', () => {
    const logs = [
      makeLog({ behaviors: ['wandering'], activities: ['walk', 'music'] }),
      makeLog({ activities: ['walk'] }),
    ];
    expect(tallyVocabulary(logs, 'behaviors')).toEqual(['wandering']);
    expect(tallyVocabulary(logs, 'activities')).toEqual(['walk', 'music']);
  });

  it('handles missing arrays gracefully', () => {
    const logs = [
      makeLog({ behaviors: undefined as unknown as string[] }),
      makeLog({ behaviors: ['valid'] }),
    ];
    expect(tallyVocabulary(logs, 'behaviors')).toEqual(['valid']);
  });
});
