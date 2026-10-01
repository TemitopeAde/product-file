import { orders } from '@wix/ecom';
import { auth } from '@wix/essentials';
import type { WixOrderDetails } from '../../shared/types';
import { orderNumberOrNull } from '../data/client';

type Order = orders.Order;

/** Order images arrive as `wix:image://v1/<mediaId>/...`; the dashboard needs an https URL. */
function imageUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith('https://')) return uri;
  const mediaId = /^wix:image:\/\/v1\/([^/#]+)/.exec(uri)?.[1];
  return mediaId ? `https://static.wixstatic.com/media/${mediaId}` : null;
}

function buyerName(order: Order): string | null {
  const contact = order.billingInfo?.contactDetails ?? order.recipientInfo?.contactDetails;
  const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : null;
}

function toDetails(order: Order, orderId: string): WixOrderDetails {
  const totals = order.priceSummary;
  return {
    id: order._id ?? orderId,
    number: orderNumberOrNull(order.number),
    createdAt: order._createdDate ? new Date(order._createdDate).toISOString() : null,
    status: order.status ?? 'UNKNOWN',
    paymentStatus: order.paymentStatus ?? 'UNSPECIFIED',
    fulfillmentStatus: order.fulfillmentStatus ?? 'NOT_FULFILLED',
    buyer: { name: buyerName(order), email: order.buyerInfo?.email ?? null },
    buyerNote: order.buyerNote ?? null,
    totals: {
      subtotal: totals?.subtotal?.formattedAmount ?? null,
      shipping: totals?.shipping?.formattedAmount ?? null,
      tax: totals?.tax?.formattedAmount ?? null,
      discount: totals?.discount?.formattedAmount ?? null,
      total: totals?.total?.formattedAmount ?? null,
    },
    lineItems: (order.lineItems ?? []).map((li) => ({
      id: li._id ?? '',
      name: li.productName?.translated ?? li.productName?.original ?? null,
      quantity: li.quantity ?? 1,
      price: li.price?.formattedAmount ?? null,
      total: li.totalPriceAfterTax?.formattedAmount ?? null,
      image: imageUrl(li.image),
      options: (li.descriptionLines ?? [])
        .map((line) => {
          const value = line.plainText?.translated ?? line.plainText?.original ?? line.colorInfo?.translated ?? line.colorInfo?.original;
          const name = line.name?.translated ?? line.name?.original;
          return value ? (name ? `${name}: ${value}` : value) : null;
        })
        .filter((s): s is string => s !== null),
    })),
  };
}

/** Reads an order as the app. Returns null, not an error, so callers can still show stored data. */
export async function fetchWixOrder(orderId: string): Promise<WixOrderDetails | null> {
  try {
    return toDetails(await auth.elevate(orders.getOrder)(orderId), orderId);
  } catch (error) {
    console.error('getOrder failed', { orderId, error });
    return null;
  }
}
