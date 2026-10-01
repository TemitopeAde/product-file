import type { LinkStatus, UploadRecord, UploadSource, UploadStatus } from '../../shared/types';
import {
  countItems,
  filter,
  findAll,
  findPage,
  getItem,
  insertItem,
  isoOrNull,
  iso,
  num,
  orderNumberOrNull,
  patchIf,
  query,
  set,
  str,
  strOrNull,
  type DataItem,
  type FieldModification,
} from './client';

export const ACTIVE_STATUSES: UploadStatus[] = ['RESERVED', 'UPLOADING', 'PROCESSING'];
export const LIVE_STATUSES: UploadStatus[] = [...ACTIVE_STATUSES, 'READY'];
const LINK_STATUSES: readonly LinkStatus[] = ['PENDING', 'LINKED', 'UNRESOLVED'];

export interface UploadRow extends UploadRecord {
  ownerType: string;
  ownerId: string;
  reservationLabel: string;
  quotaSlotId: string | null;
  wixUploadUrl: string | null;
  wixUploadToken: string | null;
  wixFileId: string | null;
  maxFileSizeBytes: number;
  expiresAt: string;
  purchaseFlowId: string | null;
}

function toUpload(item: DataItem, now = Date.now()): UploadRow {
  const stored = str(item['status']) as UploadStatus;
  const expiresAt = iso(item['expiresAt']);
  // Abandoned reservations are expired as soon as their deadline passes, even before cleanup.
  const status: UploadStatus = ACTIVE_STATUSES.includes(stored) && Date.parse(expiresAt) < now ? 'EXPIRED' : stored;
  const lineItemId = strOrNull(item['lineItemId']);
  const linkStatus = str(item['linkStatus']) as LinkStatus;
  const declared = num(item['declaredSizeBytes']);
  return {
    id: item._id,
    ownerType: str(item['ownerType']),
    ownerId: str(item['ownerId']),
    productId: str(item['productId']),
    productName: strOrNull(item['productName']),
    variantId: strOrNull(item['variantId']),
    source: str(item['source']) === 'CHECKOUT' ? 'CHECKOUT' : ('PRODUCT_PAGE' satisfies UploadSource),
    fileName: str(item['fileName']),
    mimeType: str(item['mimeType']),
    sizeBytes: item['sizeBytes'] === undefined || item['sizeBytes'] === null ? declared : num(item['sizeBytes']),
    status,
    failureReason: strOrNull(item['failureReason']),
    createdAt: iso(item._createdDate),
    completedAt: isoOrNull(item['completedAt']),
    binding: lineItemId
      ? {
          lineItemId,
          cartId: str(item['cartId']),
          orderId: strOrNull(item['orderId']),
          orderNumber: orderNumberOrNull(item['orderNumber']),
          linkStatus: LINK_STATUSES.includes(linkStatus) ? linkStatus : 'PENDING',
        }
      : null,
    reservationLabel: str(item['reservationLabel']),
    quotaSlotId: strOrNull(item['quotaSlotId']),
    wixUploadUrl: strOrNull(item['wixUploadUrl']),
    wixUploadToken: strOrNull(item['wixUploadToken']),
    wixFileId: strOrNull(item['wixFileId']),
    maxFileSizeBytes: num(item['maxFileSizeBytes']),
    expiresAt,
    purchaseFlowId: strOrNull(item['purchaseFlowId']),
  };
}

export function toPublicUpload(row: UploadRow): UploadRecord {
  const { ownerType, ownerId, reservationLabel, quotaSlotId, wixUploadUrl, wixUploadToken, wixFileId, maxFileSizeBytes, expiresAt, purchaseFlowId, ...rest } = row;
  return rest;
}

const isActive = () => filter().hasSome('status', ACTIVE_STATUSES);
const notExpired = () => filter().ge('expiresAt', new Date());

export interface NewUpload {
  id: string;
  ownerType: string;
  ownerId: string;
  productId: string;
  productName: string;
  variantId: string | null;
  source: UploadSource;
  fileName: string;
  mimeType: string;
  declaredSizeBytes: number;
  maxFileSizeBytes: number;
  reservationLabel: string;
  expiresAt: Date;
}

export async function createUpload(upload: NewUpload): Promise<void> {
  const { id, variantId, ...fields } = upload;
  await insertItem('uploads', { _id: id, ...fields, ...(variantId ? { variantId } : {}), status: 'RESERVED', revision: 0 });
}

export async function getUpload(id: string, consistent = false): Promise<UploadRow | null> {
  const item = await getItem('uploads', id, consistent);
  return item ? toUpload(item) : null;
}

export async function getUploadByLabel(label: string): Promise<UploadRow | null> {
  const { items } = await findPage('uploads', query('uploads').eq('reservationLabel', label).limit(1), true);
  return items[0] ? toUpload(items[0]) : null;
}

export async function listByIds(ids: readonly string[]): Promise<UploadRow[]> {
  if (ids.length === 0) return [];
  const found = await findAll('uploads', query('uploads').hasSome('_id', [...ids]).ascending('_createdDate'), true);
  return found.map((item) => toUpload(item));
}

export async function patchUpload(id: string, modifications: FieldModification[], condition: ReturnType<typeof filter> | null): Promise<boolean> {
  return patchIf('uploads', id, [...modifications, { fieldPath: 'revision', action: 'INCREMENT_FIELD', value: 1 }], condition);
}

export async function setSession(id: string, uploadUrl: string, uploadToken: string, expiresAt: Date, quotaSlotId: string | null): Promise<boolean> {
  return patchUpload(id, [set('wixUploadUrl', uploadUrl), set('wixUploadToken', uploadToken), set('expiresAt', expiresAt), set('quotaSlotId', quotaSlotId)], isActive());
}

/** Marks an active, unexpired reservation as uploading and extends it. */
export async function touchActive(id: string, expiresAt: Date): Promise<boolean> {
  return patchUpload(id, [set('status', 'UPLOADING'), set('expiresAt', expiresAt)], filter().hasSome('status', ['RESERVED', 'UPLOADING']).and(notExpired()));
}

export async function claimFile(id: string, fileId: string): Promise<boolean> {
  const unclaimed = filter().isEmpty('wixFileId').or(filter().eq('wixFileId', fileId));
  return patchUpload(id, [set('wixFileId', fileId)], isActive().and(unclaimed));
}

export async function markProcessing(id: string): Promise<void> {
  await patchUpload(id, [set('status', 'PROCESSING')], filter().hasSome('status', ['RESERVED', 'UPLOADING']));
}

/** Only one caller moves an upload to READY, so completion side effects run exactly once. */
export async function markReady(id: string, sizeBytes: number, mediaType: string): Promise<boolean> {
  return patchUpload(
    id,
    [set('status', 'READY'), set('sizeBytes', sizeBytes), set('mediaType', mediaType), set('completedAt', new Date()), set('wixUploadToken', null)],
    isActive(),
  );
}

export async function markTerminal(id: string, status: 'FAILED' | 'CANCELLED' | 'EXPIRED', reason: string): Promise<boolean> {
  return patchUpload(id, [set('status', status), set('failureReason', reason), set('wixUploadToken', null)], isActive());
}

export async function markDeleted(id: string): Promise<boolean> {
  return patchUpload(id, [set('status', 'DELETED')], filter().eq('status', 'READY'));
}

export async function countOwnerActive(ownerId: string): Promise<number> {
  return countItems('uploads', query('uploads').eq('ownerId', ownerId).and(isActive()).and(notExpired()));
}

export async function countOwnerSince(ownerId: string, since: Date): Promise<number> {
  return countItems(
    'uploads',
    query('uploads').eq('ownerId', ownerId).ge('_createdDate', since).and(filter().hasSome('status', [...LIVE_STATUSES, 'DELETED'])),
  );
}

/** The caller's live files for these products that are not attached to a line item yet. */
export async function listUnboundForOwner(ownerId: string, productIds: readonly string[]): Promise<UploadRow[]> {
  if (productIds.length === 0) return [];
  const found = await findAll(
    'uploads',
    query('uploads').eq('ownerId', ownerId).hasSome('productId', [...productIds]).isEmpty('lineItemId').hasSome('status', LIVE_STATUSES).ascending('_createdDate'),
    true,
    200,
  );
  return found.map((item) => toUpload(item)).filter((u) => LIVE_STATUSES.includes(u.status));
}

export async function listBoundToCart(cartId: string): Promise<UploadRow[]> {
  const found = await findAll('uploads', query('uploads').eq('cartId', cartId).ascending('_createdDate'), true, 500);
  return found.map((item) => toUpload(item));
}

export async function bindToLineItem(id: string, binding: { cartId: string; purchaseFlowId: string | null; lineItemId: string }): Promise<boolean> {
  return patchUpload(
    id,
    [set('cartId', binding.cartId), set('purchaseFlowId', binding.purchaseFlowId), set('lineItemId', binding.lineItemId), set('linkStatus', 'PENDING')],
    filter().isEmpty('orderId'),
  );
}

export async function unbind(id: string, cartId: string): Promise<boolean> {
  return patchUpload(id, [set('cartId', null), set('purchaseFlowId', null), set('lineItemId', null), set('linkStatus', null)], filter().eq('cartId', cartId).isEmpty('orderId'));
}

/** Ready-file counts per checkout line item, read consistently for the validation hot path. */
export async function readyCountsForPurchaseFlow(purchaseFlowId: string): Promise<Map<string, number>> {
  const found = await findAll('uploads', query('uploads').eq('purchaseFlowId', purchaseFlowId).isEmpty('orderId').eq('status', 'READY'), true, 500);
  const counts = new Map<string, number>();
  for (const item of found) {
    const lineItemId = str(item['lineItemId']);
    if (lineItemId) counts.set(lineItemId, (counts.get(lineItemId) ?? 0) + 1);
  }
  return counts;
}

export interface LinkResult {
  linked: number;
  unresolved: number;
}

/**
 * Links a checkout's bound files to its order. A file links only when its checkout line-item ID
 * is in the order; a file for a product that is in the order under another line-item ID is marked
 * UNRESOLVED for review, never guessed. Files for products absent from the order stay unattached.
 * Each file is claimed with a conditional patch, so redelivered events link nothing twice.
 */
export async function linkOrder(
  order: { orderId: string; orderNumber: string | null; checkoutId: string | null; purchaseFlowId: string | null },
  orderLineItems: readonly { id: string; productId: string | null }[],
): Promise<LinkResult> {
  const scope = order.checkoutId && order.purchaseFlowId
    ? filter().eq('cartId', order.checkoutId).or(filter().eq('purchaseFlowId', order.purchaseFlowId))
    : order.checkoutId
      ? filter().eq('cartId', order.checkoutId)
      : filter().eq('purchaseFlowId', order.purchaseFlowId ?? '');
  const candidates = await findAll('uploads', query('uploads').and(scope).isEmpty('orderId').isNotEmpty('lineItemId'), true, 500);
  const lineItemIds = new Set(orderLineItems.map((li) => li.id));
  const productIds = new Set(orderLineItems.map((li) => li.productId).filter((p): p is string => p !== null));
  const result: LinkResult = { linked: 0, unresolved: 0 };
  for (const item of candidates) {
    const lineItemId = str(item['lineItemId']);
    const exact = lineItemIds.has(lineItemId);
    if (!exact && !productIds.has(str(item['productId']))) continue;
    const linkStatus: LinkStatus = exact ? 'LINKED' : 'UNRESOLVED';
    const claimed = await patchUpload(
      item._id,
      [set('orderId', order.orderId), set('orderNumber', order.orderNumber), set('linkStatus', linkStatus)],
      filter().isEmpty('orderId'),
    );
    if (claimed) result[exact ? 'linked' : 'unresolved'] += 1;
  }
  return result;
}

/** Copies a newly assigned order number onto the order's linked files. */
export async function setOrderNumberForOrder(orderId: string, orderNumber: string): Promise<void> {
  const stale = await findAll('uploads', query('uploads').eq('orderId', orderId).ne('orderNumber', orderNumber), true, 500);
  for (const item of stale) await patchUpload(item._id, [set('orderNumber', orderNumber)], filter().eq('orderId', orderId));
}

export async function uploadsForOrder(orderId: string): Promise<UploadRow[]> {
  const found = await findAll('uploads', query('uploads').eq('orderId', orderId).ascending('_createdDate'), true, 500);
  return found.map((item) => toUpload(item));
}

export async function listUploadsForOrder(params: {
  orderId: string;
  search: string | null;
  offset: number;
  limit: number;
}): Promise<{ rows: UploadRow[]; hasNext: boolean }> {
  let q = query('uploads').eq('orderId', params.orderId);
  if (params.search) {
    q = q.and(filter().contains('fileName', params.search).or(filter().contains('productName', params.search)));
  }
  const page = await findPage('uploads', q.ascending('_createdDate').skip(params.offset).limit(params.limit), true);
  return { rows: page.items.map((item) => toUpload(item)), hasNext: page.hasNext };
}

export async function countOrderLinks(orderId: string): Promise<LinkResult> {
  const rows = await uploadsForOrder(orderId);
  return {
    linked: rows.filter((r) => r.binding?.linkStatus === 'LINKED').length,
    unresolved: rows.filter((r) => r.binding?.linkStatus === 'UNRESOLVED').length,
  };
}

export interface UploadFilter {
  status: UploadStatus | null;
  productId: string | null;
  search: string | null;
  offset: number;
  limit: number;
}

export async function listUploads(f: UploadFilter): Promise<{ rows: UploadRow[]; hasNext: boolean }> {
  let q = query('uploads');
  if (f.status) q = q.eq('status', f.status);
  else q = q.hasSome('status', [...LIVE_STATUSES, 'FAILED', 'DELETED']);
  if (f.productId) q = q.eq('productId', f.productId);
  if (f.search) {
    const term = f.search;
    q = q.and(filter().contains('fileName', term).or(filter().contains('productName', term)).or(filter().contains('orderNumber', term)));
  }
  const page = await findPage('uploads', q.descending('_createdDate').skip(f.offset).limit(f.limit));
  return { rows: page.items.map((item) => toUpload(item)), hasNext: page.hasNext };
}

export async function dailyReadyCounts(days: number): Promise<{ date: string; uploads: number }[]> {
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1)));
  const found = await findAll('uploads', query('uploads').ge('completedAt', start).fields('completedAt'), false, 5000);
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    buckets.set(new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10), 0);
  }
  for (const item of found) {
    const day = isoOrNull(item['completedAt'])?.slice(0, 10);
    if (day && buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  }
  return [...buckets].map(([date, uploads]) => ({ date, uploads }));
}

export async function countReady(): Promise<number> {
  return countItems('uploads', query('uploads').eq('status', 'READY'));
}
