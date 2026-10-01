import { requireDashboardCaller } from '../../../../server/auth';
import { handle, noContent, requireParam, requireUuid } from '../../../../server/http';
import { deleteUpload } from '../../../../server/services/dashboard';

export const DELETE = handle(async (context) => {
  await requireDashboardCaller();
  await deleteUpload(requireUuid(requireParam(context, 'id'), 'File'));
  return noContent();
});
