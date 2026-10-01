import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import type { InstanceBillingInput } from '../access/resolve-access';
import { ApiError } from '../errors';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: InstanceBillingInput; expires: number }>();

function dateToIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

/**
 * Reads billing and owner data from Wix as the app. Wix billing is authoritative; the short
 * cache only absorbs bursts of requests within a single runtime isolate.
 */
export async function getInstanceBilling(instanceId: string): Promise<InstanceBillingInput> {
  const cached = cache.get(instanceId);
  if (cached && cached.expires > Date.now()) return cached.value;

  let response: appInstances.GetAppInstanceResponse;
  try {
    response = await auth.elevate(appInstances.getAppInstance)();
  } catch (error) {
    console.error('getAppInstance failed', error);
    throw new ApiError('SERVICE_UNAVAILABLE', 'Could not read billing status from Wix. Please try again.');
  }
  const instance = response.instance;
  if (instance?.instanceId && instance.instanceId !== instanceId) {
    console.error('App instance mismatch', { expected: instanceId, received: instance.instanceId });
    throw new ApiError('FORBIDDEN', 'App instance mismatch.');
  }
  const billing = instance?.billing;
  const value: InstanceBillingInput = {
    instanceId,
    isFree: instance?.isFree ?? null,
    freeTrialAvailable: instance?.freeTrialAvailable ?? null,
    billing: billing
      ? {
          packageName: billing.packageName ?? null,
          billingCycle: billing.billingCycle ?? null,
          timeStamp: dateToIso(billing.timeStamp),
          autoRenewing: billing.autoRenewing ?? null,
          freeTrialStatus: billing.freeTrialInfo?.status ?? null,
          freeTrialEndDate: dateToIso(billing.freeTrialInfo?.endDate),
        }
      : null,
    ownerEmail: response.site?.ownerInfo?.email ?? null,
    ownerEmailStatus: response.site?.ownerInfo?.emailStatus ?? null,
    installedWixApps: response.site?.installedWixApps ?? [],
  };
  cache.set(instanceId, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

export function invalidateInstanceBilling(instanceId: string): void {
  cache.delete(instanceId);
}
