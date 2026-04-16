import type { CareLog } from '../types';

/**
 * Tally a single vocabulary field ('behaviors' or 'activities') across a set
 * of care logs. Returns display strings sorted by frequency (most-used first),
 * with an alphabetical tiebreak for determinism. Normalizes case for
 * deduplication ("Sundowning" and "sundowning" collapse) while preserving
 * the first-seen casing for display.
 */
export function tallyVocabulary(
  logs: CareLog[],
  key: 'behaviors' | 'activities'
): string[] {
  const counts = new Map<string, { display: string; count: number }>();
  for (const l of logs) {
    for (const raw of l[key] ?? []) {
      const v = (raw ?? '').trim();
      if (!v) continue;
      const norm = v.toLowerCase();
      const existing = counts.get(norm);
      if (existing) existing.count += 1;
      else counts.set(norm, { display: v, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
    .map((e) => e.display);
}
