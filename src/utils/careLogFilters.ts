import type { CareLog } from '../types';
import type { CareLogFilters } from '../components/careLogs/CareLogFilterBar';

/**
 * True if a care log matches every active filter. Mirrors what the user sees
 * in the history view's filter bar:
 *   - mood: exact match
 *   - authorUid: exact match
 *   - handoffOnly: log must be a shift handoff
 *   - text: case-insensitive substring search across notes + author +
 *     behaviors + activities
 *
 * Empty / default filter values are treated as "don't filter" so an all-empty
 * filter set passes every log through.
 */
export function matchesFilters(log: CareLog, f: CareLogFilters): boolean {
  if (f.mood && log.mood !== f.mood) return false;
  if (f.authorUid && log.authorUid !== f.authorUid) return false;
  if (f.handoffOnly && !log.isShiftHandoff) return false;
  if (f.text) {
    const q = f.text.toLowerCase();
    const haystack = [
      log.generalNotes ?? '',
      log.moodNotes ?? '',
      log.shiftSummary ?? '',
      log.authorName ?? '',
      ...(log.behaviors ?? []),
      ...(log.activities ?? []),
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}
