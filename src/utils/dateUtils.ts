import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';

export function toYYYYMM(date: Date): string {
  return dayjs(date).format('YYYY-MM');
}

export function toYYYYMMDD(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

export function timestampToDate(ts: Timestamp | null): Date | null {
  return ts ? ts.toDate() : null;
}

export function formatDate(ts: Timestamp | null): string {
  if (!ts) return '';
  return dayjs(ts.toDate()).format('MMM D, YYYY');
}

export function formatDateTime(ts: Timestamp | null): string {
  if (!ts) return '';
  return dayjs(ts.toDate()).format('MMM D, YYYY h:mm A');
}

export function formatTime(ts: Timestamp | null): string {
  if (!ts) return '';
  return dayjs(ts.toDate()).format('h:mm A');
}
