import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { toYYYYMMDD } from '../utils/dateUtils';
import { writeAuditEntry } from './auditService';
import type { Medication, AdministrationLog } from '../types';

function medsCol(circleId: string) {
  return collection(db, 'circles', circleId, 'medications');
}

export interface CreateMedicationData {
  name: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string | null;
  pharmacy: string | null;
  pharmacyPhone: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  refillDate: Date | null;
  notes: string | null;
}

export async function createMedication(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateMedicationData
): Promise<string> {
  const docRef = await addDoc(medsCol(circleId), {
    ...data,
    startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
    endDate: data.endDate ? Timestamp.fromDate(data.endDate) : null,
    refillDate: data.refillDate ? Timestamp.fromDate(data.refillDate) : null,
    createdByUid: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'medication.create', 'medication', docRef.id, {
    name: data.name,
  });

  return docRef.id;
}

export async function updateMedication(
  circleId: string,
  medId: string,
  userId: string,
  userName: string,
  data: Partial<CreateMedicationData>
): Promise<void> {
  const updates: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

  if (data.startDate !== undefined) updates.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
  if (data.endDate !== undefined) updates.endDate = data.endDate ? Timestamp.fromDate(data.endDate) : null;
  if (data.refillDate !== undefined) updates.refillDate = data.refillDate ? Timestamp.fromDate(data.refillDate) : null;

  await updateDoc(doc(db, 'circles', circleId, 'medications', medId), updates);
  await writeAuditEntry(circleId, userId, userName, 'medication.update', 'medication', medId, {});
}

export async function deleteMedication(
  circleId: string,
  medId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'medications', medId));
  await writeAuditEntry(circleId, userId, userName, 'medication.delete', 'medication', medId, {});
}

export function subscribeMedications(
  circleId: string,
  onData: (meds: Medication[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(medsCol(circleId), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Medication));
    },
    onError
  );
}

// Administration log
export async function logAdministration(
  circleId: string,
  medId: string,
  adminByUid: string,
  adminByName: string,
  data: { skipped: boolean; skipReason?: string; notes?: string }
): Promise<void> {
  const now = new Date();
  await addDoc(collection(db, 'circles', circleId, 'medications', medId, 'administrationLog'), {
    administeredByUid: adminByUid,
    administeredByName: adminByName,
    administeredAt: serverTimestamp(),
    administeredDateYYYYMMDD: toYYYYMMDD(now),
    notes: data.notes || null,
    skipped: data.skipped,
    skipReason: data.skipReason || null,
  });
}

export function subscribeAdministrationLog(
  circleId: string,
  medId: string,
  onData: (logs: AdministrationLog[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'circles', circleId, 'medications', medId, 'administrationLog'),
    orderBy('administeredAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdministrationLog));
    },
    onError
  );
}
