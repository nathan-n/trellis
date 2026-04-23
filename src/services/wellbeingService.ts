import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { WellbeingCheckin, OverwhelmLevel } from '../types/wellbeing';
import type { SleepQuality } from '../constants';

function checkinsCol(circleId: string) {
  return collection(db, 'circles', circleId, 'wellbeingCheckins');
}

export interface CreateCheckinData {
  stressLevel: number;
  sleepQuality: SleepQuality;
  feelingOverwhelmed: boolean;
  /** New on v2 — 3-state overwhelm level. Undefined on legacy UI paths. */
  overwhelmLevel?: OverwhelmLevel;
  notes: string | null;
}

export async function createCheckin(
  circleId: string,
  userId: string,
  userName: string,
  date: string,
  data: CreateCheckinData
): Promise<string> {
  const docRef = await addDoc(checkinsCol(circleId), {
    authorUid: userId,
    authorName: userName,
    date,
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getLastCheckin(
  circleId: string,
  userId: string
): Promise<WellbeingCheckin | null> {
  const q = query(
    checkinsCol(circleId),
    where('authorUid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as WellbeingCheckin;
}

export async function fetchRecentCheckins(
  circleId: string,
  userId: string,
  limitCount = 8
): Promise<WellbeingCheckin[]> {
  const q = query(
    checkinsCol(circleId),
    where('authorUid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WellbeingCheckin);
  return results.reverse(); // chronological order for sparkline
}

export function subscribeMyCheckins(
  circleId: string,
  userId: string,
  onData: (checkins: WellbeingCheckin[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    checkinsCol(circleId),
    where('authorUid', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WellbeingCheckin));
    },
    onError
  );
}
