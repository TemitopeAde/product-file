// Atomic monthly quota on top of Wix Data, which has no transactions or locks. Each counted
// upload claims a slot item whose `_id` is `<period>-<sequence>`. Claiming inserts sequence
// max+1; a concurrent claimant that read the same state collides on the same `_id` (Wix Data
// rejects duplicate IDs), re-reads, and sees the new count. So at 9/10, exactly one of any
// number of concurrent claims succeeds. Slots are never deleted; releasing marks them RELEASED.

export type SlotState = 'ACTIVE' | 'COMPLETED' | 'RELEASED';

export interface Slot {
  id: string;
  periodKey: string;
  seq: number;
  uploadId: string;
  state: SlotState;
  expiresAt: Date;
}

export interface SlotStore {
  /** All slots of the period, read consistently. */
  list(periodKey: string): Promise<Slot[]>;
  /** Inserts a slot; false when a slot with the same id already exists. */
  insert(slot: Slot): Promise<boolean>;
  /** ACTIVE → RELEASED only if still ACTIVE and expired. */
  releaseExpired(slot: Slot, now: Date): Promise<void>;
}

export type ClaimResult =
  | { ok: true; slotId: string; used: number; limit: number }
  | { ok: false; code: 'MONTHLY_UPLOAD_LIMIT_REACHED'; used: number; limit: number }
  | { ok: false; code: 'BUSY'; used: number; limit: number };

export function periodKey(periodStart: Date): string {
  return periodStart.toISOString().slice(0, 10).replaceAll('-', '');
}

export function slotId(key: string, seq: number): string {
  return `${key}-${seq}`;
}

export function countsTowardUsage(slot: Slot, now: Date): boolean {
  return slot.state === 'COMPLETED' || (slot.state === 'ACTIVE' && slot.expiresAt.getTime() >= now.getTime());
}

export function usedSlots(slots: readonly Slot[], now: Date): number {
  return slots.filter((slot) => countsTowardUsage(slot, now)).length;
}

export async function claimSlot(
  store: SlotStore,
  params: { periodKey: string; limit: number; uploadId: string; expiresAt: Date; now: Date; maxAttempts?: number },
): Promise<ClaimResult> {
  const attempts = params.maxAttempts ?? 4;
  let used = 0;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const slots = await store.list(params.periodKey);
    const expired = slots.filter((s) => s.state === 'ACTIVE' && s.expiresAt.getTime() < params.now.getTime());
    await Promise.all(expired.map((s) => store.releaseExpired(s, params.now)));
    used = usedSlots(slots, params.now);
    if (used >= params.limit) return { ok: false, code: 'MONTHLY_UPLOAD_LIMIT_REACHED', used, limit: params.limit };
    const seq = slots.reduce((max, s) => Math.max(max, s.seq), 0) + 1;
    const slot: Slot = {
      id: slotId(params.periodKey, seq),
      periodKey: params.periodKey,
      seq,
      uploadId: params.uploadId,
      state: 'ACTIVE',
      expiresAt: params.expiresAt,
    };
    if (await store.insert(slot)) return { ok: true, slotId: slot.id, used: used + 1, limit: params.limit };
  }
  return { ok: false, code: 'BUSY', used, limit: params.limit };
}
