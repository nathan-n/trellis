import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  getDocs,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DoctorQuestion } from '../types';

function questionsCol(circleId: string, taskId: string) {
  return collection(db, 'circles', circleId, 'tasks', taskId, 'questions');
}

export async function addQuestion(
  circleId: string,
  taskId: string,
  addedByUid: string,
  addedByName: string,
  text: string
): Promise<string> {
  const docRef = await addDoc(questionsCol(circleId, taskId), {
    text,
    answered: false,
    answerNotes: null,
    addedByUid,
    addedByName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateQuestion(
  circleId: string,
  taskId: string,
  questionId: string,
  updates: Partial<{ text: string; answered: boolean; answerNotes: string | null }>
): Promise<void> {
  await updateDoc(doc(db, 'circles', circleId, 'tasks', taskId, 'questions', questionId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQuestion(
  circleId: string,
  taskId: string,
  questionId: string
): Promise<void> {
  await deleteDoc(doc(db, 'circles', circleId, 'tasks', taskId, 'questions', questionId));
}

export function subscribeQuestions(
  circleId: string,
  taskId: string,
  onData: (questions: DoctorQuestion[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  // No orderBy — serverTimestamp is null on pending writes, which breaks ordered queries.
  // Sort client-side instead, with stable insertion order (no reordering on check).
  return onSnapshot(
    query(questionsCol(circleId, taskId)),
    (snap) => {
      const questions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DoctorQuestion);
      questions.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
      onData(questions);
    },
    onError
  );
}

export async function fetchQuestions(
  circleId: string,
  taskId: string
): Promise<DoctorQuestion[]> {
  const snap = await getDocs(query(questionsCol(circleId, taskId)));
  const questions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DoctorQuestion);
  questions.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  return questions;
}
