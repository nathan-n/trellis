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
  const fileId = crypto.randomUUID();
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
  // Delete the Firestore doc first — this is the user-visible change and
  // the rule-authoritative permission check (admin OR uploadedByUid).
  // If the user isn't allowed to delete, this throws and we bail out
  // before touching Storage.
  await deleteDoc(doc(db, 'circles', circleId, 'documents', document.id));

  // Audit second — the delete has effectively happened from the user's
  // perspective.
  await writeAuditEntry(circleId, userId, userName, 'document.delete', 'document', document.id, {
    title: document.title,
  });

  // Storage delete is best-effort. An orphaned Storage file is invisible
  // to users (no Storage listing path in the app) and harmless aside from
  // a minor leak — far better than surfacing "Failed to remove document"
  // after the doc has already been removed from Firestore.
  // Pre-existing docs missing storagePath (edge case from earlier schema
  // versions) silently skip the Storage cleanup instead of throwing.
  if (document.storagePath) {
    try {
      await deleteFile(document.storagePath);
    } catch (err) {
      console.warn('[removeDocument] storage cleanup failed (orphaned file):', err);
    }
  }
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
