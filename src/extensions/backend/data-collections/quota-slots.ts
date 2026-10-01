import type { DataCollection } from '@wix/astro/builders'

// Monthly Basic-plan slots. _id is `<period>-<sequence>`; a duplicate-_id insert failure makes claiming a slot atomic.
export const collectionIdSuffix = 'quota-slots';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Upload Quota Slots',
  fields: [
    { key: 'periodKey', type: 'TEXT', displayName: 'Period' },
    { key: 'seq', type: 'NUMBER', displayName: 'Sequence' },
    { key: 'uploadId', type: 'TEXT', displayName: 'Upload ID' },
    { key: 'state', type: 'TEXT', displayName: 'State' },
    { key: 'expiresAt', type: 'DATETIME', displayName: 'Expires at' },
  ],
  displayField: 'uploadId',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [{ fields: [{ path: 'periodKey' }] }],
  initialData: [],
} satisfies DataCollection;
