import { requireStorefrontCaller } from '../../../../server/auth';
import { handle, json, readJson } from '../../../../server/http';
import { parseReserveRequest } from '../../../../server/services/storefront';
import { reserveUpload } from '../../../../server/services/storefront-uploads';

export const POST = handle(async ({ request }) => {
  const caller = await requireStorefrontCaller();
  return json(await reserveUpload(caller, parseReserveRequest(await readJson(request))), 201);
});
