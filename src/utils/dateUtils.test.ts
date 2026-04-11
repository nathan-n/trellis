/// <reference types="vitest/globals" />
import { toYYYYMM, toYYYYMMDD, formatDate, formatDateTime, formatTime, timestampToDate } from './dateUtils';
import { Timestamp } from 'firebase/firestore';

describe('toYYYYMM', () => {
  it('formats January correctly', () => {
    expect(toYYYYMM(new Date(2024, 0, 15))).toBe('2024-01');
  });

  it('formats December correctly', () => {
    expect(toYYYYMM(new Date(2024, 11, 1))).toBe('2024-12');
  });
});

describe('toYYYYMMDD', () => {
  it('formats with zero-padded month and day', () => {
    expect(toYYYYMMDD(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('formats double-digit month and day', () => {
    expect(toYYYYMMDD(new Date(2024, 11, 25))).toBe('2024-12-25');
  });
});

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('formats timestamp as MMM D, YYYY', () => {
    const ts = Timestamp.fromDate(new Date(2024, 5, 15));
    expect(formatDate(ts)).toBe('Jun 15, 2024');
  });
});

describe('formatDateTime', () => {
  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('includes time component', () => {
    const ts = Timestamp.fromDate(new Date(2024, 5, 15, 14, 30));
    const result = formatDateTime(ts);
    expect(result).toContain('Jun 15, 2024');
    expect(result).toContain('2:30 PM');
  });
});

describe('formatTime', () => {
  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('');
  });

  it('formats as h:mm A', () => {
    const ts = Timestamp.fromDate(new Date(2024, 5, 15, 9, 5));
    expect(formatTime(ts)).toBe('9:05 AM');
  });
});

describe('timestampToDate', () => {
  it('returns null for null input', () => {
    expect(timestampToDate(null)).toBeNull();
  });

  it('converts timestamp to Date', () => {
    const date = new Date(2024, 5, 15);
    const ts = Timestamp.fromDate(date);
    expect(timestampToDate(ts)).toEqual(date);
  });
});
