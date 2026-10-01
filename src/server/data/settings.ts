import type { AppSettings } from '../../shared/types';
import { normalizeSettings } from '../domain/settings';
import { filter, getItem, insertItem, isoOrNull, patchIf, set, strOrNull } from './client';

const SETTINGS_ID = 'settings';

export interface AppState {
  installedAt: string | null;
  firstSeenAt: string;
  checkoutVerifiedAt: string | null;
  checkoutVerifiedOrderId: string | null;
  settings: AppSettings;
}

async function ensureSettingsItem(): Promise<void> {
  await insertItem('app-settings', { _id: SETTINGS_ID });
}

export async function getAppState(): Promise<AppState> {
  let item = await getItem('app-settings', SETTINGS_ID);
  if (!item) {
    await ensureSettingsItem();
    item = await getItem('app-settings', SETTINGS_ID, true);
  }
  return {
    installedAt: isoOrNull(item?.['installedAt']),
    firstSeenAt: isoOrNull(item?._createdDate) ?? new Date().toISOString(),
    checkoutVerifiedAt: isoOrNull(item?.['checkoutVerifiedAt']),
    checkoutVerifiedOrderId: strOrNull(item?.['checkoutVerifiedOrderId']),
    settings: normalizeSettings({ storefront: item?.['storefrontText'], defaults: item?.['ruleDefaults'] }),
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureSettingsItem();
  await patchIf('app-settings', SETTINGS_ID, [set('storefrontText', settings.storefront), set('ruleDefaults', settings.defaults)], null);
}

/** Records the install time from the App Instance Installed event; the first value wins. */
export async function recordInstalledAt(installedAt: Date): Promise<void> {
  const existing = await getItem('app-settings', SETTINGS_ID, true);
  if (!existing) {
    if (await insertItem('app-settings', { _id: SETTINGS_ID, installedAt })) return;
  } else if (existing['installedAt']) {
    return;
  }
  await patchIf('app-settings', SETTINGS_ID, [set('installedAt', installedAt)], null);
}

/** The first proving order wins; later orders leave the recorded verification unchanged. */
export async function markCheckoutVerified(orderId: string): Promise<void> {
  await ensureSettingsItem();
  await patchIf(
    'app-settings',
    SETTINGS_ID,
    [set('checkoutVerifiedAt', new Date()), set('checkoutVerifiedOrderId', orderId)],
    filter().isEmpty('checkoutVerifiedOrderId'),
  );
}
