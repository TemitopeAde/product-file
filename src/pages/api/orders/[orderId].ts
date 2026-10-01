import { requireDashboardCaller } from '../../../server/auth';
import { handle, json, requireParam } from '../../../server/http';
import { getOrderDetail } from '../../../server/services/dashboard';

export const GET = handle(async (context) => {
  await requireDashboardCaller();
  return json(await getOrderDetail(requireParam(context, 'orderId')));
});
