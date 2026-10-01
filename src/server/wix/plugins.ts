import { auth } from '@wix/essentials';
import { plugins } from '@wix/site-plugins';
import type { PluginStatusResponse } from '../../shared/types';
import { CHECKOUT_PLUGIN_ID, NEW_PRODUCT_PAGE_APP_ID, PRODUCT_PAGE_PLUGIN_ID } from '../../shared/plugin-ids';
import { getInstanceBilling } from './app-instance';
import { getCatalogVersion } from './catalog';

export async function getPluginStatus(instanceId: string): Promise<PluginStatusResponse> {
  const [catalogVersion, instance] = await Promise.all([
    getCatalogVersion(instanceId).catch(() => 'STORES_NOT_INSTALLED' as const),
    getInstanceBilling(instanceId).catch(() => null),
  ]);
  const productPageVersion: PluginStatusResponse['productPageVersion'] = !instance
    ? 'UNKNOWN'
    : instance.installedWixApps.includes(NEW_PRODUCT_PAGE_APP_ID)
      ? 'NEW'
      : 'OLD';
  const productPage = { pluginId: PRODUCT_PAGE_PLUGIN_ID, name: 'Product page uploader', placedInSlot: null as boolean | null };
  const checkout = { pluginId: CHECKOUT_PLUGIN_ID, name: 'Checkout file attachments', placedInSlot: null as boolean | null };
  try {
    const { placementStatuses } = await auth.elevate(plugins.getPlacementStatus)();
    const statuses = placementStatuses ?? [];
    productPage.placedInSlot = statuses.some(
      (status) => status.pluginId === PRODUCT_PAGE_PLUGIN_ID && status.placedInSlot === true,
    );
    checkout.placedInSlot = statuses.some(
      (status) => status.pluginId === CHECKOUT_PLUGIN_ID && status.placedInSlot === true,
    );
    return { catalogVersion, productPageVersion, productPage, checkout, statusError: null };
  } catch (error) {
    console.error('getPlacementStatus failed', error);
    return { catalogVersion, productPageVersion, productPage, checkout, statusError: 'Wix could not report plugin placement right now.' };
  }
}
