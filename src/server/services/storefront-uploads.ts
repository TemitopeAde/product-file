import type { ReserveUploadRequest, UploadRecord, UploadSession } from '../../shared/types';
import { isAcceptedFile } from '../../shared/file-rules';
import type { Caller } from '../auth';
import { RESERVATION_TTL_MS, VISITOR_ACTIVE_UPLOAD_CAP, VISITOR_DAILY_UPLOAD_CAP } from '../config';
import { claimQuotaSlot, releaseSlot } from '../data/quota';
import { getRule } from '../data/rules';
import * as uploads from '../data/uploads';
import { ApiError } from '../errors';
import { getOwnedCart } from '../wix/cart';
import { createResumableUpload, trashFiles } from '../wix/media';
import { getAccessContext } from './access';
import { finalizeUpload } from './finalize';
import { endUpload, extendUpload } from './upload-lifecycle';

const ACTIVE = new Set<string>(['RESERVED', 'UPLOADING']);

async function getOwnedUpload(caller: Caller, id: string): Promise<uploads.UploadRow> {
  const upload = await uploads.getUpload(id, true);
  if (!upload || upload.ownerId !== caller.subjectId) throw new ApiError('NOT_FOUND', 'Upload not found.');
  return upload;
}

function session(upload: uploads.UploadRow): UploadSession {
  if (!upload.wixUploadUrl || !upload.wixUploadToken) throw new ApiError('CONFLICT', 'This upload has no active session.');
  return { upload: uploads.toPublicUpload(upload), uploadUrl: upload.wixUploadUrl, uploadToken: upload.wixUploadToken };
}

const expired = () => new ApiError('RESERVATION_EXPIRED', 'This upload expired. Please choose the file again.');

export async function reserveUpload(caller: Caller, req: ReserveUploadRequest): Promise<UploadSession> {
  const rule = await getRule(req.productId);
  if (!rule || !rule.enabled) throw new ApiError('UPLOADS_NOT_ENABLED', 'File uploads are not available for this product.');
  if (!isAcceptedFile(req.fileName, req.mimeType, rule.acceptedTypes)) {
    throw new ApiError('FILE_TYPE_NOT_ACCEPTED', 'This file type is not accepted for this product.');
  }
  if (req.sizeBytes > rule.maxFileSizeBytes) {
    throw new ApiError('FILE_TOO_LARGE', 'This file is larger than the store allows.', { maxBytes: rule.maxFileSizeBytes });
  }

  let binding: { cartId: string; purchaseFlowId: string | null; lineItemId: string } | null = null;
  if (req.source === 'CHECKOUT') {
    if (!req.checkoutId || !req.lineItemId) throw new ApiError('INVALID_REQUEST', 'Checkout uploads need a checkout and line item.');
    const cart = await getOwnedCart(req.checkoutId, caller);
    const item = cart.lineItems.find((li) => li.id === req.lineItemId);
    if (!item || item.productId !== req.productId || cart.orderPlaced) throw new ApiError('NOT_FOUND', 'Line item not found.');
    const bound = (await uploads.listBoundToCart(cart.id)).filter((u) => u.binding?.lineItemId === item.id && uploads.LIVE_STATUSES.includes(u.status));
    if (bound.length >= rule.maxFiles) throw new ApiError('MAX_FILES_REACHED', `This item accepts up to ${rule.maxFiles} file(s).`);
    binding = { cartId: cart.id, purchaseFlowId: cart.purchaseFlowId, lineItemId: item.id };
  } else {
    const pending = await uploads.listUnboundForOwner(caller.subjectId, [req.productId]);
    if (pending.length >= rule.maxFiles) throw new ApiError('MAX_FILES_REACHED', `This product accepts up to ${rule.maxFiles} file(s).`);
  }

  const [active, today] = await Promise.all([
    uploads.countOwnerActive(caller.subjectId),
    uploads.countOwnerSince(caller.subjectId, new Date(Date.now() - 86_400_000)),
  ]);
  if (active >= VISITOR_ACTIVE_UPLOAD_CAP) throw new ApiError('TOO_MANY_ACTIVE_UPLOADS', 'Finish your current uploads before starting more.');
  if (today >= VISITOR_DAILY_UPLOAD_CAP) throw new ApiError('VISITOR_DAILY_LIMIT_REACHED', 'You have uploaded the maximum number of files for today.');

  const { access, period } = await getAccessContext(caller.instanceId);
  const id = crypto.randomUUID();
  const label = `pfu-${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
  await uploads.createUpload({
    id,
    ownerType: caller.subjectType,
    ownerId: caller.subjectId,
    productId: req.productId,
    productName: rule.productName,
    variantId: req.variantId,
    source: req.source,
    fileName: req.fileName,
    mimeType: req.mimeType,
    declaredSizeBytes: req.sizeBytes,
    maxFileSizeBytes: rule.maxFileSizeBytes,
    reservationLabel: label,
    expiresAt,
  });

  let slotId: string | null = null;
  if (!access.unlimited && access.monthlyLimit !== null) {
    const claim = await claimQuotaSlot(period.start, access.monthlyLimit, id, expiresAt);
    if (!claim.ok) {
      await uploads.markTerminal(id, 'CANCELLED', claim.code);
      if (claim.code === 'MONTHLY_UPLOAD_LIMIT_REACHED') {
        throw new ApiError('MONTHLY_UPLOAD_LIMIT_REACHED', 'This store has reached its monthly file upload limit.', {
          used: claim.used,
          limit: claim.limit,
          remaining: Math.max(0, claim.limit - claim.used),
        });
      }
      throw new ApiError('CONFLICT', 'Many uploads are starting at once. Please try again.');
    }
    slotId = claim.slotId;
  }

  try {
    const wixSession = await createResumableUpload(req.mimeType, req.fileName, label);
    await uploads.setSession(id, wixSession.uploadUrl, wixSession.uploadToken, expiresAt, slotId);
    if (binding) await uploads.bindToLineItem(id, binding);
  } catch (error) {
    await uploads.markTerminal(id, 'FAILED', 'SESSION_START_FAILED');
    if (slotId) await releaseSlot(slotId);
    throw error;
  }
  return session(await getOwnedUpload(caller, id));
}

/** Returns the same Wix session and reservation, extending it, so retries never consume a new slot. */
export async function resumeUpload(caller: Caller, id: string): Promise<UploadSession | { upload: UploadRecord }> {
  const upload = await getOwnedUpload(caller, id);
  if (!ACTIVE.has(upload.status)) {
    if (upload.status === 'EXPIRED') throw expired();
    return { upload: uploads.toPublicUpload(upload) };
  }
  if (!(await extendUpload(upload, new Date(Date.now() + RESERVATION_TTL_MS)))) throw expired();
  return session(await getOwnedUpload(caller, id));
}

/** Issues a fresh Wix upload URL for the same reservation when Wix rejects the old session. */
export async function renewUpload(caller: Caller, id: string): Promise<UploadSession> {
  const upload = await getOwnedUpload(caller, id);
  if (!ACTIVE.has(upload.status) || upload.wixFileId) throw new ApiError('CONFLICT', 'This upload can no longer be restarted.');
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);
  if (!(await extendUpload(upload, expiresAt))) throw expired();
  const wixSession = await createResumableUpload(upload.mimeType, upload.fileName, upload.reservationLabel);
  await uploads.setSession(id, wixSession.uploadUrl, wixSession.uploadToken, expiresAt, upload.quotaSlotId);
  return session(await getOwnedUpload(caller, id));
}

export async function completeUpload(caller: Caller, id: string, fileId: string): Promise<UploadRecord> {
  const upload = await getOwnedUpload(caller, id);
  if (upload.status === 'READY' || upload.status === 'DELETED') return uploads.toPublicUpload(upload);
  if (upload.status === 'EXPIRED' && !upload.wixFileId) throw expired();
  if (upload.wixFileId && upload.wixFileId !== fileId) throw new ApiError('CONFLICT', 'This upload already has a different file.');
  return uploads.toPublicUpload(await finalizeUpload(caller.instanceId, upload, fileId));
}

/** Polling endpoint; re-checks Wix Media for files whose processing finished late. */
export async function getUploadStatus(caller: Caller, id: string): Promise<UploadRecord> {
  const upload = await getOwnedUpload(caller, id);
  if (upload.status === 'PROCESSING' && upload.wixFileId) {
    return uploads.toPublicUpload(await finalizeUpload(caller.instanceId, upload, upload.wixFileId));
  }
  return uploads.toPublicUpload(upload);
}

/** Cancels an in-flight upload (releasing its slot) or removes the caller's own unordered file. */
export async function cancelUpload(caller: Caller, id: string): Promise<void> {
  const upload = await getOwnedUpload(caller, id);
  if (upload.binding?.orderId) throw new ApiError('CONFLICT', 'Files attached to an order cannot be removed.');
  if (ACTIVE.has(upload.status) || upload.status === 'PROCESSING') {
    await endUpload(upload, 'CANCELLED', 'CANCELLED_BY_CUSTOMER');
  } else if (upload.status === 'READY') {
    await uploads.markDeleted(id);
  }
  if (upload.binding) await uploads.unbind(id, upload.binding.cartId);
  if (upload.wixFileId) await trashFiles([upload.wixFileId]);
}

/** The browser reports an upload it cannot recover (for example, Wix rejected the file). */
export async function failUpload(caller: Caller, id: string, reason: string): Promise<void> {
  const upload = await getOwnedUpload(caller, id);
  if (!ACTIVE.has(upload.status)) return;
  await endUpload(upload, 'FAILED', reason.slice(0, 120));
}
