import { requireStorefrontCaller } from '../../../../../server/auth';
import { handle, json, requireParam, requireUuid } from '../../../../../server/http';
import { getUploadStatus } from '../../../../../server/services/storefront-uploads';

export const GET = handle(async (context) => {
  const caller = await requireStorefrontCaller();
  return json(await getUploadStatus(caller, requireUuid(requireParam(context, 'id'), 'Upload')));
});
