import type { DataCollection } from '@wix/astro/builders'

// One item per product (_id is the Wix Stores product ID).
export const collectionIdSuffix = 'product-rules';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Product Upload Rules',
  fields: [
    { key: 'productName', type: 'TEXT', displayName: 'Product name' },
    { key: 'enabled', type: 'BOOLEAN', displayName: 'Enabled' },
    { key: 'requirement', type: 'TEXT', displayName: 'Requirement' },
    { key: 'acceptedTypes', type: 'ARRAY_STRING', displayName: 'Accepted types' },
    { key: 'maxFileSizeBytes', type: 'NUMBER', displayName: 'Max file size (bytes)' },
    { key: 'maxFiles', type: 'NUMBER', displayName: 'Max files' },
    { key: 'instructions', type: 'TEXT', displayName: 'Instructions' },
  ],
  displayField: 'productName',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [],
  initialData: [],
} satisfies DataCollection;
