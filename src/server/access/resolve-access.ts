// Pure access resolution: turns Wix app-instance billing data into an access tier,
// a usage period, and the actions the UI may offer. No I/O, so it is unit-tested directly.
import type { AccessTier, BillingAction, TrialStatus } from '../../shared/types';

export interface InstanceBillingInput {
  instanceId: string;
  isFree: boolean | null;
  freeTrialAvailable: boolean | null;
  billing: {
    packageName: string | null;
    billingCycle: string | null;
    timeStamp: string | null;
    autoRenewing: boolean | null;
    freeTrialStatus: string | null;
    freeTrialEndDate: string | null;
  } | null;
  ownerEmail: string | null;
  ownerEmailStatus: string | null;
  installedWixApps: string[];
}

export interface AccessConfig {
  appId: string;
  proPlanPackageNames: readonly string[];
  basicMonthlyLimit: number;
}

export interface ResolvedAccess {
  tier: AccessTier;
  unlimited: boolean;
  monthlyLimit: number | null;
  trialStatus: TrialStatus;
  trialEligible: boolean;
  trialEndDate: string | null;
  packageName: string | null;
  billingCycle: string | null;
  autoRenewing: boolean | null;
  proPlanConfigured: boolean;
  /** Anchor for the monthly usage period: the paid billing start when Wix supplies one. */
  billingPeriodAnchor: string | null;
  actions: BillingAction[];
}

const VERIFIED_EMAIL_STATUSES = new Set(['VERIFIED_OPT_IN', 'VERIFIED_OPT_OUT']);

export function isVerifiedWixEmail(email: string | null, emailStatus: string | null): boolean {
  if (!email || !emailStatus || !VERIFIED_EMAIL_STATUSES.has(emailStatus)) return false;
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0 || at !== normalized.lastIndexOf('@')) return false;
  return normalized.endsWith('@wix.com');
}

export function upgradeUrl(appId: string, instanceId: string): string {
  return `https://www.wix.com/apps/upgrade/${encodeURIComponent(appId)}?appInstanceId=${encodeURIComponent(instanceId)}`;
}

function normalizePlanName(name: string): string {
  return name.trim().toLowerCase();
}

function toTrialStatus(status: string | null): TrialStatus {
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (status === 'ENDED') return 'ENDED';
  return 'NONE';
}

function validIso(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function resolveAccess(input: InstanceBillingInput, config: AccessConfig, now: Date): ResolvedAccess {
  const proNames = new Set(config.proPlanPackageNames.map(normalizePlanName).filter((n) => n.length > 0));
  const billing = input.isFree === false ? input.billing : null;
  const packageName = billing?.packageName ?? null;
  const isProPackage = packageName !== null && proNames.has(normalizePlanName(packageName));
  const trialStatus = toTrialStatus(billing?.freeTrialStatus ?? null);
  const trialEligible = input.freeTrialAvailable === true;
  const trialEnd = validIso(billing?.freeTrialEndDate ?? null);
  // A trial grants Pro access for exactly as long as Wix reports it running: until its end date
  // when Wix supplies one. Basic is the only free plan, so any trialing package is a Pro trial,
  // even when PRO_PLAN_PACKAGE_NAMES is missing or doesn't list it.
  const trialActive = trialStatus === 'IN_PROGRESS' && (trialEnd === null || Date.parse(trialEnd) > now.getTime());

  let tier: AccessTier;
  if (isVerifiedWixEmail(input.ownerEmail, input.ownerEmailStatus)) {
    tier = 'INTERNAL_WIX';
  } else if (trialActive) {
    tier = 'PRO_TRIAL';
  } else if (isProPackage) {
    tier = 'PRO';
  } else {
    tier = 'BASIC';
  }

  const unlimited = tier !== 'BASIC';
  const reliableTrialEnd = tier === 'PRO_TRIAL' ? trialEnd : null;

  const actions: BillingAction[] = [];
  if (tier === 'BASIC') {
    actions.push({ type: trialEligible ? 'START_TRIAL' : 'UPGRADE', url: upgradeUrl(config.appId, input.instanceId) });
  }

  return {
    tier,
    unlimited,
    monthlyLimit: unlimited ? null : config.basicMonthlyLimit,
    trialStatus,
    trialEligible,
    trialEndDate: reliableTrialEnd,
    packageName,
    billingCycle: billing?.billingCycle ?? null,
    autoRenewing: billing?.autoRenewing ?? null,
    proPlanConfigured: proNames.size > 0,
    billingPeriodAnchor: isProPackage ? validIso(billing?.timeStamp ?? null) : null,
    actions,
  };
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function anniversaryInMonth(year: number, month: number, anchorDay: number): Date {
  const normalizedYear = year + Math.floor(month / 12);
  const normalizedMonth = ((month % 12) + 12) % 12;
  const day = Math.min(anchorDay, daysInUtcMonth(normalizedYear, normalizedMonth));
  return new Date(Date.UTC(normalizedYear, normalizedMonth, day));
}

/**
 * Monthly period containing `now`, resetting at 00:00 UTC on the anchor's day of month.
 * Anchors on the 29th–31st reset on the last day of shorter months.
 */
export function monthlyPeriod(anchor: Date, now: Date): { start: Date; end: Date } {
  const anchorDay = anchor.getUTCDate();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  let start = anniversaryInMonth(year, month, anchorDay);
  if (start.getTime() > now.getTime()) start = anniversaryInMonth(year, month - 1, anchorDay);
  const end = anniversaryInMonth(start.getUTCFullYear(), start.getUTCMonth() + 1, anchorDay);
  return { start, end };
}
