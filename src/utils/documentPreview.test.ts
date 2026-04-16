/// <reference types="vitest/globals" />
import { getPreviewKind } from './documentPreview';

describe('getPreviewKind', () => {
  // ─── PDF ───────────────────────────────────────────────────────────────
  it('identifies application/pdf', () => {
    expect(getPreviewKind('application/pdf')).toBe('pdf');
  });
  it('is case-insensitive', () => {
    expect(getPreviewKind('APPLICATION/PDF')).toBe('pdf');
  });
  it('is whitespace-tolerant', () => {
    expect(getPreviewKind('  application/pdf  ')).toBe('pdf');
  });

  // ─── Images (supported subset) ─────────────────────────────────────────
  it.each([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
  ])('treats %s as image', (type) => {
    expect(getPreviewKind(type)).toBe('image');
  });

  // ─── Images (excluded) ─────────────────────────────────────────────────
  it('does NOT preview HEIC (inconsistent cross-browser support)', () => {
    expect(getPreviewKind('image/heic')).toBe('unsupported');
    expect(getPreviewKind('image/heif')).toBe('unsupported');
  });
  it('does NOT preview TIFF (not natively rendered by browsers)', () => {
    expect(getPreviewKind('image/tiff')).toBe('unsupported');
  });

  // ─── Text-like ─────────────────────────────────────────────────────────
  it.each([
    'text/plain',
    'text/csv',
    'text/markdown',
    'text/x-markdown',
  ])('treats %s as text', (type) => {
    expect(getPreviewKind(type)).toBe('text');
  });

  // ─── Office docs: explicitly unsupported ───────────────────────────────
  // Rendering these client-side would require heavy libraries with
  // inconsistent fidelity; routing to download is cleaner than a
  // half-working preview for PHI documents.
  it.each([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ])('does NOT preview Office doc %s', (type) => {
    expect(getPreviewKind(type)).toBe('unsupported');
  });

  // ─── Archives / unknown ────────────────────────────────────────────────
  it('treats zip as unsupported', () => {
    expect(getPreviewKind('application/zip')).toBe('unsupported');
  });
  it('treats unknown binary as unsupported', () => {
    expect(getPreviewKind('application/octet-stream')).toBe('unsupported');
  });

  // ─── Defensive null/empty handling ─────────────────────────────────────
  it('returns unsupported for empty string', () => {
    expect(getPreviewKind('')).toBe('unsupported');
  });
  it('returns unsupported for null', () => {
    expect(getPreviewKind(null)).toBe('unsupported');
  });
  it('returns unsupported for undefined', () => {
    expect(getPreviewKind(undefined)).toBe('unsupported');
  });
});
