import { requireStorefrontCaller } from '../../../../server/auth';
import { handle, json, readJson, requireString, requireUuid } from '../../../../server/http';
import { unbindFromLineItem } from '../../../../server/services/checkout';

export const POST = handle(async ({ request }) => {
  const caller = await requireStorefrontCaller();
  const body = await readJson(request);
  return json(
    await unbindFromLineItem(caller, {
      checkoutId: requireString(body, 'checkoutId', 100),
      uploadId: requireUuid(requireString(body, 'uploadId', 100), 'Upload'),
    }),
  );
});
