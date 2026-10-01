// The Checkout V1 checkout ID is the Cart V2 cart ID, so the non-deprecated Cart V2 API
// reads the checkout a checkout plugin is rendered for.
import { cartV2 } from '@wix/ecom';
import { auth } from '@wix/essentials';
import type { Caller } from '../auth';
import { WIX_STORES_CATALOG_APP_ID } from '../config';
import { ApiError } from '../errors';

export interface CartLineItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  quantity: number;
}

export interface CartSnapshot {
  id: string;
  purchaseFlowId: string | null;
  orderPlaced: boolean;
  lineItems: CartLineItem[];
}

function variantIdFrom(options: Record<string, unknown> | null | undefined): string | null {
  const value = options?.['variantId'];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Loads a checkout as the app and verifies it belongs to the calling visitor, member, or user. */
export async function getOwnedCart(checkoutId: string, caller: Caller): Promise<CartSnapshot> {
  let cart: cartV2.Cart;
  try {
    cart = await auth.elevate(cartV2.getCart)(checkoutId);
  } catch (error) {
    console.error('getCart failed', { checkoutId, error });
    throw new ApiError('NOT_FOUND', 'Checkout not found.');
  }
  const customer = cart.customerInfo;
  const ownerId =
    caller.subjectType === 'VISITOR' ? customer?.visitorId : caller.subjectType === 'MEMBER' ? customer?.memberId : customer?.userId;
  if (!ownerId || ownerId !== caller.subjectId) {
    throw new ApiError('NOT_FOUND', 'Checkout not found.');
  }
  const lineItems: CartLineItem[] = [];
  for (const item of cart.lineItems ?? []) {
    const ref = item.source?.catalogReference;
    if (!item._id || !ref || ref.appId !== WIX_STORES_CATALOG_APP_ID || !ref.catalogItemId) continue;
    lineItems.push({
      id: item._id,
      productId: ref.catalogItemId,
      variantId: variantIdFrom(ref.options),
      name: item.name?.translated ?? item.name?.original ?? 'Item',
      quantity: item.quantityInfo?.confirmedQuantity ?? item.quantityInfo?.requestedQuantity ?? 1,
    });
  }
  return { id: cart._id ?? checkoutId, purchaseFlowId: cart.purchaseFlowId ?? null, orderPlaced: cart.orderPlaced === true, lineItems };
}
