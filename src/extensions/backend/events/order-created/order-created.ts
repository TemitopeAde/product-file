import { orders } from '@wix/ecom';
import { handleOrderCreated } from '../../../../server/services/orders';

export default orders.onOrderCreated(async (event) => {
  const instanceId = event.metadata.instanceId;
  const order = event.entity;
  if (!instanceId || !order._id) return;
  try {
    await handleOrderCreated({
      orderId: order._id,
      orderNumber: order.number ?? null,
      checkoutId: order.checkoutId ?? null,
      purchaseFlowId: order.purchaseFlowId ?? null,
      createdAt: order._createdDate ?? new Date(),
      lineItems: (order.lineItems ?? [])
        .filter((li): li is typeof li & { _id: string } => typeof li._id === 'string')
        .map((li) => ({ id: li._id, productId: li.catalogReference?.catalogItemId ?? null })),
    });
  } catch (error) {
    console.error('Failed to link uploaded files to order', { orderId: order._id, error });
    throw error;
  }
});
