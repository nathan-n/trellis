// Classifies a file by MIME type for the Document Vault preview flow.
// Returns the render strategy the preview dialog should use, or
// 'unsupported' so the UI can surface a graceful fallback.

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

// Image MIME types we can render inline with <img>. HEIC/HEIF are
// intentionally excluded: Safari renders them, every other browser
// does not, so the inconsistency isn't worth trying to paper over —
// the unsupported fallback (download to view) is more honest.
const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml', // SVG is safe rendered via <img> — scripts don't execute there
  'image/bmp',
]);

// Text MIME types we can render inline after a fetch → <pre>.
const TEXT_TYPES = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
]);

/**
 * Map a MIME type (as stored on VaultDocument.fileType) to the preview
 * strategy the dialog should use. Case-insensitive; whitespace-tolerant.
 */
export function getPreviewKind(fileType: string | null | undefined): PreviewKind {
  if (!fileType) return 'unsupported';
  const normalized = fileType.trim().toLowerCase();
  if (normalized === 'application/pdf') return 'pdf';
  if (IMAGE_TYPES.has(normalized)) return 'image';
  if (TEXT_TYPES.has(normalized)) return 'text';
  return 'unsupported';
}
