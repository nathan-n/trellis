import { Timestamp } from 'firebase/firestore';
import type { ResourceType } from '../constants';

export interface CaregiverResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  url: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
  addedByUid: string;
  addedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
