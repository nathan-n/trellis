/// <reference types="vitest/globals" />
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import type { CareLog, MealEntry } from '../types';
import { Mood, SleepQuality, MealAmount } from '../constants';
import {
  goodDaysRate,
  sleepStats,
  mealCompletion,
  topBehavior,
  behaviorDayCount,
  percentDelta,
  safeDivide,
  todBucket,
  buildTimeOfDayMood,
  buildWeeklyMoodData,
  buildSleepData,
  dailyWorstWellness,
  perDayAverageSleep,
  worstMoodOfDay,
} from './careLogAggregates';

// ─── Test helpers ──────────────────────────────────────────────────────────

function tsAt(iso: string): Timestamp {
  return Timestamp.fromDate(new Date(iso));
}

function makeLog(overrides: Partial<CareLog> & { logDate: string; mood: Mood }): CareLog {
  const ts = overrides.logTimestamp ?? tsAt(`${overrides.logDate}T09:00:00`);
  return {
    id: overrides.id ?? `log-${Math.random().toString(36).slice(2, 8)}`,
    authorUid: 'user-1',
    authorName: 'Alice',
    logDate: overrides.logDate,
    logTimestamp: ts,
    meals: [],
    hydration: [],
    mood: overrides.mood,
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

function meal(amount: MealEntry['amount'], description = 'meal'): MealEntry {
  return { time: '09:00', description, amount };
}

// ─── safeDivide / percentDelta ─────────────────────────────────────────────

describe('safeDivide', () => {
  it('returns 0 when divisor is 0 (avoids NaN)', () => {
    expect(safeDivide(5, 0)).toBe(0);
  });
  it('returns percentage', () => {
    expect(safeDivide(1, 2)).toBe(50);
    expect(safeDivide(3, 4)).toBe(75);
  });
});

describe('percentDelta', () => {
  it('returns null when prior is 0 and current is non-zero (indeterminate)', () => {
    expect(percentDelta(5, 0)).toBeNull();
  });
  it('returns 0 when both are 0 (definitively no change)', () => {
    expect(percentDelta(0, 0)).toBe(0);
  });
  it('returns positive percent when current > prior', () => {
    expect(percentDelta(10, 8)).toBe(25);
  });
  it('returns negative percent when current < prior', () => {
    expect(percentDelta(8, 10)).toBe(-20);
  });
  it('returns 0 when values are equal', () => {
    expect(percentDelta(7.5, 7.5)).toBe(0);
  });
});

// ─── worstMoodOfDay ────────────────────────────────────────────────────────

describe('worstMoodOfDay', () => {
  it('returns null for empty input', () => {
    expect(worstMoodOfDay([])).toBeNull();
  });
  it('picks agitated over calm when both are present', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.AGITATED, id: 'b' }),
    ];
    expect(worstMoodOfDay(logs)?.mood).toBe('agitated');
  });
  it('picks confused over withdrawn over other over calm', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.WITHDRAWN, id: 'b' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CONFUSED, id: 'c' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.OTHER, id: 'd' }),
    ];
    expect(worstMoodOfDay(logs)?.mood).toBe('confused');
  });
});

// ─── goodDaysRate ──────────────────────────────────────────────────────────

describe('goodDaysRate', () => {
  it('returns 0 for empty logs', () => {
    expect(goodDaysRate([])).toBe(0);
  });

  it('counts a day as good when calm and no agitated', () => {
    const logs = [makeLog({ logDate: '2026-04-14', mood: Mood.CALM })];
    expect(goodDaysRate(logs)).toBe(100);
  });

  it('counts a day as NOT good when ANY log is agitated, even if others are calm', () => {
    // This is the multi-entry-per-day invariant: one agitation episode
    // flags the whole day, matching clinical intent.
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.HAPPY, id: 'b' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.AGITATED, id: 'c' }),
    ];
    expect(goodDaysRate(logs)).toBe(0);
  });

  it('does not double-count days with multiple good entries', () => {
    // 3 entries on 1 day, all happy → still 1 good day out of 1, = 100%
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.HAPPY, id: 'b' }),
      makeLog({ logDate: '2026-04-14', mood: Mood.HAPPY, id: 'c' }),
    ];
    expect(goodDaysRate(logs)).toBe(100);
  });

  it('produces fractional rates across days', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM }),
      makeLog({ logDate: '2026-04-15', mood: Mood.AGITATED }),
      makeLog({ logDate: '2026-04-16', mood: Mood.HAPPY }),
      makeLog({ logDate: '2026-04-17', mood: Mood.CONFUSED }), // not good, not bad → not counted
    ];
    // 2 good / 4 total = 50%
    expect(goodDaysRate(logs)).toBe(50);
  });
});

// ─── sleepStats & perDayAverageSleep ───────────────────────────────────────

describe('sleepStats', () => {
  it('returns 0/null for empty logs', () => {
    expect(sleepStats([])).toEqual({ avgHours: 0, dominantQuality: null });
  });

  it('aggregates multi-entry days per-day first, avoiding log-count bias', () => {
    // THIS IS THE REGRESSION-GUARD for the bias the user caught.
    // Day 1: 1 entry, 5h sleep
    // Day 2: 3 entries, each 8h sleep
    // Per-log avg would be (5+8+8+8)/4 = 7.25 (biased by over-logging)
    // Per-day avg should be (5+8)/2 = 6.5
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.FAIR, hoursSlept: 5, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.GOOD, hoursSlept: 8, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'c', sleep: { quality: SleepQuality.GOOD, hoursSlept: 8, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'd', sleep: { quality: SleepQuality.GOOD, hoursSlept: 8, notes: null } }),
    ];
    expect(sleepStats(logs).avgHours).toBe(6.5);
  });

  it('averages within a day when multiple entries that day have sleep values', () => {
    // Day 1: two entries, 6h + 8h. Day-mean = 7. Final avg = 7.
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.FAIR, hoursSlept: 6, notes: null } }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.FAIR, hoursSlept: 8, notes: null } }),
    ];
    expect(sleepStats(logs).avgHours).toBe(7);
  });

  it('ignores entries with null/zero sleep hours', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.FAIR, hoursSlept: 7, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.FAIR, hoursSlept: null, notes: null } }),
      makeLog({ logDate: '2026-04-16', mood: Mood.CALM, id: 'c', sleep: { quality: SleepQuality.FAIR, hoursSlept: 0, notes: null } }),
    ];
    expect(sleepStats(logs).avgHours).toBe(7);
  });

  it('tallies dominant quality once per day (not per entry)', () => {
    // Day A = good (3 entries), Day B = poor (1 entry), Day C = poor (1 entry).
    // Per-log bias would say "good" dominates (3 > 2).
    // Per-day correct answer is "poor" (2 days > 1 day).
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.GOOD, hoursSlept: null, notes: null } }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.GOOD, hoursSlept: null, notes: null } }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'c', sleep: { quality: SleepQuality.GOOD, hoursSlept: null, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'd', sleep: { quality: SleepQuality.POOR, hoursSlept: null, notes: null } }),
      makeLog({ logDate: '2026-04-16', mood: Mood.CALM, id: 'e', sleep: { quality: SleepQuality.POOR, hoursSlept: null, notes: null } }),
    ];
    expect(sleepStats(logs).dominantQuality).toBe(SleepQuality.POOR);
  });
});

describe('perDayAverageSleep', () => {
  it('matches sleepStats().avgHours for the same multi-entry regression case', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.FAIR, hoursSlept: 5, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.GOOD, hoursSlept: 8, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'c', sleep: { quality: SleepQuality.GOOD, hoursSlept: 8, notes: null } }),
    ];
    expect(perDayAverageSleep(logs)).toBe(6.5);
  });

  it('returns 0 when no sleep data is present', () => {
    expect(perDayAverageSleep([])).toBe(0);
  });
});

// ─── mealCompletion ────────────────────────────────────────────────────────

describe('mealCompletion', () => {
  it('returns 0 when no meals logged', () => {
    const logs = [makeLog({ logDate: '2026-04-14', mood: Mood.CALM })];
    expect(mealCompletion(logs)).toBe(0);
  });

  it('counts full and partial as completed, refused as not', () => {
    const logs = [
      makeLog({
        logDate: '2026-04-14',
        mood: Mood.CALM,
        meals: [meal(MealAmount.FULL), meal(MealAmount.PARTIAL), meal(MealAmount.REFUSED)],
      }),
    ];
    // 2 of 3 non-refused → 66.67%
    expect(mealCompletion(logs)).toBeCloseTo(66.67, 1);
  });

  it('sums across logs (each meal is discrete)', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', meals: [meal(MealAmount.FULL)] }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', meals: [meal(MealAmount.REFUSED)] }),
    ];
    expect(mealCompletion(logs)).toBe(50);
  });
});

// ─── topBehavior / behaviorDayCount ────────────────────────────────────────

describe('topBehavior', () => {
  it('returns null name and 0 for empty logs', () => {
    expect(topBehavior([])).toEqual({ name: null, dayCount: 0 });
  });

  it('counts distinct days, not total mentions (the semantic fix)', () => {
    // This is the REGRESSION-GUARD for the user-caught behavior-count bug.
    // "wandering" mentioned 3x on one day should NOT beat
    // "agitation" mentioned 1x across 3 different days.
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', behaviors: ['wandering'] }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', behaviors: ['wandering'] }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'c', behaviors: ['wandering'] }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'd', behaviors: ['agitation'] }),
      makeLog({ logDate: '2026-04-16', mood: Mood.CALM, id: 'e', behaviors: ['agitation'] }),
      makeLog({ logDate: '2026-04-17', mood: Mood.CALM, id: 'f', behaviors: ['agitation'] }),
    ];
    expect(topBehavior(logs)).toEqual({ name: 'agitation', dayCount: 3 });
  });

  it('a behavior appearing twice on the same day counts as 1 day', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', behaviors: ['sundowning', 'wandering'] }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', behaviors: ['sundowning'] }),
    ];
    expect(topBehavior(logs).dayCount).toBe(1);
  });
});

describe('behaviorDayCount', () => {
  it('counts distinct days where the named behavior appears', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', behaviors: ['wandering', 'sundowning'] }),
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'b', behaviors: ['wandering'] }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'c', behaviors: ['wandering'] }),
      makeLog({ logDate: '2026-04-16', mood: Mood.CALM, id: 'd', behaviors: ['sundowning'] }),
    ];
    expect(behaviorDayCount(logs, 'wandering')).toBe(2);
    expect(behaviorDayCount(logs, 'sundowning')).toBe(2);
    expect(behaviorDayCount(logs, 'never-appeared')).toBe(0);
  });
});

// ─── todBucket boundaries ──────────────────────────────────────────────────

describe('todBucket', () => {
  it('maps boundary hours correctly', () => {
    expect(todBucket(4)).toBe('Night');
    expect(todBucket(5)).toBe('Morning');
    expect(todBucket(11)).toBe('Morning');
    expect(todBucket(12)).toBe('Afternoon');
    expect(todBucket(16)).toBe('Afternoon');
    expect(todBucket(17)).toBe('Evening');
    expect(todBucket(20)).toBe('Evening');
    expect(todBucket(21)).toBe('Night');
    expect(todBucket(23)).toBe('Night');
    expect(todBucket(0)).toBe('Night');
  });
});

// ─── buildTimeOfDayMood ────────────────────────────────────────────────────

describe('buildTimeOfDayMood', () => {
  it('always returns all four buckets in canonical order', () => {
    const result = buildTimeOfDayMood([]);
    expect(result.map((r) => r.bucket)).toEqual(['Morning', 'Afternoon', 'Evening', 'Night']);
  });

  it('buckets logs by their logTimestamp hour', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, logTimestamp: tsAt('2026-04-14T08:00:00') }),
      makeLog({ logDate: '2026-04-14', mood: Mood.AGITATED, logTimestamp: tsAt('2026-04-14T18:00:00') }),
      makeLog({ logDate: '2026-04-14', mood: Mood.AGITATED, logTimestamp: tsAt('2026-04-14T19:30:00') }),
    ];
    const result = buildTimeOfDayMood(logs);
    const morning = result.find((r) => r.bucket === 'Morning')!;
    const evening = result.find((r) => r.bucket === 'Evening')!;
    expect(morning.calm).toBe(1);
    expect(evening.agitated).toBe(2);
  });
});

// ─── buildWeeklyMoodData (per-day dominant) ────────────────────────────────

describe('buildWeeklyMoodData', () => {
  it('each day contributes exactly one data point (worst mood wins)', () => {
    // Day with 3 entries: 2 calm + 1 agitated. Per-log counting would put
    // 2 in calm and 1 in agitated (total 3 for the week). Correct answer:
    // 1 in agitated (worst mood that day, 1 data point for that day).
    const logs = [
      makeLog({ logDate: '2026-04-13', mood: Mood.CALM, id: 'a' }), // Monday
      makeLog({ logDate: '2026-04-13', mood: Mood.CALM, id: 'b' }),
      makeLog({ logDate: '2026-04-13', mood: Mood.AGITATED, id: 'c' }),
    ];
    const start = dayjs('2026-04-13');
    const end = dayjs('2026-04-19');
    const weeks = buildWeeklyMoodData(logs, start, end);
    expect(weeks.length).toBeGreaterThanOrEqual(1);
    const total = weeks.reduce(
      (s, w) => s + w.calm + w.happy + w.confused + w.withdrawn + w.agitated + w.other,
      0
    );
    expect(total).toBe(1); // one day, one segment
    const agitatedCount = weeks.reduce((s, w) => s + w.agitated, 0);
    expect(agitatedCount).toBe(1);
  });

  it('produces one bucket per week in range', () => {
    const logs: CareLog[] = [];
    const weeks = buildWeeklyMoodData(logs, dayjs('2026-04-01'), dayjs('2026-04-28'));
    expect(weeks.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── buildSleepData ────────────────────────────────────────────────────────

describe('buildSleepData', () => {
  it('produces one row per day inclusive of both endpoints', () => {
    const out = buildSleepData([], dayjs('2026-04-14'), dayjs('2026-04-16'));
    expect(out).toHaveLength(3);
    expect(out[0].date).toBe('2026-04-14');
    expect(out[2].date).toBe('2026-04-16');
  });

  it('null hours for days with no entries', () => {
    const logs = [
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, sleep: { quality: SleepQuality.FAIR, hoursSlept: 7, notes: null } }),
    ];
    const out = buildSleepData(logs, dayjs('2026-04-14'), dayjs('2026-04-16'));
    expect(out[0].hours).toBeNull();
    expect(out[1].hours).toBe(7);
    expect(out[2].hours).toBeNull();
  });

  it('rolling avg uses only the days with data in the trailing 7-day window', () => {
    const logs = [
      makeLog({ logDate: '2026-04-14', mood: Mood.CALM, id: 'a', sleep: { quality: SleepQuality.FAIR, hoursSlept: 6, notes: null } }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM, id: 'b', sleep: { quality: SleepQuality.FAIR, hoursSlept: 8, notes: null } }),
    ];
    const out = buildSleepData(logs, dayjs('2026-04-14'), dayjs('2026-04-16'));
    expect(out[0].rolling).toBe(6);   // day 1: avg of [6]
    expect(out[1].rolling).toBe(7);   // day 2: avg of [6, 8]
    expect(out[2].rolling).toBe(7);   // day 3: no new data, rolling still avg of [6, 8]
  });
});

// ─── dailyWorstWellness ────────────────────────────────────────────────────

describe('dailyWorstWellness', () => {
  it('produces N numbers oldest→newest with NaN for empty days', () => {
    const today = dayjs('2026-04-16');
    const logs = [
      makeLog({ logDate: '2026-04-15', mood: Mood.AGITATED }),
      makeLog({ logDate: '2026-04-15', mood: Mood.CALM }),
      makeLog({ logDate: '2026-04-16', mood: Mood.HAPPY }),
    ];
    const series = dailyWorstWellness(logs, 3, today);
    expect(series).toHaveLength(3);
    expect(Number.isNaN(series[0])).toBe(true); // 2026-04-14 has no entries
    expect(series[1]).toBe(1);  // 2026-04-15: worst is agitated → wellness 1
    expect(series[2]).toBe(5);  // 2026-04-16: only happy → 5
  });
});
