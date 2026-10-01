import { requireDashboardCaller } from '../../../../server/auth';
import { handle, json, requireParam, searchParam } from '../../../../server/http';
import { listOrderFilesPage } from '../../../../server/services/dashboard';

export const GET = handle(async (context) => {
  await requireDashboardCaller();
  return json(
    await listOrderFilesPage(
      requireParam(context, 'orderId'),
      searchParam(context, 'cursor', 20),
      searchParam(context, 'search', 100),
    ),
  );
});
