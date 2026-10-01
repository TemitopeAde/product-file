import { claimSlot, periodKey, usedSlots, type ClaimResult, type Slot, type SlotState, type SlotStore } from '../domain/quota-slots';
import { filter, findAll, insertItem, patchIf, query, set, str, num, type DataItem } from './client';

function toSlot(item: DataItem): Slot {
  const state = str(item['state']);
  const expires = item['expiresAt'];
  return {
    id: item._id,
    periodKey: str(item['periodKey']),
    seq: num(item['seq']),
    uploadId: str(item['uploadId']),
    state: state === 'COMPLETED' || state === 'RELEASED' ? state : 'ACTIVE',
    expiresAt: expires instanceof Date ? expires : new Date(str(expires)),
  };
}

const store: SlotStore = {
  async list(key) {
    return (await findAll('quota-slots', query('quota-slots').eq('periodKey', key), true, 5000)).map(toSlot);
  },
  async insert(slot) {
    return insertItem('quota-slots', {
      _id: slot.id,
      periodKey: slot.periodKey,
      seq: slot.seq,
      uploadId: slot.uploadId,
      state: slot.state,
      expiresAt: slot.expiresAt,
    });
  },
  async releaseExpired(slot, now) {
    await patchIf('quota-slots', slot.id, [set('state', 'RELEASED')], filter().eq('state', 'ACTIVE').lt('expiresAt', now));
  },
};

export async function claimQuotaSlot(periodStart: Date, limit: number, uploadId: string, expiresAt: Date): Promise<ClaimResult> {
  return claimSlot(store, { periodKey: periodKey(periodStart), limit, uploadId, expiresAt, now: new Date() });
}

async function transition(slotId: string, from: SlotState, to: SlotState, extra: ReturnType<typeof set>[] = []): Promise<boolean> {
  return patchIf('quota-slots', slotId, [set('state', to), ...extra], filter().eq('state', from));
}

/** A finished file keeps its slot for good, so it is counted exactly once. */
export async function completeSlot(slotId: string): Promise<boolean> {
  return transition(slotId, 'ACTIVE', 'COMPLETED');
}

export async function releaseSlot(slotId: string): Promise<void> {
  await transition(slotId, 'ACTIVE', 'RELEASED');
}

export async function extendSlot(slotId: string, expiresAt: Date): Promise<boolean> {
  return patchIf('quota-slots', slotId, [set('expiresAt', expiresAt)], filter().eq('state', 'ACTIVE'));
}

export async function quotaUsage(periodStart: Date): Promise<number> {
  return usedSlots(await store.list(periodKey(periodStart)), new Date());
}
