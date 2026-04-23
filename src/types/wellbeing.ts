import { Timestamp } from 'firebase/firestore';
import type { SleepQuality } from '../constants';

/**
 * 3-state overwhelm self-assessment. Replaces the binary "am I overwhelmed"
 * switch that felt clinical and forced a yes/no on something that isn't
 * actually binary. Review finding 07.
 *
 * Legacy check-ins only have `feelingOverwhelmed: boolean` and no level —
 * render them by treating true as 'quite_a_bit' for display purposes.
 */
export type OverwhelmLevel = 'not_really' | 'a_little' | 'quite_a_bit';

export interface WellbeingCheckin {
  id: string;
  authorUid: string;
  authorName: string;
  date: string; // YYYY-MM-DD
  stressLevel: number; // 1-5
  sleepQuality: SleepQuality;
  /**
   * Kept for backward compatibility with pre-v2 check-ins and for quick
   * boolean read sites. Derived from overwhelmLevel on new check-ins:
   * true when level is 'quite_a_bit', false otherwise.
   */
  feelingOverwhelmed: boolean;
  /**
   * New on v2 check-ins. Undefined on legacy docs — consumers should
   * fall back to the boolean.
   */
  overwhelmLevel?: OverwhelmLevel;
  notes: string | null;
  createdAt: Timestamp;
}
