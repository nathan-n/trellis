import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { toYYYYMM } from '../utils/dateUtils';
import { writeAuditEntry } from './auditService';
import { uploadFile, deleteFile } from './storageService';
import type { Expense } from '../types';

function expensesCol(circleId: string) {
  return collection(db, 'circles', circleId, 'expenses');
}

export interface CreateExpenseData {
  title: string;
  amount: number; // cents
  category: string;
  date: Date;
  notes: string | null;
}

export async function createExpense(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateExpenseData,
  receiptFile?: File
): Promise<string> {
  let receiptStoragePath: string | null = null;
  let receiptDownloadURL: string | null = null;

  if (receiptFile) {
    const fileId = crypto.randomUUID();
    const path = `circles/${circleId}/expenses/${fileId}_${receiptFile.name}`;
    const result = await uploadFile(path, receiptFile);
    receiptStoragePath = result.storagePath;
    receiptDownloadURL = result.downloadURL;
  }

  const docRef = await addDoc(expensesCol(circleId), {
    title: data.title,
    amount: data.amount,
    category: data.category,
    date: Timestamp.fromDate(data.date),
    dateYYYYMM: toYYYYMM(data.date),
    paidByUid: userId,
    paidByName: userName,
    receiptStoragePath,
    receiptDownloadURL,
    notes: data.notes,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'expense.create', 'expense', docRef.id, {
    title: data.title,
    amount: data.amount,
  });

  return docRef.id;
}

export async function deleteExpense(
  circleId: string,
  expense: Expense,
  userId: string,
  userName: string
): Promise<void> {
  if (expense.receiptStoragePath) {
    await deleteFile(expense.receiptStoragePath).catch(() => {});
  }
  await deleteDoc(doc(db, 'circles', circleId, 'expenses', expense.id));
  await writeAuditEntry(circleId, userId, userName, 'expense.delete', 'expense', expense.id, {
    title: expense.title,
  });
}

export function subscribeExpenses(
  circleId: string,
  onData: (expenses: Expense[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(expensesCol(circleId), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense));
    },
    onError
  );
}
