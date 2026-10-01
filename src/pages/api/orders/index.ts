import { requireDashboardCaller } from '../../../server/auth';
import { handle, json, searchParam } from '../../../server/http';
import { listOrdersPage } from '../../../server/services/dashboard';

export const GET = handle(async (context) => {
  await requireDashboardCaller();
  return json(await listOrdersPage(searchParam(context, 'cursor', 200), searchParam(context, 'search', 50)));
});
