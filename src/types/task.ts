import { Timestamp } from 'firebase/firestore';
import { TaskCategory, TaskPriority, TaskStatus, TaskVisibility, TaskSubtype, RecurrenceFrequency } from '../constants';

export interface PointOfContact {
  name: string;
  phone: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeUids: string[];
  visibility: TaskVisibility;
  visibleToUids: string[];
  dueDate: Timestamp | null;
  dueDateYYYYMM: string | null;
  location: string | null;
  resourceLinks: string[];
  rationale: string | null;
  pointsOfContact: PointOfContact[];
  subtype?: TaskSubtype;
  appointmentDetails?: {
    doctorName: string;
    location: string;
    appointmentType: string;
  } | null;
  recurrence: {
    frequency: RecurrenceFrequency;
  } | null;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchTerms: string[];
}

export interface TaskComment {
  id: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  downloadURL: string;
  uploadedByUid: string;
  uploadedAt: Timestamp;
  sizeBytes: number;
}

export interface DoctorQuestion {
  id: string;
  text: string;
  answered: boolean;
  answerNotes: string | null;
  addedByUid: string;
  addedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
