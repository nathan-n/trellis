import { Timestamp } from 'firebase/firestore';
import type { VisitStatus } from '../constants';

export interface Visit {
  id: string;
  caregiverUid: string;
  caregiverName: string;
  startTime: Timestamp;
  endTime: Timestamp;
  startDateYYYYMMDD: string;
  endDateYYYYMMDD?: string;
  isAllDay?: boolean;
  notes: string | null;
  status: VisitStatus | string; // string for backward compat with old statuses
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
