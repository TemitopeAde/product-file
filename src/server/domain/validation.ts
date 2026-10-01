// Pure computation of checkout violations for line items whose product requires a file.

export interface ValidationLineItem {
  lineItemId: string;
  productId: string;
  name: string;
}

export interface MissingFileViolation {
  lineItemId: string;
  description: string;
}

export function requiredFileViolations(
  lineItems: readonly ValidationLineItem[],
  requiredProductIds: ReadonlySet<string>,
  readyCounts: ReadonlyMap<string, number>,
): MissingFileViolation[] {
  return lineItems
    .filter((item) => requiredProductIds.has(item.productId) && (readyCounts.get(item.lineItemId) ?? 0) < 1)
    .map((item) => ({
      lineItemId: item.lineItemId,
      description: `Upload the required file for "${item.name}" before placing your order.`,
    }));
}
