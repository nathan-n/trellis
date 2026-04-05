import { Timestamp } from 'firebase/firestore';
import type { ExpenseCategory } from '../constants';

export interface Expense {
  id: string;
  title: string;
  amount: number; // cents
  category: ExpenseCategory;
  date: Timestamp;
  dateYYYYMM: string;
  paidByUid: string;
  paidByName: string;
  receiptStoragePath: string | null;
  receiptDownloadURL: string | null;
  notes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
