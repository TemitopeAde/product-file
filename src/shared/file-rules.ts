// Pure validation shared by browser pre-checks and authoritative server checks.

export const MAX_FILE_SIZE_CAP_BYTES = 1024 * 1024 * 1024;
export const MAX_FILES_CAP = 20;
export const MAX_ACCEPTED_TYPES = 30;
export const MAX_INSTRUCTIONS_LENGTH = 500;

const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/(\*|[a-z0-9][a-z0-9!#$&^_.+-]*)$/;
const EXTENSION_PATTERN = /^\.[a-z0-9][a-z0-9_-]{0,15}$/;

/** Normalizes one accepted-type token: a MIME type, a `type/*` wildcard, or a `.ext`. */
export function normalizeAcceptedType(token: string): string | null {
  const value = token.trim().toLowerCase();
  if (MIME_PATTERN.test(value) || EXTENSION_PATTERN.test(value)) return value;
  return null;
}

export function fileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return null;
  return fileName.slice(dot).toLowerCase();
}

export function isAcceptedFile(fileName: string, mimeType: string, acceptedTypes: readonly string[]): boolean {
  if (acceptedTypes.length === 0) return true;
  const mime = mimeType.trim().toLowerCase();
  const ext = fileExtension(fileName);
  return acceptedTypes.some((token) => {
    if (token.startsWith('.')) return ext === token;
    if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
}

/** Browser `accept` attribute for a file input. */
export function acceptAttribute(acceptedTypes: readonly string[]): string {
  return acceptedTypes.join(',');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit] ?? 'B'}`;
}

/** Wix Media `mediaType` values compatible with a declared MIME type. */
export function compatibleMediaTypes(mimeType: string): readonly string[] {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith('image/')) return ['IMAGE', 'VECTOR'];
  if (mime.startsWith('video/')) return ['VIDEO'];
  if (mime.startsWith('audio/')) return ['AUDIO'];
  if (mime.startsWith('model/')) return ['MODEL3D', 'OTHER'];
  if (['application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed'].includes(mime)) {
    return ['ARCHIVE', 'OTHER'];
  }
  return ['DOCUMENT', 'OTHER', 'ARCHIVE', 'VECTOR', 'UNKNOWN'];
}
