import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function writeAuditEntry(
  circleId: string,
  actorUid: string,
  actorName: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await addDoc(collection(db, 'circles', circleId, 'auditLog'), {
    actorUid,
    actorName,
    action,
    resourceType,
    resourceId,
    details,
    timestamp: serverTimestamp(),
  });
}
