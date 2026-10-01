import { requireStorefrontCaller } from '../../../../server/auth';
import { ApiError } from '../../../../server/errors';
import { handle, json, searchParam } from '../../../../server/http';
import { getCheckoutState } from '../../../../server/services/checkout';

export const GET = handle(async (context) => {
  const caller = await requireStorefrontCaller();
  const checkoutId = searchParam(context, 'checkoutId', 100);
  if (!checkoutId) throw new ApiError('INVALID_REQUEST', '"checkoutId" is required.');
  return json(await getCheckoutState(caller, checkoutId));
});
