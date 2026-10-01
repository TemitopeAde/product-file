import { requireDashboardCaller } from '../../../server/auth';
import { handle, json } from '../../../server/http';
import { enableAllProducts } from '../../../server/services/dashboard';

export const POST = handle(async () => {
  const caller = await requireDashboardCaller();
  return json(await enableAllProducts(caller));
});
