/// <reference types="vitest/globals" />
import { Timestamp } from 'firebase/firestore';
import type { CareLog } from '../types';
import { Mood, SleepQuality } from '../constants';
import { matchesFilters } from './careLogFilters';
import { emptyFilters, type CareLogFilters } from '../components/careLogs/CareLogFilterBar';

function makeLog(overrides: Partial<CareLog> & { mood?: Mood }): CareLog {
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

function f(overrides: Partial<CareLogFilters> = {}): CareLogFilters {
  return { ...emptyFilters, ...overrides };
}

describe('matchesFilters', () => {
  it('empty filters pass every log through', () => {
    expect(matchesFilters(makeLog({}), emptyFilters)).toBe(true);
  });

  // ─── Mood filter ──────────────────────────────────────────────────────

  it('mood filter: exact match passes', () => {
    expect(matchesFilters(makeLog({ mood: Mood.AGITATED }), f({ mood: Mood.AGITATED }))).toBe(true);
  });
  it('mood filter: mismatch rejects', () => {
    expect(matchesFilters(makeLog({ mood: Mood.CALM }), f({ mood: Mood.AGITATED }))).toBe(false);
  });

  // ─── Author filter ────────────────────────────────────────────────────

  it('author filter: uid match passes', () => {
    expect(matchesFilters(makeLog({ authorUid: 'alice' }), f({ authorUid: 'alice' }))).toBe(true);
  });
  it('author filter: uid mismatch rejects', () => {
    expect(matchesFilters(makeLog({ authorUid: 'alice' }), f({ authorUid: 'bob' }))).toBe(false);
  });

  // ─── Handoff filter ───────────────────────────────────────────────────

  it('handoffOnly rejects non-handoff logs', () => {
    expect(matchesFilters(makeLog({ isShiftHandoff: false }), f({ handoffOnly: true }))).toBe(false);
  });
  it('handoffOnly accepts handoff logs', () => {
    expect(matchesFilters(makeLog({ isShiftHandoff: true }), f({ handoffOnly: true }))).toBe(true);
  });
  it('handoffOnly=false accepts both handoff and non-handoff', () => {
    expect(matchesFilters(makeLog({ isShiftHandoff: false }), f({ handoffOnly: false }))).toBe(true);
    expect(matchesFilters(makeLog({ isShiftHandoff: true }), f({ handoffOnly: false }))).toBe(true);
  });

  // ─── Text filter: case insensitivity + multi-field ────────────────────

  it('text filter: case-insensitive substring match on generalNotes', () => {
    expect(matchesFilters(makeLog({ generalNotes: 'Had a Walk in the Park' }), f({ text: 'walk' }))).toBe(true);
    expect(matchesFilters(makeLog({ generalNotes: 'Had a Walk in the Park' }), f({ text: 'WALK' }))).toBe(true);
  });

  it('text filter: matches moodNotes', () => {
    expect(matchesFilters(makeLog({ moodNotes: 'seemed restless' }), f({ text: 'restless' }))).toBe(true);
  });

  it('text filter: matches shiftSummary', () => {
    expect(matchesFilters(makeLog({ shiftSummary: 'needs medication at 3pm' }), f({ text: 'medication' }))).toBe(true);
  });

  it('text filter: matches authorName', () => {
    expect(matchesFilters(makeLog({ authorName: 'Michelle' }), f({ text: 'michelle' }))).toBe(true);
  });

  it('text filter: matches behaviors array elements', () => {
    expect(matchesFilters(makeLog({ behaviors: ['wandering', 'sundowning'] }), f({ text: 'sundowning' }))).toBe(true);
  });

  it('text filter: matches activities array elements', () => {
    expect(matchesFilters(makeLog({ activities: ['walk', 'music'] }), f({ text: 'music' }))).toBe(true);
  });

  it('text filter: rejects log with no matching field', () => {
    expect(
      matchesFilters(
        makeLog({ generalNotes: 'quiet day', behaviors: ['calm'], activities: ['reading'] }),
        f({ text: 'agitated' })
      )
    ).toBe(false);
  });

  // ─── Combined filters (AND semantics) ─────────────────────────────────

  it('AND semantics: mood + author + text all must match', () => {
    const log = makeLog({
      mood: Mood.AGITATED,
      authorUid: 'alice',
      generalNotes: 'evening unrest',
    });
    // All three match → pass
    expect(matchesFilters(log, f({ mood: Mood.AGITATED, authorUid: 'alice', text: 'unrest' }))).toBe(true);
    // Wrong mood → fail
    expect(matchesFilters(log, f({ mood: Mood.CALM, authorUid: 'alice', text: 'unrest' }))).toBe(false);
    // Wrong author → fail
    expect(matchesFilters(log, f({ mood: Mood.AGITATED, authorUid: 'bob', text: 'unrest' }))).toBe(false);
    // Wrong text → fail
    expect(matchesFilters(log, f({ mood: Mood.AGITATED, authorUid: 'alice', text: 'nothing' }))).toBe(false);
  });

  it('handoff + text: must be handoff AND text must appear', () => {
    const log = makeLog({ isShiftHandoff: true, shiftSummary: 'check meds at 8pm' });
    expect(matchesFilters(log, f({ handoffOnly: true, text: 'meds' }))).toBe(true);
    expect(matchesFilters(log, f({ handoffOnly: true, text: 'missing' }))).toBe(false);
  });

  // ─── Null/undefined safety ────────────────────────────────────────────

  it('handles null notes without throwing when text filter is active', () => {
    const log = makeLog({
      generalNotes: null,
      moodNotes: null,
      shiftSummary: null,
    });
    // No searchable text remains, so a non-empty query should reject
    expect(matchesFilters(log, f({ text: 'anything' }))).toBe(false);
    // But an empty text filter still passes
    expect(matchesFilters(log, f({ text: '' }))).toBe(true);
  });
});
