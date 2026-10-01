// Upload state changes that must keep the monthly quota consistent.
import { claimQuotaSlot, completeSlot, extendSlot, releaseSlot } from '../data/quota';
import * as uploads from '../data/uploads';
import { getAccessContext } from './access';

/** Ends an in-flight upload and frees its Basic quota slot. */
export async function endUpload(upload: uploads.UploadRow, status: 'FAILED' | 'CANCELLED' | 'EXPIRED', reason: string): Promise<void> {
  const ended = await uploads.markTerminal(upload.id, status, reason);
  if (ended && upload.quotaSlotId) await releaseSlot(upload.quotaSlotId);
}

/** Extends a reservation and its slot together; false if the reservation already lapsed. */
export async function extendUpload(upload: uploads.UploadRow, expiresAt: Date): Promise<boolean> {
  if (upload.quotaSlotId && !(await extendSlot(upload.quotaSlotId, expiresAt))) {
    await uploads.markTerminal(upload.id, 'EXPIRED', 'RESERVATION_EXPIRED');
    return false;
  }
  if (!(await uploads.touchActive(upload.id, expiresAt))) {
    if (upload.quotaSlotId) await releaseSlot(upload.quotaSlotId);
    return false;
  }
  return true;
}

/**
 * Converts the upload's slot to a permanently counted one. If the slot was released because the
 * reservation expired before the file arrived, capacity is claimed again; false means the store
 * is out of uploads for this period and the file must be rejected.
 */
export async function commitQuota(instanceId: string, upload: uploads.UploadRow): Promise<boolean> {
  if (!upload.quotaSlotId) return true;
  if (await completeSlot(upload.quotaSlotId)) return true;
  const { access, period } = await getAccessContext(instanceId);
  if (access.unlimited || access.monthlyLimit === null) return true;
  const claim = await claimQuotaSlot(period.start, access.monthlyLimit, upload.id, new Date(Date.now() + 60_000));
  return claim.ok && (await completeSlot(claim.slotId));
}
