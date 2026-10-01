import { markCheckoutVerified } from '../data/settings';
import { getOrder, saveOrder, setOrderNumber, wasValidationObserved } from '../data/orders';
import { countOrderLinks, linkOrder, setOrderNumberForOrder } from '../data/uploads';
import { fetchWixOrder } from '../wix/orders';

export interface CreatedOrder {
  orderId: string;
  orderNumber: string | null;
  checkoutId: string | null;
  purchaseFlowId: string | null;
  createdAt: Date;
  lineItems: { id: string; productId: string | null }[];
}

/**
 * Attaches the checkout's bound files to a newly created order. Idempotent: files already
 * linked are skipped and totals are recounted, so redelivered events change nothing.
 *
 * The checkout flow counts as proven on this site when the validation service plugin evaluated
 * this purchase flow with a ready bound file and every bound file linked to the order by exact
 * line-item ID. Only then can merchants turn on required uploads.
 */
export async function handleOrderCreated(created: CreatedOrder): Promise<void> {
  if (!created.checkoutId && !created.purchaseFlowId) return;
  // The created event can carry "0" before Wix assigns the number; ask Wix for the current one.
  const order = created.orderNumber ? created : { ...created, orderNumber: (await fetchWixOrder(created.orderId))?.number ?? null };
  await linkOrder(order, order.lineItems);
  const totals = await countOrderLinks(order.orderId);
  if (totals.linked + totals.unresolved === 0) return;
  await saveOrder({ ...order, placedAt: order.createdAt }, totals);
  if (totals.unresolved > 0) {
    console.error('Order has files that could not be linked by line item ID', { orderId: order.orderId, ...totals });
    return;
  }
  if (order.purchaseFlowId && (await wasValidationObserved(order.purchaseFlowId))) {
    await markCheckoutVerified(order.orderId);
  }
}

/** Backfills a number Wix assigned after the order was created. Untracked orders are left alone. */
export async function syncOrderNumber(orderId: string, orderNumber: string | null): Promise<void> {
  if (!orderNumber) return;
  const stored = await getOrder(orderId);
  if (!stored || stored.orderNumber === orderNumber) return;
  await Promise.all([setOrderNumber(orderId, orderNumber), setOrderNumberForOrder(orderId, orderNumber)]);
}
