// Pure validation shared by browser pre-checks and authoritative server checks.
import { FORMAT_GROUPS, formatForExtension, groupExtensions, isKnownMimeType, LARGEST_WIX_FILE_BYTES, type WixFormat } from './wix-media-formats';

export const MAX_FILE_SIZE_CAP_BYTES = LARGEST_WIX_FILE_BYTES;
export const MAX_FILES_CAP = 20;
export const MAX_ACCEPTED_TYPES = 250;
export const MAX_INSTRUCTIONS_LENGTH = 500;

const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/(\*|[a-z0-9][a-z0-9!#$&^_.+-]*)$/;
const EXTENSION_PATTERN = /^\.[a-z0-9][a-z0-9_-]{0,15}$/;

/** Normalizes one accepted-type token: a MIME type, a `type/*` wildcard, or a `.ext`. */
export function normalizeAcceptedType(token: string): string | null {
  const value = token.trim().toLowerCase();
  if (MIME_PATTERN.test(value) || EXTENSION_PATTERN.test(value)) return value;
  return null;
}

const WILDCARD_FAMILIES = new Set(['image', 'video', 'audio', 'model']);

/** Whether Wix Media can store files matching this accepted-type token. */
export function isSupportedAcceptedType(token: string): boolean {
  if (token.startsWith('.')) return formatForExtension(token) !== null;
  const [family, subtype] = token.split('/');
  if (subtype === '*') return WILDCARD_FAMILIES.has(family ?? '');
  return isKnownMimeType(token);
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

export function wixFormatFor(fileName: string): WixFormat | null {
  return formatForExtension(fileExtension(fileName));
}

/**
 * MIME type to declare to Wix. Browsers often report nothing for design, RAW, 3D, and archive
 * files, and Wix rejects a MIME type that does not match the extension, so known extensions
 * always use the catalog's canonical type.
 */
export function resolveMimeType(fileName: string, browserType: string): string {
  const known = wixFormatFor(fileName);
  if (known) return known.mimeType;
  const type = browserType.trim().toLowerCase();
  return type.length > 0 ? type : 'application/octet-stream';
}

/** The smaller of the merchant's limit and Wix's limit for this format. */
export function effectiveMaxBytes(ruleMaxBytes: number, fileName: string): number {
  const format = wixFormatFor(fileName);
  return format ? Math.min(ruleMaxBytes, format.maxBytes) : ruleMaxBytes;
}

export type FileCheck =
  | { ok: true; mimeType: string; maxBytes: number }
  | { ok: false; reason: 'UNSUPPORTED_BY_WIX' | 'NOT_ACCEPTED'; mimeType: string; maxBytes: number }
  | { ok: false; reason: 'TOO_LARGE'; mimeType: string; maxBytes: number; limitedByWix: boolean };

/** One check for a candidate file, shared by the storefront and the server. */
export function checkFile(
  file: { name: string; type: string; size: number },
  rule: { acceptedTypes: readonly string[]; maxFileSizeBytes: number },
): FileCheck {
  const mimeType = resolveMimeType(file.name, file.type);
  const format = wixFormatFor(file.name);
  const maxBytes = effectiveMaxBytes(rule.maxFileSizeBytes, file.name);
  if (!format) return { ok: false, reason: 'UNSUPPORTED_BY_WIX', mimeType, maxBytes };
  if (!isAcceptedFile(file.name, mimeType, rule.acceptedTypes)) return { ok: false, reason: 'NOT_ACCEPTED', mimeType, maxBytes };
  if (file.size > maxBytes) return { ok: false, reason: 'TOO_LARGE', mimeType, maxBytes, limitedByWix: maxBytes < rule.maxFileSizeBytes };
  return { ok: true, mimeType, maxBytes };
}

/**
 * Short labels for a rule's accepted types: a whole Wix group (or a wildcard) collapses to the
 * group's name; anything else is shown as an uppercase extension or MIME subtype.
 */
export function describeAcceptedTypes(tokens: readonly string[]): string[] {
  const remaining = new Set(tokens);
  const labels: string[] = [];
  for (const family of ['image', 'video', 'audio', 'model']) {
    const wildcard = `${family}/*`;
    if (remaining.delete(wildcard)) labels.push(family === 'model' ? '3D models' : family === 'image' ? 'images' : family === 'video' ? 'videos' : 'audio');
  }
  for (const group of FORMAT_GROUPS) {
    const extensions = groupExtensions(group);
    if (extensions.every((ext) => remaining.has(ext))) {
      extensions.forEach((ext) => remaining.delete(ext));
      labels.push(group.name);
    }
  }
  for (const token of remaining) {
    labels.push(token.startsWith('.') ? token.slice(1).toUpperCase() : (token.split('/')[1] ?? token).toUpperCase());
  }
  return labels;
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

/** Wix Media `mediaType` values a genuine file with this name and MIME type can be classified as. */
export function compatibleMediaTypes(fileName: string, mimeType: string): readonly string[] {
  const format = wixFormatFor(fileName);
  if (format) return format.group.mediaTypes;
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
