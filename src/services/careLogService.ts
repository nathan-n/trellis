import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit,
  startAfter,
  getDocs,
  type Unsubscribe,
  type QueryDocumentSnapshot,
  type DocumentData,
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

export async function deleteCareLog(
  circleId: string,
  logId: string,
  userId: string,
  userName: string,
  logDate?: string
): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'careLogs', logId));
  await writeAuditEntry(circleId, userId, userName, 'careLog.delete', 'careLog', logId, {
    logDate: logDate ?? null,
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

export interface CareLogPage {
  logs: CareLog[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetch the circle's recent care-log vocabulary — unique behaviors and
 * activities from the last 90 days, sorted by frequency (most-used first).
 * Used to populate autocomplete suggestions in CareLogEntryForm so
 * caregivers don't drift on terminology ("sundowning" vs "sun downing").
 * Pure aggregation logic lives in src/utils/careLogVocabulary.ts (tested).
 */
export async function fetchCareLogVocabulary(
  circleId: string
): Promise<{ behaviors: string[]; activities: string[] }> {
  const { tallyVocabulary } = await import('../utils/careLogVocabulary');
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const logs = await fetchCareLogsInRange(circleId, fmt(start), fmt(end));
  return {
    behaviors: tallyVocabulary(logs, 'behaviors'),
    activities: tallyVocabulary(logs, 'activities'),
  };
}

/**
 * Fetch all care logs whose logDate is within the given inclusive range.
 * Used by the Trends view. Uses the existing (logDate asc, logTimestamp desc)
 * composite index.
 */
export async function fetchCareLogsInRange(
  circleId: string,
  startDate: string, // YYYY-MM-DD inclusive
  endDate: string    // YYYY-MM-DD inclusive
): Promise<CareLog[]> {
  const q = query(
    careLogsCol(circleId),
    where('logDate', '>=', startDate),
    where('logDate', '<=', endDate),
    orderBy('logDate', 'asc'),
    orderBy('logTimestamp', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CareLog);
}

/**
 * Paginated fetch of care logs ordered by logTimestamp desc.
 * Used by the "All Entries" history view for infinite scrolling.
 * Pass the previous page's lastDoc as cursor to get the next page.
 */
export async function fetchCareLogsPage(
  circleId: string,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<CareLogPage> {
  const base = query(
    careLogsCol(circleId),
    orderBy('logTimestamp', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize)
  );
  const snap = await getDocs(base);
  const docs = snap.docs;
  return {
    logs: docs.map((d) => ({ id: d.id, ...d.data() }) as CareLog),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore: docs.length === pageSize,
  };
}
