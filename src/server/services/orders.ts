import { markCheckoutVerified } from '../data/settings';
import { saveOrder, wasValidationObserved } from '../data/orders';
import { countOrderLinks, linkOrder } from '../data/uploads';

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
export async function handleOrderCreated(order: CreatedOrder): Promise<void> {
  if (!order.checkoutId && !order.purchaseFlowId) return;
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
