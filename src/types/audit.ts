import { Timestamp } from 'firebase/firestore';

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  timestamp: Timestamp;
}
