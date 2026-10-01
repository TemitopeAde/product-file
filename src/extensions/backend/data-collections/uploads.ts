import type { DataCollection } from '@wix/astro/builders'

// One item per upload reservation, including its checkout binding and order link.
export const collectionIdSuffix = 'uploads';

export default {
  idSuffix: collectionIdSuffix,
  displayName: 'Customer Uploads',
  fields: [
    { key: 'ownerType', type: 'TEXT', displayName: 'Owner type' },
    { key: 'ownerId', type: 'TEXT', displayName: 'Owner ID' },
    { key: 'productId', type: 'TEXT', displayName: 'Product ID' },
    { key: 'productName', type: 'TEXT', displayName: 'Product name' },
    { key: 'variantId', type: 'TEXT', displayName: 'Variant ID' },
    { key: 'source', type: 'TEXT', displayName: 'Source' },
    { key: 'fileName', type: 'TEXT', displayName: 'File name' },
    { key: 'mimeType', type: 'TEXT', displayName: 'MIME type' },
    { key: 'declaredSizeBytes', type: 'NUMBER', displayName: 'Declared size (bytes)' },
    { key: 'maxFileSizeBytes', type: 'NUMBER', displayName: 'Max size (bytes)' },
    { key: 'status', type: 'TEXT', displayName: 'Status' },
    { key: 'quotaSlotId', type: 'TEXT', displayName: 'Quota slot ID' },
    { key: 'reservationLabel', type: 'TEXT', displayName: 'Reservation label' },
    { key: 'wixUploadUrl', type: 'TEXT', displayName: 'Upload URL' },
    { key: 'wixUploadToken', type: 'TEXT', displayName: 'Upload token' },
    { key: 'wixFileId', type: 'TEXT', displayName: 'Media file ID' },
    { key: 'sizeBytes', type: 'NUMBER', displayName: 'Size (bytes)' },
    { key: 'mediaType', type: 'TEXT', displayName: 'Media type' },
    { key: 'failureReason', type: 'TEXT', displayName: 'Failure reason' },
    { key: 'expiresAt', type: 'DATETIME', displayName: 'Expires at' },
    { key: 'completedAt', type: 'DATETIME', displayName: 'Completed at' },
    { key: 'cartId', type: 'TEXT', displayName: 'Checkout ID' },
    { key: 'purchaseFlowId', type: 'TEXT', displayName: 'Purchase flow ID' },
    { key: 'lineItemId', type: 'TEXT', displayName: 'Line item ID' },
    { key: 'orderId', type: 'TEXT', displayName: 'Order ID' },
    { key: 'orderNumber', type: 'TEXT', displayName: 'Order number' },
    { key: 'linkStatus', type: 'TEXT', displayName: 'Link status' },
    { key: 'revision', type: 'NUMBER', displayName: 'Revision' },
  ],
  displayField: 'fileName',
  dataPermissions: {
    itemRead: 'PRIVILEGED',
    itemInsert: 'PRIVILEGED',
    itemUpdate: 'PRIVILEGED',
    itemRemove: 'PRIVILEGED',
  },
  indexes: [
    { fields: [{ path: 'reservationLabel' }], unique: true },
    { fields: [{ path: 'purchaseFlowId' }] },
    { fields: [{ path: 'ownerId' }] },
  ],
  initialData: [],
} satisfies DataCollection;
