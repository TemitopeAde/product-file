// Deterministic auto-binding of product-page uploads to checkout line items. An upload is
// bound automatically only when exactly one line item can own it; otherwise the customer
// chooses in the checkout plugin. No heuristics beyond product and recorded variant.

export interface BindableItem {
  lineItemId: string;
  productId: string;
  variantId: string | null;
  capacity: number;
}

export interface BindableUpload {
  uploadId: string;
  productId: string;
  variantId: string | null;
}

export function planAutoBindings(items: readonly BindableItem[], pending: readonly BindableUpload[]): { uploadId: string; lineItemId: string }[] {
  const remaining = new Map(items.map((item) => [item.lineItemId, item.capacity]));
  const plan: { uploadId: string; lineItemId: string }[] = [];
  for (const upload of pending) {
    const sameProduct = items.filter((item) => item.productId === upload.productId);
    const sameVariant = upload.variantId ? sameProduct.filter((item) => item.variantId === upload.variantId) : [];
    const candidates = sameVariant.length > 0 ? sameVariant : sameProduct;
    if (candidates.length !== 1) continue;
    const target = candidates[0];
    if (!target) continue;
    const capacity = remaining.get(target.lineItemId) ?? 0;
    if (capacity <= 0) continue;
    remaining.set(target.lineItemId, capacity - 1);
    plan.push({ uploadId: upload.uploadId, lineItemId: target.lineItemId });
  }
  return plan;
}
