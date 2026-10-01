import { requireDashboardCaller } from '../../server/auth';
import { handle, json } from '../../server/http';
import { getPluginStatus } from '../../server/wix/plugins';

export const GET = handle(async () => {
  const caller = await requireDashboardCaller();
  return json(await getPluginStatus(caller.instanceId));
});
