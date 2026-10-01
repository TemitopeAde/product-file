import type { AppSettings, RuleDefaults, StorefrontText } from '../../shared/types';
import { MAX_ACCEPTED_TYPES, MAX_FILE_SIZE_CAP_BYTES, MAX_FILES_CAP, normalizeAcceptedType } from '../../shared/file-rules';
import { ApiError } from '../errors';

export const DEFAULT_SETTINGS: AppSettings = {
  storefront: {
    productPageTitle: 'Upload your files',
    productPageHelp: 'Add the files we need for this item. You can also attach them at checkout.',
    checkoutTitle: 'Files for your order',
    checkoutHelp: 'Attach the files for each item before placing your order.',
  },
  defaults: {
    acceptedTypes: ['image/*', 'application/pdf'],
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxFiles: 3,
  },
};

const TEXT_LIMITS: Record<keyof StorefrontText, number> = {
  productPageTitle: 80,
  productPageHelp: 300,
  checkoutTitle: 80,
  checkoutHelp: 300,
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Reads stored settings leniently, falling back to defaults for anything missing or malformed. */
export function normalizeSettings(raw: unknown): AppSettings {
  const source = record(raw);
  const storefront = record(source['storefront']);
  const defaults = record(source['defaults']);
  const text = { ...DEFAULT_SETTINGS.storefront };
  for (const key of Object.keys(TEXT_LIMITS) as (keyof StorefrontText)[]) {
    const value = storefront[key];
    if (typeof value === 'string' && value.length <= TEXT_LIMITS[key]) text[key] = value;
  }
  const accepted = Array.isArray(defaults['acceptedTypes'])
    ? defaults['acceptedTypes'].map((t) => (typeof t === 'string' ? normalizeAcceptedType(t) : null)).filter((t): t is string => t !== null)
    : DEFAULT_SETTINGS.defaults.acceptedTypes;
  const size = defaults['maxFileSizeBytes'];
  const files = defaults['maxFiles'];
  return {
    storefront: text,
    defaults: {
      acceptedTypes: accepted,
      maxFileSizeBytes:
        typeof size === 'number' && size > 0 && size <= MAX_FILE_SIZE_CAP_BYTES ? size : DEFAULT_SETTINGS.defaults.maxFileSizeBytes,
      maxFiles: typeof files === 'number' && Number.isInteger(files) && files >= 1 && files <= MAX_FILES_CAP ? files : DEFAULT_SETTINGS.defaults.maxFiles,
    },
  };
}

/** Strictly validates settings submitted from the dashboard. */
export function parseSettingsInput(body: Record<string, unknown>): AppSettings {
  const storefront = record(body['storefront']);
  const defaults = record(body['defaults']);
  const text = {} as StorefrontText;
  for (const key of Object.keys(TEXT_LIMITS) as (keyof StorefrontText)[]) {
    const value = storefront[key];
    if (typeof value !== 'string' || value.length > TEXT_LIMITS[key]) {
      throw new ApiError('INVALID_REQUEST', `"${key}" must be at most ${TEXT_LIMITS[key]} characters.`);
    }
    text[key] = value.trim();
  }
  if (text.productPageTitle.length === 0 || text.checkoutTitle.length === 0) {
    throw new ApiError('INVALID_REQUEST', 'Titles cannot be empty.');
  }
  return { storefront: text, defaults: parseRuleDefaults(defaults) };
}

function parseRuleDefaults(defaults: Record<string, unknown>): RuleDefaults {
  const acceptedTypes = parseAcceptedTypes(defaults['acceptedTypes']);
  const maxFileSizeBytes = defaults['maxFileSizeBytes'];
  const maxFiles = defaults['maxFiles'];
  if (typeof maxFileSizeBytes !== 'number' || !Number.isInteger(maxFileSizeBytes) || maxFileSizeBytes < 1 || maxFileSizeBytes > MAX_FILE_SIZE_CAP_BYTES) {
    throw new ApiError('INVALID_REQUEST', 'Default maximum file size is out of range.');
  }
  if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > MAX_FILES_CAP) {
    throw new ApiError('INVALID_REQUEST', `Default maximum file count must be between 1 and ${MAX_FILES_CAP}.`);
  }
  return { acceptedTypes, maxFileSizeBytes, maxFiles };
}

export function parseAcceptedTypes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_ACCEPTED_TYPES) {
    throw new ApiError('INVALID_REQUEST', `Accepted types must be a list of at most ${MAX_ACCEPTED_TYPES} entries.`);
  }
  const normalized: string[] = [];
  for (const item of value) {
    const token = typeof item === 'string' ? normalizeAcceptedType(item) : null;
    if (!token) throw new ApiError('INVALID_REQUEST', `"${String(item)}" is not a MIME type (image/png, image/*) or extension (.pdf).`);
    if (!normalized.includes(token)) normalized.push(token);
  }
  if (normalized.length === 0) throw new ApiError('INVALID_REQUEST', 'Choose at least one accepted file type.');
  return normalized;
}
