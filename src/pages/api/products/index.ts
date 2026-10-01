import { requireDashboardCaller } from '../../../server/auth';
import { handle, json, searchParam } from '../../../server/http';
import { listProducts } from '../../../server/services/dashboard';

export const GET = handle(async (context) => {
  const caller = await requireDashboardCaller();
  return json(await listProducts(caller, searchParam(context, 'cursor', 2000), searchParam(context, 'search', 100)));
});
