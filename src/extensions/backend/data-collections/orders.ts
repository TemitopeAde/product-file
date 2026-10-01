import type { DataCollection } from '@wix/astro/builders'

// One item per store order that has customer files (_id is the eCommerce order ID).
export const collectionIdSuffix = 'orders';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Orders With Files',
  fields: [
    { key: 'orderNumber', type: 'TEXT', displayName: 'Order number' },
    { key: 'checkoutId', type: 'TEXT', displayName: 'Checkout ID' },
    { key: 'purchaseFlowId', type: 'TEXT', displayName: 'Purchase flow ID' },
    { key: 'linkedFiles', type: 'NUMBER', displayName: 'Linked files' },
    { key: 'unresolvedFiles', type: 'NUMBER', displayName: 'Files needing review' },
    { key: 'placedAt', type: 'DATETIME', displayName: 'Placed at' },
  ],
  displayField: 'orderNumber',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
