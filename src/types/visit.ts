import { Timestamp } from 'firebase/firestore';
import { VisitStatus } from '../constants';

export interface Visit {
  id: string;
  caregiverUid: string;
  caregiverName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  startDateYYYYMMDD: string;
  notes: string | null;
  status: VisitStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
