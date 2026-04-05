import { Timestamp } from 'firebase/firestore';
import { TaskCategory, TaskPriority, TaskStatus } from '../constants';

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
  dueDate: Timestamp | null;
  dueDateYYYYMM: string | null;
  location: string | null;
  resourceLinks: string[];
  rationale: string | null;
  pointsOfContact: PointOfContact[];
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
