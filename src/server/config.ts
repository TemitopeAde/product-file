import wixConfig from '../../wix.config.json';
import { getRuntimeConfig } from './runtime-config';

export const APP_ID: string = wixConfig.appId;

/** Wix Stores catalog app ID used in eCommerce `catalogReference.appId` for V1 and V3. */
export const WIX_STORES_CATALOG_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

export const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000;
export const VISITOR_ACTIVE_UPLOAD_CAP = 10;
export const VISITOR_DAILY_UPLOAD_CAP = 60;
export const DOWNLOAD_URL_TTL_MINUTES = 60;
export const MEDIA_FOLDER_PATH = 'product-file-uploads';

const DEFAULT_BASIC_MONTHLY_LIMIT = 10;

export function proPlanPackageNames(): string[] {
  return (getRuntimeConfig()?.proPlanPackageNames ?? '').split(',').map((n) => n.trim()).filter((n) => n.length > 0);
}

export function basicMonthlyLimit(): number {
  return getRuntimeConfig()?.basicMonthlyLimit ?? DEFAULT_BASIC_MONTHLY_LIMIT;
}
