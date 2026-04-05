import { Timestamp } from 'firebase/firestore';
import { Mood, SleepQuality, MealAmount } from '../constants';

export interface MealEntry {
  time: string;
  description: string;
  amount: MealAmount;
}

export interface HydrationEntry {
  time: string;
  amount: string;
  type: string;
}

export interface SleepEntry {
  quality: SleepQuality;
  hoursSlept: number | null;
  notes: string | null;
}

export interface CareLog {
  id: string;
  authorUid: string;
  authorName: string;
  logDate: string; // YYYY-MM-DD
  logTimestamp: Timestamp;
  meals: MealEntry[];
  hydration: HydrationEntry[];
  mood: Mood;
  moodNotes: string | null;
  sleep: SleepEntry;
  behaviors: string[];
  activities: string[];
  generalNotes: string | null;
  isShiftHandoff: boolean;
  shiftSummary: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
