import { requireDashboardCaller } from '../../../../server/auth';
import { handle, json, noContent, readJson, requireParam } from '../../../../server/http';
import { removeProductRule, saveProductRule } from '../../../../server/services/dashboard';

export const PUT = handle(async (context) => {
  await requireDashboardCaller();
  return json(await saveProductRule(requireParam(context, 'productId'), await readJson(context.request)));
});

export const DELETE = handle(async (context) => {
  await requireDashboardCaller();
  await removeProductRule(requireParam(context, 'productId'));
  return noContent();
});
