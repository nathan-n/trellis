import { Timestamp } from 'firebase/firestore';
import type { SleepQuality } from '../constants';

export interface WellbeingCheckin {
  id: string;
  authorUid: string;
  authorName: string;
  date: string; // YYYY-MM-DD
  stressLevel: number; // 1-5
  sleepQuality: SleepQuality;
  feelingOverwhelmed: boolean;
  notes: string | null;
  createdAt: Timestamp;
}
