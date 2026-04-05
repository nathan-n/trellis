import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { writeAuditEntry } from './auditService';
import type { CareLog, MealEntry, HydrationEntry, SleepEntry } from '../types';
import type { Mood } from '../constants';

function careLogsCol(circleId: string) {
  return collection(db, 'circles', circleId, 'careLogs');
}

export interface CreateCareLogData {
  logDate: string;
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
}

export async function createCareLog(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateCareLogData
): Promise<string> {
  const docRef = await addDoc(careLogsCol(circleId), {
    ...data,
    authorUid: userId,
    authorName: userName,
    logTimestamp: Timestamp.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'careLog.create', 'careLog', docRef.id, {
    logDate: data.logDate,
  });

  return docRef.id;
}

export async function updateCareLog(
  circleId: string,
  logId: string,
  data: Partial<CreateCareLogData>
): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'careLogs', logId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeCareLogsByDate(
  circleId: string,
  date: string,
  onData: (logs: CareLog[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    careLogsCol(circleId),
    where('logDate', '==', date),
    orderBy('logTimestamp', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CareLog));
    },
    onError
  );
}

export function subscribeRecentCareLogs(
  circleId: string,
  onData: (logs: CareLog[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(careLogsCol(circleId), orderBy('logTimestamp', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CareLog));
    },
    onError
  );
}
