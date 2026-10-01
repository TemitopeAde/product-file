import { requireDashboardCaller } from '../../server/auth';
import { handle, json } from '../../server/http';
import { getBillingSummary } from '../../server/services/access';

export const GET = handle(async () => {
  const caller = await requireDashboardCaller();
  return json(await getBillingSummary(caller.instanceId));
});
