import type { BillingSummary } from '../../shared/types';
import { monthlyPeriod, resolveAccess, type ResolvedAccess } from '../access/resolve-access';
import { APP_ID, basicMonthlyLimit, proPlanPackageNames } from '../config';
import { getAppState } from '../data/settings';
import { quotaUsage } from '../data/quota';
import { getInstanceBilling } from '../wix/app-instance';

export interface AccessContext {
  access: ResolvedAccess;
  period: { start: Date; end: Date };
}

let warnedMissingPlan = false;

export async function getAccessContext(instanceId: string, now = new Date()): Promise<AccessContext> {
  const [billing, instance] = await Promise.all([getInstanceBilling(instanceId), getAppState()]);
  const access = resolveAccess(
    billing,
    { appId: APP_ID, proPlanPackageNames: proPlanPackageNames(), basicMonthlyLimit: basicMonthlyLimit() },
    now,
  );
  if (!access.proPlanConfigured && !warnedMissingPlan) {
    warnedMissingPlan = true;
    console.error('PRO_PLAN_PACKAGE_NAMES is not configured; paid plans cannot be recognized as Pro.');
  }
  if (billing.isFree === false && access.tier === 'BASIC' && access.proPlanConfigured) {
    console.error('Paid package does not match any configured Pro plan', { packageName: access.packageName });
  }
  // Wix supplies no billing period for free installs, so Basic resets on the install anniversary.
  const anchor = new Date(access.billingPeriodAnchor ?? instance.installedAt ?? instance.firstSeenAt);
  return { access, period: monthlyPeriod(anchor, now) };
}

export async function getBillingSummary(instanceId: string): Promise<BillingSummary> {
  const { access, period } = await getAccessContext(instanceId);
  const used = await quotaUsage(period.start);
  const limit = access.monthlyLimit;
  return {
    tier: access.tier,
    unlimited: access.unlimited,
    usage: {
      used,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - used),
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
    },
    trial: { eligible: access.trialEligible, status: access.trialStatus, endDate: access.trialEndDate },
    plan: { packageName: access.packageName, billingCycle: access.billingCycle, autoRenewing: access.autoRenewing },
    actions: access.actions,
    proPlanConfigured: access.proPlanConfigured,
  };
}
