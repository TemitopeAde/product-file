import { requireDashboardCaller } from '../../../../server/auth';
import { handle, json, requireParam } from '../../../../server/http';
import { getWixOrderDetails } from '../../../../server/services/dashboard';

export const GET = handle(async (context) => {
  await requireDashboardCaller();
  return json(await getWixOrderDetails(requireParam(context, 'orderId')));
});
