import type { BindRequest, CheckoutLineItemState, CheckoutState, UnbindRequest } from '../../shared/types';
import type { Caller } from '../auth';
import { getAppState } from '../data/settings';
import { getRules } from '../data/rules';
import * as uploads from '../data/uploads';
import { planAutoBindings } from '../domain/auto-bind';
import { toStorefrontRule } from '../domain/rules';
import { ApiError } from '../errors';
import { getOwnedCart, type CartSnapshot } from '../wix/cart';

const isLive = (u: uploads.UploadRow) => uploads.LIVE_STATUSES.includes(u.status);

async function enabledRulesFor(cart: CartSnapshot) {
  const rules = await getRules(cart.lineItems.map((li) => li.productId));
  return new Map([...rules].filter(([, rule]) => rule.enabled));
}

export async function getCheckoutState(caller: Caller, checkoutId: string): Promise<CheckoutState> {
  const cart = await getOwnedCart(checkoutId, caller);
  const [rules, app] = await Promise.all([enabledRulesFor(cart), getAppState()]);
  const items = cart.lineItems.filter((li) => rules.has(li.productId));
  const itemIds = new Set(items.map((li) => li.id));

  // Files bound to line items that left the cart go back to the customer's unassigned list.
  let bound = await uploads.listBoundToCart(cart.id);
  const stale = bound.filter((u) => !u.binding?.orderId && !itemIds.has(u.binding?.lineItemId ?? ''));
  if (stale.length > 0 && !cart.orderPlaced) {
    await Promise.all(stale.map((u) => uploads.unbind(u.id, cart.id)));
    bound = bound.filter((u) => !stale.includes(u));
  }

  const productIds = [...new Set(items.map((li) => li.productId))];
  const unbound = await uploads.listUnboundForOwner(caller.subjectId, productIds);
  const liveBound = bound.filter(isLive);

  const autoBound = new Set<string>();
  if (!cart.orderPlaced && unbound.length > 0) {
    const plan = planAutoBindings(
      items.map((li) => ({
        lineItemId: li.id,
        productId: li.productId,
        variantId: li.variantId,
        capacity: (rules.get(li.productId)?.maxFiles ?? 0) - liveBound.filter((u) => u.binding?.lineItemId === li.id).length,
      })),
      unbound.map((u) => ({ uploadId: u.id, productId: u.productId, variantId: u.variantId })),
    );
    for (const step of plan) {
      if (await uploads.bindToLineItem(step.uploadId, { cartId: cart.id, purchaseFlowId: cart.purchaseFlowId, lineItemId: step.lineItemId })) {
        autoBound.add(step.uploadId);
      }
    }
  }
  const current = autoBound.size > 0 ? (await uploads.listBoundToCart(cart.id)).filter(isLive) : liveBound;

  const lineItems: CheckoutLineItemState[] = [];
  for (const item of items) {
    const rule = rules.get(item.productId);
    if (!rule) continue;
    lineItems.push({
      lineItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      quantity: item.quantity,
      rule: toStorefrontRule(rule),
      files: current.filter((u) => u.binding?.lineItemId === item.id).map(uploads.toPublicUpload),
    });
  }
  return {
    cartId: cart.id,
    lineItems,
    unboundUploads: unbound.filter((u) => !autoBound.has(u.id)).map(uploads.toPublicUpload),
    text: app.settings.storefront,
  };
}

export async function bindToLineItem(caller: Caller, req: BindRequest): Promise<CheckoutState> {
  const cart = await getOwnedCart(req.checkoutId, caller);
  if (cart.orderPlaced) throw new ApiError('CONFLICT', 'This order was already placed.');
  const item = cart.lineItems.find((li) => li.id === req.lineItemId);
  if (!item) throw new ApiError('NOT_FOUND', 'Line item not found.');
  const rule = (await enabledRulesFor(cart)).get(item.productId);
  if (!rule) throw new ApiError('UPLOADS_NOT_ENABLED', 'File uploads are not available for this item.');

  const upload = await uploads.getUpload(req.uploadId, true);
  if (!upload || upload.ownerId !== caller.subjectId || !isLive(upload)) throw new ApiError('NOT_FOUND', 'Upload not found.');
  if (upload.productId !== item.productId) throw new ApiError('INVALID_REQUEST', 'This file was uploaded for a different product.');
  if (upload.binding?.lineItemId !== item.id || upload.binding.cartId !== cart.id) {
    const onItem = (await uploads.listBoundToCart(cart.id)).filter((u) => u.binding?.lineItemId === item.id && isLive(u));
    if (onItem.length >= rule.maxFiles) throw new ApiError('MAX_FILES_REACHED', `This item accepts up to ${rule.maxFiles} file(s).`);
    if (!(await uploads.bindToLineItem(upload.id, { cartId: cart.id, purchaseFlowId: cart.purchaseFlowId, lineItemId: item.id }))) {
      throw new ApiError('CONFLICT', 'This file is already attached to an order.');
    }
  }
  return getCheckoutState(caller, req.checkoutId);
}

export async function unbindFromLineItem(caller: Caller, req: UnbindRequest): Promise<CheckoutState> {
  const cart = await getOwnedCart(req.checkoutId, caller);
  const upload = await uploads.getUpload(req.uploadId, true);
  if (!upload || upload.ownerId !== caller.subjectId) throw new ApiError('NOT_FOUND', 'Upload not found.');
  if (!(await uploads.unbind(upload.id, cart.id))) throw new ApiError('CONFLICT', 'This file cannot be detached.');
  return getCheckoutState(caller, req.checkoutId);
}
