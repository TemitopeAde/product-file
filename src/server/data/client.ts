// Elevated access to the app's own Wix Data collections. Collections are PRIVILEGED, so only
// backend code that has already authorized its caller reads or writes them.
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import wixConfig from '../../../wix.config.json';
import { ApiError } from '../errors';

export type CollectionSuffix = 'app-settings' | 'product-rules' | 'uploads' | 'quota-slots' | 'orders' | 'validation-observations';

export function collectionId(suffix: CollectionSuffix): string {
  return `${wixConfig.namespace}/${suffix}`;
}

export type DataItem = { _id: string; _createdDate?: Date; _updatedDate?: Date } & Record<string, unknown>;

export type FieldModification =
  | { fieldPath: string; action: 'SET_FIELD'; value: unknown }
  | { fieldPath: string; action: 'REMOVE_FIELD' }
  | { fieldPath: string; action: 'INCREMENT_FIELD'; value: number };

const TRANSIENT_OR_FATAL = new Set([
  'WD_PERMISSION_DENIED',
  'WD_UNAUTHORIZED',
  'WD_TOO_MANY_REQUESTS',
  'WD_REQUEST_TIMED_OUT',
  'WD_DATABASE_QUOTA_EXCEEDED',
  'WD_SCHEMA_DOES_NOT_EXIST',
  'WD_COLLECTION_DELETED',
  'WD_SITE_IN_TEMPLATE_MODE',
]);

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') return code;
  const details = (error as { details?: { applicationError?: { code?: unknown } } }).details;
  const appCode = details?.applicationError?.code;
  return typeof appCode === 'string' ? appCode : null;
}

export function isDuplicateId(error: unknown): boolean {
  const code = errorCode(error);
  if (code === 'WD_ITEM_ALREADY_EXISTS' || code === 'WDE0074') return true;
  return error instanceof Error && /WDE0074|WD_ITEM_ALREADY_EXISTS/.test(error.message);
}

function unavailable(operation: string, collection: CollectionSuffix, error: unknown): ApiError {
  console.error(`Wix Data ${operation} failed on ${collection}`, errorCode(error), error);
  if (errorCode(error) === 'WD_SCHEMA_DOES_NOT_EXIST') {
    return new ApiError('SERVICE_UNAVAILABLE', 'The app’s data collections are not set up on this site yet. Update the app, then try again.');
  }
  return new ApiError('SERVICE_UNAVAILABLE', 'The app’s data is temporarily unavailable. Please try again.');
}

export async function getItem(collection: CollectionSuffix, id: string, consistentRead = false): Promise<DataItem | null> {
  try {
    const item = await auth.elevate(items.get)(collectionId(collection), id, { consistentRead });
    return (item as DataItem | null) ?? null;
  } catch (error) {
    throw unavailable('get', collection, error);
  }
}

/** Starts an elevated query; run it with `findAll`, `findPage`, or `countItems`. */
export type Query = items.WixDataQuery;

export function query(collection: CollectionSuffix): Query {
  return auth.elevate(items.query)(collectionId(collection));
}

export async function findPage(collection: CollectionSuffix, q: Query, consistentRead = false): Promise<{ items: DataItem[]; hasNext: boolean }> {
  try {
    const result = await q.find({ consistentRead });
    return { items: result.items as DataItem[], hasNext: result.hasNext() };
  } catch (error) {
    throw unavailable('query', collection, error);
  }
}

/** Reads every page up to `max` items. */
export async function findAll(collection: CollectionSuffix, q: Query, consistentRead = false, max = 1000): Promise<DataItem[]> {
  try {
    let result = await q.limit(Math.min(max, 1000)).find({ consistentRead });
    const all = [...(result.items as DataItem[])];
    while (result.hasNext() && all.length < max) {
      result = await result.next();
      all.push(...(result.items as DataItem[]));
    }
    return all.slice(0, max);
  } catch (error) {
    throw unavailable('query', collection, error);
  }
}

export async function countItems(collection: CollectionSuffix, q: Query): Promise<number> {
  try {
    return await q.count();
  } catch (error) {
    throw unavailable('count', collection, error);
  }
}

/** Inserts an item; returns false when an item with the same `_id` already exists. */
export async function insertItem(collection: CollectionSuffix, item: DataItem): Promise<boolean> {
  try {
    await auth.elevate(items.insert)(collectionId(collection), item);
    return true;
  } catch (error) {
    if (isDuplicateId(error)) return false;
    throw unavailable('insert', collection, error);
  }
}

export async function saveItem(collection: CollectionSuffix, item: DataItem): Promise<void> {
  try {
    await auth.elevate(items.save)(collectionId(collection), item);
  } catch (error) {
    throw unavailable('save', collection, error);
  }
}

export async function removeItem(collection: CollectionSuffix, id: string): Promise<void> {
  try {
    await auth.elevate(items.remove)(collectionId(collection), id);
  } catch (error) {
    throw unavailable('remove', collection, error);
  }
}

/**
 * Applies field modifications only when `condition` matches the stored item (compare-and-set).
 * Returns whether the item now holds the requested values. Because Wix does not document the
 * error a failed condition raises, a failed call is resolved by re-reading the item.
 */
export async function patchIf(
  collection: CollectionSuffix,
  id: string,
  modifications: FieldModification[],
  condition: items.WixDataFilter | null,
): Promise<boolean> {
  try {
    await auth.elevate(items.patch)(collectionId(collection), id, modifications, condition ? { condition } : {});
    return true;
  } catch (error) {
    const code = errorCode(error);
    if (code && TRANSIENT_OR_FATAL.has(code)) throw unavailable('patch', collection, error);
    const current = await getItem(collection, id, true);
    if (!current) return false;
    const applied = modifications.every((m) =>
      m.action === 'SET_FIELD' ? sameValue(current[m.fieldPath], m.value) : m.action === 'REMOVE_FIELD' ? current[m.fieldPath] == null : false,
    );
    if (!applied) console.warn(`Conditional patch not applied on ${collection}/${id}`, code);
    return applied;
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) return new Date(a as string).getTime() === new Date(b as string).getTime();
  return JSON.stringify(a) === JSON.stringify(b);
}

export function filter(): items.WixDataFilter {
  return items.filter();
}

export function set(fieldPath: string, value: unknown): FieldModification {
  return value === null || value === undefined ? { fieldPath, action: 'REMOVE_FIELD' } : { fieldPath, action: 'SET_FIELD', value };
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

export function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

export function isoOrNull(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : new Date(time).toISOString();
  }
  if (typeof value === 'object' && value !== null && '$date' in value) return isoOrNull((value as { $date: unknown }).$date);
  return null;
}

export function iso(value: unknown): string {
  return isoOrNull(value) ?? new Date(0).toISOString();
}

export function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
