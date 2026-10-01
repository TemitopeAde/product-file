import type { OrderSummary } from '../../shared/types';
import { countItems, filter, findPage, getItem, insertItem, iso, num, orderNumberOrNull, patchIf, query, saveItem, set, type DataItem } from './client';
import type { LinkResult } from './uploads';

function toOrder(item: DataItem): OrderSummary {
  return {
    orderId: item._id,
    orderNumber: orderNumberOrNull(item['orderNumber']),
    createdAt: iso(item['placedAt']),
    linkedFiles: num(item['linkedFiles']),
    unresolvedFiles: num(item['unresolvedFiles']),
  };
}

/** Stores recounted totals, so replays and partial retries converge on the same record. */
export async function saveOrder(
  order: { orderId: string; orderNumber: string | null; checkoutId: string | null; purchaseFlowId: string | null; placedAt: Date },
  totals: LinkResult,
): Promise<void> {
  await saveItem('orders', {
    _id: order.orderId,
    orderNumber: order.orderNumber,
    checkoutId: order.checkoutId,
    purchaseFlowId: order.purchaseFlowId,
    placedAt: order.placedAt,
    linkedFiles: totals.linked,
    unresolvedFiles: totals.unresolved,
  });
}

export async function getOrder(orderId: string): Promise<OrderSummary | null> {
  const item = await getItem('orders', orderId);
  return item ? toOrder(item) : null;
}

/** Records the order number Wix assigned after the order was saved. No-op if the order isn't tracked. */
export async function setOrderNumber(orderId: string, orderNumber: string): Promise<void> {
  await patchIf('orders', orderId, [set('orderNumber', orderNumber)], filter().ne('orderNumber', orderNumber));
}

export async function findOrderByNumber(orderNumber: string): Promise<OrderSummary | null> {
  const { items } = await findPage('orders', query('orders').eq('orderNumber', orderNumber).limit(1));
  return items[0] ? toOrder(items[0]) : null;
}

export async function listOrders(offset: number, limit: number, search: string | null): Promise<{ orders: OrderSummary[]; hasNext: boolean }> {
  let q = query('orders');
  if (search) q = q.contains('orderNumber', search);
  const page = await findPage('orders', q.descending('placedAt').skip(offset).limit(limit));
  return { orders: page.items.map(toOrder), hasNext: page.hasNext };
}

export async function orderCounts(): Promise<{ ordersWithFiles: number; unresolvedLinks: number }> {
  const [ordersWithFiles, needingReview] = await Promise.all([
    countItems('orders', query('orders')),
    findPage('orders', query('orders').and(filter().gt('unresolvedFiles', 0)).limit(1000)),
  ]);
  return { ordersWithFiles, unresolvedLinks: needingReview.items.reduce((sum, item) => sum + num(item['unresolvedFiles']), 0) };
}

export async function recordValidationObservation(purchaseFlowId: string): Promise<void> {
  await insertItem('validation-observations', { _id: purchaseFlowId, observedAt: new Date() });
}

export async function wasValidationObserved(purchaseFlowId: string): Promise<boolean> {
  return (await getItem('validation-observations', purchaseFlowId, true)) !== null;
}
