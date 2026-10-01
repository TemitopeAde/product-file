import { requireStorefrontCaller } from '../../../server/auth';
import { ApiError } from '../../../server/errors';
import { handle, json, searchParam } from '../../../server/http';
import { getStorefrontProduct } from '../../../server/services/storefront';

export const GET = handle(async (context) => {
  const caller = await requireStorefrontCaller();
  const productId = searchParam(context, 'productId', 100);
  if (!productId) throw new ApiError('INVALID_REQUEST', '"productId" is required.');
  return json(await getStorefrontProduct(caller, productId));
});
