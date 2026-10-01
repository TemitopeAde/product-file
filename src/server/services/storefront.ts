import type { ReserveUploadRequest, StorefrontProductConfig } from '../../shared/types';
import type { Caller } from '../auth';
import { getAppState } from '../data/settings';
import { getRule } from '../data/rules';
import { listUnboundForOwner, toPublicUpload } from '../data/uploads';
import { toStorefrontRule } from '../domain/rules';
import { ApiError } from '../errors';
import { optionalString, requireString } from '../http';

export async function getStorefrontProduct(caller: Caller, productId: string): Promise<StorefrontProductConfig> {
  const [rule, app] = await Promise.all([getRule(productId), getAppState()]);
  if (!rule || !rule.enabled) return { enabled: false, rule: null, uploads: [], text: app.settings.storefront };
  const mine = await listUnboundForOwner(caller.subjectId, [productId]);
  return { enabled: true, rule: toStorefrontRule(rule), uploads: mine.map(toPublicUpload), text: app.settings.storefront };
}

export function parseReserveRequest(body: Record<string, unknown>): ReserveUploadRequest {
  const source = body['source'];
  if (source !== 'PRODUCT_PAGE' && source !== 'CHECKOUT') throw new ApiError('INVALID_REQUEST', '"source" is invalid.');
  const sizeBytes = body['sizeBytes'];
  if (typeof sizeBytes !== 'number' || !Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new ApiError('INVALID_REQUEST', '"sizeBytes" must be a positive integer.');
  }
  const fileName = requireString(body, 'fileName', 255).replace(/[\u0000-\u001f\\/]/g, '_');
  const mimeType = requireString(body, 'mimeType', 100).toLowerCase();
  const checkoutId = optionalString(body, 'checkoutId', 100);
  const lineItemId = optionalString(body, 'lineItemId', 100);
  return {
    productId: requireString(body, 'productId', 100),
    variantId: optionalString(body, 'variantId', 100),
    fileName,
    mimeType,
    sizeBytes,
    source,
    ...(checkoutId ? { checkoutId } : {}),
    ...(lineItemId ? { lineItemId } : {}),
  };
}
