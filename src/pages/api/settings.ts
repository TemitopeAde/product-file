import { requireDashboardCaller } from '../../server/auth';
import { handle, json, readJson } from '../../server/http';
import { getSettings, updateSettings } from '../../server/services/dashboard';

export const GET = handle(async () => {
  await requireDashboardCaller();
  return json(await getSettings());
});

export const PUT = handle(async ({ request }) => {
  await requireDashboardCaller();
  return json(await updateSettings(await readJson(request)));
});
