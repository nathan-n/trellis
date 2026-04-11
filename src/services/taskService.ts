import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Task, TaskComment, TaskAttachment } from '../types';
import { buildSearchTerms } from '../utils/searchUtils';
import { toYYYYMM } from '../utils/dateUtils';
import { computeVisibleToUids } from '../utils/taskVisibility';
import { writeAuditEntry } from './auditService';
import { uploadFile, deleteFile } from './storageService';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { RecurrenceFrequency } from '../constants';

function tasksCol(circleId: string) {
  return collection(db, 'circles', circleId, 'tasks');
}

function taskDoc(circleId: string, taskId: string) {
  return doc(db, 'circles', circleId, 'tasks', taskId);
}

export interface CreateTaskData {
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigneeUids: string[];
  visibility?: string;
  visibleToUids?: string[];
  dueDate: Date | null;
  location: string | null;
  resourceLinks: string[];
  rationale: string | null;
  pointsOfContact: { name: string; phone: string; email: string }[];
  subtype?: string;
  appointmentDetails?: { doctorName: string; location: string; appointmentType: string } | null;
  recurrence?: { frequency: string } | null;
}


export async function createTask(
  circleId: string,
  userId: string,
  userName: string,
  data: CreateTaskData
): Promise<string> {
  const searchTerms = buildSearchTerms(data.title, data.description, data.location, data.rationale);
  const visibility = data.visibility ?? 'circle';
  const visibleToUids = computeVisibleToUids(visibility, userId, data.assigneeUids, data.visibleToUids ?? []);

  // Strip undefined values — Firestore rejects them
  const taskData: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    status: data.status,
    assigneeUids: data.assigneeUids,
    visibility,
    visibleToUids,
    dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
    dueDateYYYYMM: data.dueDate ? toYYYYMM(data.dueDate) : null,
    location: data.location,
    resourceLinks: data.resourceLinks,
    rationale: data.rationale,
    pointsOfContact: data.pointsOfContact,
    recurrence: data.recurrence ?? null,
    searchTerms,
    createdByUid: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (data.subtype) taskData.subtype = data.subtype;
  if (data.appointmentDetails) taskData.appointmentDetails = data.appointmentDetails;

  const docRef = await addDoc(tasksCol(circleId), taskData);

  await writeAuditEntry(circleId, userId, userName, 'task.create', 'task', docRef.id, {
    title: data.title,
  });

  return docRef.id;
}

export async function updateTask(
  circleId: string,
  taskId: string,
  userId: string,
  userName: string,
  data: Partial<CreateTaskData>
): Promise<void> {
  const updates: Record<string, unknown> = { ...data, updatedAt: serverTimestamp() };

  if (data.dueDate !== undefined) {
    updates.dueDate = data.dueDate ? Timestamp.fromDate(data.dueDate) : null;
    updates.dueDateYYYYMM = data.dueDate ? toYYYYMM(data.dueDate) : null;
  }

  if (data.title !== undefined || data.description !== undefined) {
    updates.searchTerms = buildSearchTerms(
      data.title ?? '',
      data.description ?? '',
      data.location ?? null,
      data.rationale ?? null
    );
  }

  // Recompute visibleToUids when visibility or assignees change
  if (data.visibility !== undefined || data.assigneeUids !== undefined) {
    const visibility = data.visibility ?? 'circle';
    updates.visibleToUids = computeVisibleToUids(
      visibility,
      userId,
      data.assigneeUids ?? [],
      data.visibleToUids ?? []
    );
  }

  await updateDoc(taskDoc(circleId, taskId), updates);

  await writeAuditEntry(circleId, userId, userName, 'task.update', 'task', taskId, {
    updatedFields: Object.keys(data),
  });
}

export async function deleteTask(
  circleId: string,
  taskId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(taskDoc(circleId, taskId));
  await writeAuditEntry(circleId, userId, userName, 'task.delete', 'task', taskId, {});
}

function getNextDueDate(currentDue: Date, frequency: RecurrenceFrequency): Date {
  const d = dayjs(currentDue);
  switch (frequency) {
    case 'daily': return d.add(1, 'day').toDate();
    case 'weekly': return d.add(1, 'week').toDate();
    case 'biweekly': return d.add(2, 'week').toDate();
    case 'monthly': return d.add(1, 'month').toDate();
    default: return d.add(1, 'week').toDate();
  }
}

export async function completeRecurringTask(
  circleId: string,
  task: Task,
  userId: string,
  userName: string
): Promise<string | null> {
  // Mark current task as done
  await updateDoc(taskDoc(circleId, task.id), {
    status: 'done',
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'task.complete', 'task', task.id, {
    title: task.title,
    recurring: true,
  });

  // Create next instance if recurring and has a due date
  if (!task.recurrence || !task.dueDate) return null;

  const nextDue = getNextDueDate(task.dueDate.toDate(), task.recurrence.frequency);
  const searchTerms = buildSearchTerms(task.title, task.description, task.location, task.rationale);

  const docRef = await addDoc(tasksCol(circleId), {
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    status: 'todo',
    assigneeUids: task.assigneeUids,
    visibility: task.visibility ?? 'circle',
    visibleToUids: task.visibleToUids ?? [],
    dueDate: Timestamp.fromDate(nextDue),
    dueDateYYYYMM: toYYYYMM(nextDue),
    location: task.location,
    resourceLinks: task.resourceLinks,
    rationale: task.rationale,
    pointsOfContact: task.pointsOfContact,
    recurrence: task.recurrence,
    searchTerms,
    createdByUid: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await writeAuditEntry(circleId, userId, userName, 'task.create', 'task', docRef.id, {
    title: task.title,
    recurringNext: true,
  });

  return docRef.id;
}

export function subscribeTasks(
  circleId: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(tasksCol(circleId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
      onData(tasks);
    },
    onError
  );
}

export function subscribeTasksByMonth(
  circleId: string,
  yyyymm: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    tasksCol(circleId),
    where('dueDateYYYYMM', '==', yyyymm),
    orderBy('dueDate', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
      onData(tasks);
    },
    onError
  );
}

export function subscribeMyPriorityTask(
  circleId: string,
  userId: string,
  onData: (task: Task | null) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    tasksCol(circleId),
    where('assigneeUids', 'array-contains', userId),
    where('status', 'in', ['todo', 'in_progress']),
    orderBy('dueDate', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      if (snap.empty) {
        onData(null);
        return;
      }
      // Sort by priority client-side (urgent > high > medium > low)
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
      tasks.sort((a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0));
      onData(tasks[0]);
    },
    onError
  );
}

// Comments
function commentsCol(circleId: string, taskId: string) {
  return collection(db, 'circles', circleId, 'tasks', taskId, 'comments');
}

export async function addComment(
  circleId: string,
  taskId: string,
  authorUid: string,
  authorName: string,
  body: string
): Promise<string> {
  const docRef = await addDoc(commentsCol(circleId, taskId), {
    authorUid,
    authorName,
    body,
    createdAt: serverTimestamp(),
    updatedAt: null,
  });
  return docRef.id;
}

export function subscribeComments(
  circleId: string,
  taskId: string,
  onData: (comments: TaskComment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(commentsCol(circleId, taskId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskComment);
      onData(comments);
    },
    onError
  );
}

// Attachments
function attachmentsCol(circleId: string, taskId: string) {
  return collection(db, 'circles', circleId, 'tasks', taskId, 'attachments');
}

export async function addAttachment(
  circleId: string,
  taskId: string,
  uploadedByUid: string,
  file: File
): Promise<string> {
  const fileId = uuidv4();
  const storagePath = `circles/${circleId}/tasks/${taskId}/${fileId}_${file.name}`;
  const { downloadURL } = await uploadFile(storagePath, file);

  const docRef = await addDoc(attachmentsCol(circleId, taskId), {
    fileName: file.name,
    fileType: file.type,
    storagePath,
    downloadURL,
    uploadedByUid,
    uploadedAt: serverTimestamp(),
    sizeBytes: file.size,
  });
  return docRef.id;
}

export async function removeAttachment(
  circleId: string,
  taskId: string,
  attachment: TaskAttachment
): Promise<void> {
  await deleteFile(attachment.storagePath);
  await deleteDoc(doc(db, 'circles', circleId, 'tasks', taskId, 'attachments', attachment.id));
}

export function subscribeAttachments(
  circleId: string,
  taskId: string,
  onData: (attachments: TaskAttachment[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(attachmentsCol(circleId, taskId), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const attachments = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskAttachment);
      onData(attachments);
    },
    onError
  );
}
