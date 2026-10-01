import type { DataCollection } from '@wix/astro/builders'

// Purchase flows the validation service plugin evaluated with a ready bound file (_id is the purchase flow ID).
export const collectionIdSuffix = 'validation-observations';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Checkout Validation Observations',
  fields: [
    { key: 'observedAt', type: 'DATETIME', displayName: 'Observed at' },
  ],
  displayField: 'observedAt',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
