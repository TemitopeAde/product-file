import { requireDashboardCaller } from '../../../server/auth';
import { handle, json, searchParam } from '../../../server/http';
import { listUploadsPage } from '../../../server/services/dashboard';

export const GET = handle(async (context) => {
  await requireDashboardCaller();
  return json(
    await listUploadsPage({
      status: searchParam(context, 'status', 20),
      productId: searchParam(context, 'productId', 100),
      search: searchParam(context, 'search', 100),
      cursor: searchParam(context, 'cursor', 200),
    }),
  );
});
