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
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { writeAuditEntry } from './auditService';
import type { CaregiverResource } from '../types';

function resourcesCol(circleId: string) {
  return collection(db, 'circles', circleId, 'resources');
}

export interface CreateResourceData {
  title: string;
  description: string;
  type: string;
  url: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
}

export async function createResource(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateResourceData
): Promise<string> {
  const docRef = await addDoc(resourcesCol(circleId), {
    ...data,
    addedByUid: userId,
    addedByName: userName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'resource.create', 'resource', docRef.id, {
    title: data.title,
    type: data.type,
  });

  return docRef.id;
}

export async function updateResource(
  circleId: string,
  resourceId: string,
  userId: string,
  userName: string,
  data: Partial<CreateResourceData>
): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'resources', resourceId), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'resource.update', 'resource', resourceId, {
    updatedFields: Object.keys(data),
  });
}

export async function deleteResource(
  circleId: string,
  resource: CaregiverResource,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'resources', resource.id));
  await writeAuditEntry(circleId, userId, userName, 'resource.delete', 'resource', resource.id, {
    title: resource.title,
  });
}

export function subscribeResources(
  circleId: string,
  onData: (resources: CaregiverResource[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(resourcesCol(circleId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CaregiverResource));
    },
    onError
  );
}
