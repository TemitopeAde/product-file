import { requireStorefrontCaller } from '../../../../server/auth';
import { handle, json, readJson, requireString, requireUuid } from '../../../../server/http';
import { bindToLineItem } from '../../../../server/services/checkout';

export const POST = handle(async ({ request }) => {
  const caller = await requireStorefrontCaller();
  const body = await readJson(request);
  return json(
    await bindToLineItem(caller, {
      checkoutId: requireString(body, 'checkoutId', 100),
      lineItemId: requireString(body, 'lineItemId', 100),
      uploadId: requireUuid(requireString(body, 'uploadId', 100), 'Upload'),
    }),
  );
});
