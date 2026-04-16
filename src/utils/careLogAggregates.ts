import dayjs, { type Dayjs } from 'dayjs';
import { Mood } from '../constants';
import type { CareLog } from '../types';

// ─── Shared severity ordering ──────────────────────────────────────────────
// Used to pick the "worst" mood when a day has multiple entries.
// Matches the heatmap + weekly distribution semantics: higher = more concerning.
export const moodSeverity: Record<Mood, number> = {
  agitated: 5,
  confused: 4,
  withdrawn: 3,
  other: 2,
  calm: 1,
  happy: 1,
};

/** Given logs for a single day, return the entry with the worst mood. */
export function worstMoodOfDay<T extends { mood: Mood }>(dayLogs: T[]): T | null {
  if (dayLogs.length === 0) return null;
  return dayLogs.reduce((acc, cur) =>
    moodSeverity[cur.mood] > moodSeverity[acc.mood] ? cur : acc
  );
}

/** Group an array of CareLogs by their logDate (YYYY-MM-DD). */
export function groupByDate(logs: CareLog[]): Map<string, CareLog[]> {
  const byDate = new Map<string, CareLog[]>();
  for (const log of logs) {
    const arr = byDate.get(log.logDate) ?? [];
    arr.push(log);
    byDate.set(log.logDate, arr);
  }
  return byDate;
}

// ─── Simple numeric helpers ────────────────────────────────────────────────

export function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : (a / b) * 100;
}

/**
 * Percent change from prior to current. Returns null when the prior window
 * was zero and current isn't (undefined delta), 0 when both are zero, and
 * a finite % otherwise.
 */
export function percentDelta(current: number, prior: number): number | null {
  if (prior === 0) {
    if (current === 0) return 0;
    return null;
  }
  return ((current - prior) / prior) * 100;
}

// ─── Core aggregators ──────────────────────────────────────────────────────

/**
 * Percentage of days in the log set where any entry was calm/happy AND no
 * entry was agitated. Multi-entry days are collapsed via day grouping first,
 * so prolific loggers don't skew the result.
 */
export function goodDaysRate(logs: CareLog[]): number {
  if (logs.length === 0) return 0;
  const byDate = groupByDate(logs);
  let good = 0;
  for (const [, dayLogs] of byDate) {
    const hasGood = dayLogs.some((l) => l.mood === 'calm' || l.mood === 'happy');
    const hasBad = dayLogs.some((l) => l.mood === 'agitated');
    if (hasGood && !hasBad) good += 1;
  }
  return safeDivide(good, byDate.size);
}

/**
 * Average sleep hours + dominant sleep quality. Aggregates per-day first
 * (mean of same-day hours; first recorded quality) so over-logged days don't
 * inflate the average.
 */
export function sleepStats(logs: CareLog[]): { avgHours: number; dominantQuality: string | null } {
  const hoursByDay = new Map<string, number[]>();
  const qualityByDay = new Map<string, string[]>();
  for (const l of logs) {
    const h = l.sleep?.hoursSlept;
    if (typeof h === 'number' && h > 0) {
      const arr = hoursByDay.get(l.logDate) ?? [];
      arr.push(h);
      hoursByDay.set(l.logDate, arr);
    }
    if (l.sleep?.quality) {
      const arr = qualityByDay.get(l.logDate) ?? [];
      arr.push(l.sleep.quality);
      qualityByDay.set(l.logDate, arr);
    }
  }
  const dayAverages: number[] = [];
  for (const [, hrs] of hoursByDay) {
    dayAverages.push(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  }
  const avgHours = dayAverages.length ? dayAverages.reduce((a, b) => a + b, 0) / dayAverages.length : 0;

  const qualityCount = new Map<string, number>();
  for (const [, qs] of qualityByDay) {
    const q = qs[0];
    if (q) qualityCount.set(q, (qualityCount.get(q) ?? 0) + 1);
  }
  let dominant: string | null = null;
  let max = 0;
  for (const [k, v] of qualityCount) {
    if (v > max) { max = v; dominant = k; }
  }
  return { avgHours, dominantQuality: dominant };
}

/** Percent of non-refused meals across all logged meals. */
export function mealCompletion(logs: CareLog[]): number {
  let total = 0;
  let completed = 0;
  for (const l of logs) {
    for (const m of l.meals ?? []) {
      total += 1;
      if (m.amount !== 'refused') completed += 1;
    }
  }
  return safeDivide(completed, total);
}

/**
 * Behavior that appeared on the most *distinct days* (not total mentions).
 * A behavior logged 3x in one day counts once. Better reflects clinical
 * pattern frequency ("wandering on 8 days" vs "wandering mentioned 12 times").
 */
export function topBehavior(logs: CareLog[]): { name: string | null; dayCount: number } {
  const daysByBehavior = new Map<string, Set<string>>();
  for (const l of logs) {
    for (const b of l.behaviors ?? []) {
      const days = daysByBehavior.get(b) ?? new Set<string>();
      days.add(l.logDate);
      daysByBehavior.set(b, days);
    }
  }
  let name: string | null = null;
  let max = 0;
  for (const [k, days] of daysByBehavior) {
    if (days.size > max) { max = days.size; name = k; }
  }
  return { name, dayCount: max };
}

/** Day-count for a specific named behavior — used for prior-window delta comparisons. */
export function behaviorDayCount(logs: CareLog[], behaviorName: string): number {
  const days = new Set<string>();
  for (const l of logs) {
    if (l.behaviors?.includes(behaviorName)) days.add(l.logDate);
  }
  return days.size;
}

// ─── Time-of-day bucketing ─────────────────────────────────────────────────

export type TodBucket = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

/**
 * Bucket an hour of the day (0-23). Morning 5-12, Afternoon 12-17,
 * Evening 17-21, Night 21-5.
 */
export function todBucket(hour: number): TodBucket {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

export interface ToDMoodDatum {
  bucket: TodBucket;
  calm: number;
  happy: number;
  confused: number;
  withdrawn: number;
  agitated: number;
  other: number;
}

/**
 * Per-log mood count bucketed by time-of-day. Unlike daily/weekly aggregators,
 * this stays per-log because each log IS a time-bounded snapshot.
 */
export function buildTimeOfDayMood(logs: CareLog[]): ToDMoodDatum[] {
  const buckets: Record<TodBucket, Record<Mood, number>> = {
    Morning: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Afternoon: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Evening: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
    Night: { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 },
  };
  for (const l of logs) {
    const d = l.logTimestamp?.toDate?.();
    if (!d) continue;
    const b = todBucket(d.getHours());
    buckets[b][l.mood] += 1;
  }
  return (['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((b) => ({
    bucket: b,
    ...buckets[b],
  }));
}

// ─── Weekly mood distribution (per-day dominant) ───────────────────────────

export interface WeeklyMoodDatum {
  weekLabel: string;
  weekStart: string;
  calm: number;
  happy: number;
  confused: number;
  withdrawn: number;
  agitated: number;
  other: number;
}

/**
 * Build weekly mood distribution where each bar segment counts DAYS not
 * log-entries. Each day's mood = worst mood of that day, matching the
 * heatmap + GoodDays semantics. Avoids bias from prolific loggers.
 */
export function buildWeeklyMoodData(
  logs: CareLog[],
  startDate: Dayjs,
  endDate: Dayjs
): WeeklyMoodDatum[] {
  // Collapse each day to its dominant (worst) mood first.
  const dayDominant = new Map<string, Mood>();
  for (const l of logs) {
    const prev = dayDominant.get(l.logDate);
    if (!prev || moodSeverity[l.mood] > moodSeverity[prev]) {
      dayDominant.set(l.logDate, l.mood);
    }
  }

  const anchor = startDate.startOf('week').add(1, 'day'); // Mon-based weeks
  const weeks: WeeklyMoodDatum[] = [];
  for (let w = anchor; w.isBefore(endDate) || w.isSame(endDate, 'day'); w = w.add(1, 'week')) {
    const weekEnd = w.add(6, 'day');
    const counts: Record<Mood, number> = { calm: 0, happy: 0, confused: 0, withdrawn: 0, agitated: 0, other: 0 };
    for (const [dateStr, mood] of dayDominant) {
      const d = dayjs(dateStr);
      if ((d.isSame(w, 'day') || d.isAfter(w, 'day')) && (d.isSame(weekEnd, 'day') || d.isBefore(weekEnd, 'day'))) {
        counts[mood] += 1;
      }
    }
    weeks.push({
      weekLabel: w.format('MMM D'),
      weekStart: w.format('YYYY-MM-DD'),
      ...counts,
    });
  }
  return weeks;
}

// ─── Daily sleep series (for line chart) ───────────────────────────────────

export interface SleepDatum {
  date: string;
  label: string;
  hours: number | null;
  rolling: number | null;
}

/**
 * One data point per day in [startDate, endDate] — per-day mean sleep hours
 * with a 7-day rolling average. Gaps (null) are preserved so the chart can
 * choose whether to connect across them.
 */
export function buildSleepData(
  logs: CareLog[],
  startDate: Dayjs,
  endDate: Dayjs
): SleepDatum[] {
  const byDate = new Map<string, number[]>();
  for (const l of logs) {
    const h = l.sleep?.hoursSlept;
    if (typeof h === 'number' && h > 0) {
      const arr = byDate.get(l.logDate) ?? [];
      arr.push(h);
      byDate.set(l.logDate, arr);
    }
  }
  const out: SleepDatum[] = [];
  for (let d = startDate; d.isBefore(endDate) || d.isSame(endDate, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD');
    const vals = byDate.get(key);
    const hours = vals && vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    out.push({ date: key, label: d.format('MMM D'), hours, rolling: null });
  }
  for (let i = 0; i < out.length; i++) {
    const window = out.slice(Math.max(0, i - 6), i + 1).map((x) => x.hours).filter((h): h is number => h != null);
    out[i].rolling = window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;
  }
  return out;
}

// ─── Circle Health helpers ─────────────────────────────────────────────────

/** Mood → 1-5 wellness score (5 = best). Higher = better day. */
export const moodWellness: Record<Mood, number> = {
  happy: 5,
  calm: 4,
  other: 3,
  withdrawn: 3,
  confused: 2,
  agitated: 1,
};

/**
 * Per-day worst-case wellness series for a fixed lookback window ending today.
 * Returns one number per day oldest→newest; NaN for days with no entries so
 * callers can decide how to render gaps (the existing Sparkline substitutes
 * a neutral midpoint).
 */
export function dailyWorstWellness(logs: CareLog[], daysBack: number, today: Dayjs = dayjs()): number[] {
  const byDate = groupByDate(logs);
  const out: number[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const key = today.subtract(i, 'day').format('YYYY-MM-DD');
    const dayLogs = byDate.get(key) ?? [];
    if (dayLogs.length === 0) {
      out.push(NaN);
    } else {
      const minWellness = Math.min(...dayLogs.map((l) => moodWellness[l.mood] ?? 3));
      out.push(minWellness);
    }
  }
  return out;
}

/**
 * Per-day average sleep hours across a log set, aggregated. Used by
 * CircleHealthCard; identical semantics to sleepStats().avgHours but exposed
 * separately for clarity and reuse.
 */
export function perDayAverageSleep(logs: CareLog[]): number {
  const hoursByDay = new Map<string, number[]>();
  for (const l of logs) {
    const h = l.sleep?.hoursSlept;
    if (typeof h === 'number' && h > 0) {
      const arr = hoursByDay.get(l.logDate) ?? [];
      arr.push(h);
      hoursByDay.set(l.logDate, arr);
    }
  }
  const perDay: number[] = [];
  for (const [, hrs] of hoursByDay) {
    perDay.push(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  }
  return perDay.length ? perDay.reduce((a, b) => a + b, 0) / perDay.length : 0;
}
