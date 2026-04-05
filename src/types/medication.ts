import { Timestamp } from 'firebase/firestore';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string | null;
  pharmacy: string | null;
  pharmacyPhone: string | null;
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  isActive: boolean;
  refillDate: Timestamp | null;
  notes: string | null;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdministrationLog {
  id: string;
  administeredByUid: string;
  administeredByName: string;
  administeredAt: Timestamp;
  administeredDateYYYYMMDD: string;
  notes: string | null;
  skipped: boolean;
  skipReason: string | null;
}
