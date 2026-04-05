import { Timestamp } from 'firebase/firestore';
import { DocumentCategory } from '../constants';

export interface VaultDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  description: string | null;
  fileName: string;
  fileType: string;
  storagePath: string;
  downloadURL: string;
  sizeBytes: number;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  updatedAt: Timestamp;
}
