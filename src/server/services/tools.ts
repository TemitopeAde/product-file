import { findOrderByNumber } from '../data/orders';
import { toPublicUpload, uploadsForOrder } from '../data/uploads';

export async function findOrderFiles(orderNumber: string) {
  const order = await findOrderByNumber(orderNumber);
  if (!order) return { found: false, files: [] };
  const files = await uploadsForOrder(order.orderId);
  return {
    found: true,
    files: files.map(toPublicUpload).map((f) => ({
      fileName: f.fileName,
      product: f.productName ?? f.productId,
      status: f.status,
      linkedToLineItem: f.binding?.linkStatus === 'LINKED',
    })),
  };
}
