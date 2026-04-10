import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { CareLog } from '../types/careLog';
import type { Medication, AdministrationLog } from '../types/medication';
import type { Task } from '../types/task';

export interface DoctorPrepData {
  careLogs: CareLog[];
  medications: Medication[];
  administrationLogs: Map<string, AdministrationLog[]>;
  completedTasks: Task[];
}

export async function fetchDoctorPrepData(
  circleId: string,
  startDate: string,
  endDate: string
): Promise<DoctorPrepData> {
  // Care logs in date range
  const careLogsQ = query(
    collection(db, 'circles', circleId, 'careLogs'),
    where('logDate', '>=', startDate),
    where('logDate', '<=', endDate),
    orderBy('logDate', 'asc')
  );
  const careLogsSnap = await getDocs(careLogsQ);
  const careLogs = careLogsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as CareLog);

  // All active medications
  const medsQ = query(collection(db, 'circles', circleId, 'medications'), orderBy('name', 'asc'));
  const medsSnap = await getDocs(medsQ);
  const medications = medsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Medication);

  // Administration logs for each medication in date range
  const administrationLogs = new Map<string, AdministrationLog[]>();
  for (const med of medications) {
    const adminQ = query(
      collection(db, 'circles', circleId, 'medications', med.id, 'administrationLog'),
      where('administeredDateYYYYMMDD', '>=', startDate),
      where('administeredDateYYYYMMDD', '<=', endDate),
      orderBy('administeredDateYYYYMMDD', 'asc')
    );
    const adminSnap = await getDocs(adminQ);
    if (!adminSnap.empty) {
      const logs = adminSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdministrationLog);
      logs.sort((a, b) => (a.administeredAt?.toMillis?.() ?? 0) - (b.administeredAt?.toMillis?.() ?? 0));
      administrationLogs.set(med.id, logs);
    }
  }

  // Completed tasks in date range
  const tasksQ = query(
    collection(db, 'circles', circleId, 'tasks'),
    where('status', '==', 'done'),
    orderBy('updatedAt', 'asc')
  );
  const tasksSnap = await getDocs(tasksQ);
  const completedTasks = tasksSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Task)
    .filter((t) => {
      if (!t.updatedAt) return false;
      const updated = t.updatedAt.toDate().toISOString().slice(0, 10);
      return updated >= startDate && updated <= endDate;
    });

  return { careLogs, medications, administrationLogs, completedTasks };
}
