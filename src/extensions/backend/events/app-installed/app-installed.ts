import { appInstances } from '@wix/app-management';
import { recordInstalledAt } from '../../../../server/data/settings';

// The install time anchors the monthly Basic upload period, since Wix supplies no billing
// period for free installs.
export default appInstances.onAppInstanceInstalled(async (event) => {
  const instanceId = event.metadata.instanceId;
  if (!instanceId) return;
  const installedAt = new Date();
  try {
    await recordInstalledAt(installedAt);
  } catch (error) {
    console.error('Failed to record app installation', { instanceId, error });
    throw error;
  }
});
