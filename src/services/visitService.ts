import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { toYYYYMMDD } from '../utils/dateUtils';
import { writeAuditEntry } from './auditService';
import type { Visit } from '../types';

function visitsCol(circleId: string) {
  return collection(db, 'circles', circleId, 'visits');
}

export interface CreateVisitData {
  caregiverUid: string;
  caregiverName: string;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  status: string;
  isAllDay?: boolean;
}

export async function createVisit(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateVisitData
): Promise<string> {
  const docRef = await addDoc(visitsCol(circleId), {
    ...data,
    isAllDay: data.isAllDay ?? false,
    startTime: Timestamp.fromDate(data.startTime),
    endTime: Timestamp.fromDate(data.endTime),
    startDateYYYYMMDD: toYYYYMMDD(data.startTime),
    endDateYYYYMMDD: toYYYYMMDD(data.endTime),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'visit.create', 'visit', docRef.id, {
    caregiverName: data.caregiverName,
  });

  return docRef.id;
}

export async function updateVisit(
  circleId: string,
  visitId: string,
  userId: string,
  userName: string,
  data: Partial<CreateVisitData>
): Promise<void> {
  const updates: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

  if (data.startTime) {
    updates.startTime = Timestamp.fromDate(data.startTime);
    updates.startDateYYYYMMDD = toYYYYMMDD(data.startTime);
  }
  if (data.endTime) {
    updates.endTime = Timestamp.fromDate(data.endTime);
    updates.endDateYYYYMMDD = toYYYYMMDD(data.endTime);
  }

  await updateDoc(doc(db, 'circles', circleId, 'visits', visitId), updates);
  await writeAuditEntry(circleId, userId, userName, 'visit.update', 'visit', visitId, {});
}

export async function deleteVisit(
  circleId: string,
  visitId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'visits', visitId));
  await writeAuditEntry(circleId, userId, userName, 'visit.delete', 'visit', visitId, {});
}

export async function toggleVisitStatus(
  circleId: string,
  visitId: string,
  currentStatus: string,
  userId: string,
  userName: string
): Promise<void> {
  const newStatus = currentStatus === 'confirmed' ? 'tentative' : 'confirmed';
  await updateDoc(doc(db, 'circles', circleId, 'visits', visitId), {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
  await writeAuditEntry(circleId, userId, userName, 'visit.update', 'visit', visitId, {
    statusChange: `${currentStatus} -> ${newStatus}`,
  });
}

export function subscribeVisits(
  circleId: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(visitsCol(circleId), orderBy('startTime', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visit));
    },
    onError
  );
}

export function subscribeVisitsByDateRange(
  circleId: string,
  startDate: string,
  endDate: string,
  onData: (visits: Visit[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    visitsCol(circleId),
    where('startDateYYYYMMDD', '>=', startDate),
    where('startDateYYYYMMDD', '<=', endDate),
    orderBy('startTime', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visit));
    },
    onError
  );
}
