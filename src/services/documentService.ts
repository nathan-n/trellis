import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadFile, deleteFile } from './storageService';
import { writeAuditEntry } from './auditService';
import type { VaultDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';

function docsCol(circleId: string) {
  return collection(db, 'circles', circleId, 'documents');
}

export async function uploadDocument(
  circleId: string,
  userId: string,
  userName: string,
  file: File,
  data: { title: string; category: string; description: string | null }
): Promise<string> {
  const fileId = uuidv4();
  const storagePath = `circles/${circleId}/documents/${fileId}_${file.name}`;
  const { downloadURL } = await uploadFile(storagePath, file);

  const docRef = await addDoc(docsCol(circleId), {
    title: data.title,
    category: data.category,
    description: data.description,
    fileName: file.name,
    fileType: file.type,
    storagePath,
    downloadURL,
    sizeBytes: file.size,
    uploadedByUid: userId,
    uploadedByName: userName,
    uploadedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'document.upload', 'document', docRef.id, {
    title: data.title,
    fileName: file.name,
  });

  return docRef.id;
}

export async function removeDocument(
  circleId: string,
  document: VaultDocument,
  userId: string,
  userName: string
): Promise<void> {
  await deleteFile(document.storagePath);
  await deleteDoc(doc(db, 'circles', circleId, 'documents', document.id));
  await writeAuditEntry(circleId, userId, userName, 'document.delete', 'document', document.id, {
    title: document.title,
  });
}

export function subscribeDocuments(
  circleId: string,
  onData: (docs: VaultDocument[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(docsCol(circleId), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VaultDocument));
    },
    onError
  );
}
