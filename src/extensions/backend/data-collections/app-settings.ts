import type { DataCollection } from '@wix/astro/builders'

// Only backend code reads and writes this single settings item (_id 'settings').
export const collectionIdSuffix = 'app-settings';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'App Settings',
  fields: [
    { key: 'storefrontText', type: 'OBJECT', displayName: 'Storefront text', objectOptions: { fields: [] } },
    { key: 'ruleDefaults', type: 'OBJECT', displayName: 'Rule defaults', objectOptions: { fields: [] } },
    { key: 'installedAt', type: 'DATETIME', displayName: 'Installed at' },
    { key: 'checkoutVerifiedAt', type: 'DATETIME', displayName: 'Checkout verified at' },
    { key: 'checkoutVerifiedOrderId', type: 'TEXT', displayName: 'Verification order ID' },
  ],
  displayField: 'storefrontText',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
