import { describe, expect, it } from 'vitest';
import { claimSlot, periodKey, slotId, usedSlots, type Slot, type SlotStore } from '../../src/server/domain/quota-slots';

const now = new Date('2026-09-29T12:00:00Z');
const later = new Date('2026-09-30T12:00:00Z');
const earlier = new Date('2026-09-28T12:00:00Z');
const KEY = periodKey(new Date('2026-09-15T00:00:00Z'));

/** In-memory store with Wix Data semantics: duplicate `_id` inserts fail, reads may interleave. */
function memoryStore(initial: Slot[] = []): SlotStore & { slots: Map<string, Slot> } {
  const slots = new Map(initial.map((s) => [s.id, { ...s }]));
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, Math.random() * 3));
  return {
    slots,
    async list(key) {
      await tick();
      return [...slots.values()].filter((s) => s.periodKey === key).map((s) => ({ ...s }));
    },
    async insert(slot) {
      await tick();
      if (slots.has(slot.id)) return false;
      slots.set(slot.id, { ...slot });
      return true;
    },
    async releaseExpired(slot, at) {
      await tick();
      const current = slots.get(slot.id);
      if (current && current.state === 'ACTIVE' && current.expiresAt.getTime() < at.getTime()) current.state = 'RELEASED';
    },
  };
}

function slot(seq: number, state: Slot['state'], expiresAt = later): Slot {
  return { id: slotId(KEY, seq), periodKey: KEY, seq, uploadId: `u${seq}`, state, expiresAt };
}

const claim = (store: SlotStore, uploadId: string, limit = 10) =>
  claimSlot(store, { periodKey: KEY, limit, uploadId, expiresAt: later, now, maxAttempts: 25 });

describe('claimSlot', () => {
  it('uses the period start date as the key', () => {
    expect(KEY).toBe('20260915');
  });

  it('permits exactly one of many concurrent reservations at 9/10', async () => {
    for (let run = 0; run < 25; run += 1) {
      const store = memoryStore(Array.from({ length: 9 }, (_, i) => slot(i + 1, 'COMPLETED')));
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => claim(store, `new-${i}`)));
      const granted = results.filter((r) => r.ok);
      expect(granted).toHaveLength(1);
      expect(results.filter((r) => !r.ok && r.code === 'MONTHLY_UPLOAD_LIMIT_REACHED')).toHaveLength(11);
      expect(usedSlots([...store.slots.values()], now)).toBe(10);
    }
  });

  it('never grants more than the limit from an empty period under concurrency', async () => {
    const store = memoryStore();
    const results = await Promise.all(Array.from({ length: 30 }, (_, i) => claim(store, `u-${i}`)));
    expect(results.filter((r) => r.ok)).toHaveLength(10);
    expect(usedSlots([...store.slots.values()], now)).toBe(10);
  });

  it('reports used, limit, and remaining when the limit is reached', async () => {
    const store = memoryStore(Array.from({ length: 10 }, (_, i) => slot(i + 1, 'COMPLETED')));
    expect(await claim(store, 'x')).toEqual({ ok: false, code: 'MONTHLY_UPLOAD_LIMIT_REACHED', used: 10, limit: 10 });
  });

  it('releases expired reservations and reuses their capacity', async () => {
    const store = memoryStore([...Array.from({ length: 9 }, (_, i) => slot(i + 1, 'COMPLETED')), slot(10, 'ACTIVE', earlier)]);
    const result = await claim(store, 'fresh');
    expect(result.ok).toBe(true);
    expect(store.slots.get(slotId(KEY, 10))?.state).toBe('RELEASED');
    expect(store.slots.get(slotId(KEY, 11))?.uploadId).toBe('fresh');
  });

  it('does not count cancelled or failed (released) reservations', async () => {
    const store = memoryStore([...Array.from({ length: 9 }, (_, i) => slot(i + 1, 'COMPLETED')), slot(10, 'RELEASED')]);
    expect((await claim(store, 'ok')).ok).toBe(true);
  });

  it('counts a completed file once regardless of retries on its reservation', () => {
    const slots = [slot(1, 'COMPLETED'), slot(2, 'ACTIVE')];
    expect(usedSlots(slots, now)).toBe(2);
  });

  it('gives up with BUSY rather than overshooting when contention never clears', async () => {
    const store = memoryStore();
    store.insert = async () => false;
    expect(await claimSlot(store, { periodKey: KEY, limit: 10, uploadId: 'x', expiresAt: later, now, maxAttempts: 3 })).toMatchObject({ ok: false, code: 'BUSY' });
  });
});
