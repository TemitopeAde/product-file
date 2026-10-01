import { dashboard } from '@wix/dashboard';
import { toast } from 'sonner';
import { CHECKOUT_PLACEMENT, CHECKOUT_PLUGIN_ID, PRODUCT_PAGE_PLACEMENTS, PRODUCT_PAGE_PLUGIN_ID } from '../../shared/plugin-ids';
import type { ProductPageVersion } from '../../shared/types';
import { getActiveMessages } from '../i18n/runtime';

/** Starts Wix's consent flow for placing a site plugin in its slot. */
export async function addPlugin(kind: 'productPage' | 'checkout', productPageVersion: ProductPageVersion): Promise<boolean> {
  const pluginId = kind === 'checkout' ? CHECKOUT_PLUGIN_ID : PRODUCT_PAGE_PLUGIN_ID;
  const placement =
    kind === 'checkout' ? CHECKOUT_PLACEMENT : PRODUCT_PAGE_PLACEMENTS[productPageVersion === 'OLD' ? 'OLD' : 'NEW'];
  try {
    await dashboard.addSitePlugin(pluginId, { placement: { ...placement } });
    const messages = getActiveMessages();
    toast.success(kind === 'checkout' ? messages.toasts.checkoutPluginAdded : messages.toasts.productPageAdded);
    return true;
  } catch (error) {
    console.error('addSitePlugin failed', error);
    toast.error(getActiveMessages().toasts.pluginNotAdded);
    return false;
  }
}
