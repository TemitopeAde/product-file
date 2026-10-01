import { requireDashboardCaller } from '../../../../server/auth';
import { handle, json, requireParam, requireUuid } from '../../../../server/http';
import { getUploadDownloadUrl } from '../../../../server/services/dashboard';

export const POST = handle(async (context) => {
  await requireDashboardCaller();
  return json(await getUploadDownloadUrl(requireUuid(requireParam(context, 'id'), 'File')));
});
