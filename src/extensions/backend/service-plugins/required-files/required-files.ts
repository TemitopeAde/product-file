import { validations } from '@wix/ecom/service-plugins';
import { WIX_STORES_CATALOG_APP_ID } from '../../../../server/config';
import { requiredFileViolations, type ValidationLineItem } from '../../../../server/domain/validation';
import { recordValidationObservation } from '../../../../server/data/orders';
import { getRules } from '../../../../server/data/rules';
import { readyCountsForPurchaseFlow } from '../../../../server/data/uploads';

// Runs on every checkout calculation, so it stays at most three Wix Data round trips.
validations.provideHandlers({
  getValidationViolations: async ({ request, metadata }) => {
    const instanceId = metadata.instanceId;
    const purchaseFlowId = request.sourceInfo?.purchaseFlowId ?? null;
    const lineItems: ValidationLineItem[] = [];
    for (const item of request.validationInfo?.lineItems ?? []) {
      const ref = item.catalogReference;
      if (!item._id || ref?.appId !== WIX_STORES_CATALOG_APP_ID || !ref.catalogItemId) continue;
      lineItems.push({
        lineItemId: item._id,
        productId: ref.catalogItemId,
        name: item.productName?.translated ?? item.productName?.original ?? 'this item',
      });
    }
    if (!instanceId || lineItems.length === 0) return { violations: [] };

    try {
      const rules = await getRules([...new Set(lineItems.map((li) => li.productId))]);
      const enabled = [...rules.values()].filter((rule) => rule.enabled);
      if (enabled.length === 0) return { violations: [] };

      const readyCounts = purchaseFlowId ? await readyCountsForPurchaseFlow(purchaseFlowId) : new Map<string, number>();
      if (purchaseFlowId && [...readyCounts.values()].some((count) => count > 0)) {
        await recordValidationObservation(purchaseFlowId);
      }

      const required = new Set(enabled.filter((rule) => rule.requirement === 'REQUIRED').map((rule) => rule.productId));
      return {
        violations: requiredFileViolations(lineItems, required, readyCounts).map((v) => ({
          description: v.description,
          severity: validations.Severity.ERROR,
          target: { lineItem: { _id: v.lineItemId, name: validations.NameInLineItem.LINE_ITEM_DEFAULT } },
        })),
      };
    } catch (error) {
      // Fail open: an outage of this app must not stop every sale on the site.
      console.error('Required-file validation failed; allowing checkout', { instanceId, purchaseFlowId, error });
      return { violations: [] };
    }
  },
});
