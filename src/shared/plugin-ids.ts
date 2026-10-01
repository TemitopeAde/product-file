// Site plugin extension IDs (from their `.extension.ts` builders) and the slots the dashboard
// offers when adding them with `dashboard.addSitePlugin()`.

export const PRODUCT_PAGE_PLUGIN_ID = '03b75fb2-83e6-4edd-8aa1-fe710e4170da';
export const CHECKOUT_PLUGIN_ID = 'fbadca6d-9bd1-4951-a4f4-e32f77c945db';

export const PRODUCT_PAGE_PLACEMENTS = {
  NEW: {
    appDefinitionId: 'a0c68605-c2e7-4c8d-9ea1-767f9770e087',
    widgetId: '6a25b678-53ec-4b37-a190-65fcd1ca1a63',
    slotId: 'product-page-details-7',
  },
  OLD: {
    appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
    widgetId: '13a94f09-2766-3c40-4a32-8edb5acdd8bc',
    slotId: 'product-page-details-7',
  },
} as const;

/** Wix Stores app that hosts the new product page; its presence in `installedWixApps` selects the new page. */
export const NEW_PRODUCT_PAGE_APP_ID = 'a0c68605-c2e7-4c8d-9ea1-767f9770e087';

export const CHECKOUT_PLACEMENT = {
  appDefinitionId: '1380b703-ce81-ff05-f115-39571d94dfcd',
  widgetId: '14fd5970-8072-c276-1246-058b79e70c1a',
  slotId: 'checkout:summary:lineItems:after',
} as const;
