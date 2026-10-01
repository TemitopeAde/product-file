import { requireDashboardCaller } from '../../server/auth';
import { handle, json } from '../../server/http';
import { getAnalytics } from '../../server/services/dashboard';

export const GET = handle(async () => json(await getAnalytics(await requireDashboardCaller())));
