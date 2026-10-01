import { orders } from '@wix/ecom';
import { orderNumberOrNull } from '../../../../server/data/client';
import { syncOrderNumber } from '../../../../server/services/orders';

// Wix can assign the order number after the created event fires (it arrives as "0" there), so
// pick it up from later updates for orders that already have linked files.
export default orders.onOrderUpdated(async (event) => {
  const order = event.entity;
  const orderNumber = orderNumberOrNull(order.number);
  if (!event.metadata.instanceId || !order._id || !orderNumber) return;
  try {
    await syncOrderNumber(order._id, orderNumber);
  } catch (error) {
    console.error('Failed to sync order number', { orderId: order._id, error });
    throw error;
  }
});
