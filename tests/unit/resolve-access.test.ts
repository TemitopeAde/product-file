import { describe, expect, it } from 'vitest';
import { isVerifiedWixEmail, monthlyPeriod, resolveAccess, type InstanceBillingInput } from '../../src/server/access/resolve-access';

const config = { appId: 'app-1', proPlanPackageNames: ['pro'], basicMonthlyLimit: 10 };
const now = new Date('2026-09-29T12:00:00Z');

function instance(patch: Partial<InstanceBillingInput> = {}): InstanceBillingInput {
  return {
    instanceId: 'inst-1',
    isFree: true,
    freeTrialAvailable: true,
    billing: null,
    ownerEmail: 'owner@example.com',
    ownerEmailStatus: 'VERIFIED_OPT_IN',
    installedWixApps: [],
    ...patch,
  };
}

function paid(packageName: string, freeTrialStatus: string | null = null, freeTrialEndDate: string | null = null) {
  return {
    isFree: false,
    billing: { packageName, billingCycle: 'MONTHLY', timeStamp: '2026-09-10T08:00:00Z', autoRenewing: true, freeTrialStatus, freeTrialEndDate },
  };
}

describe('isVerifiedWixEmail', () => {
  it('accepts a verified @wix.com address after normalization', () => {
    expect(isVerifiedWixEmail('  Jane.Doe@WIX.com ', 'VERIFIED_OPT_OUT')).toBe(true);
  });
  it.each([
    ['jane@wix.com', 'NOT_VERIFIED_OPT_IN'],
    ['jane@wix.com', null],
    ['jane@sub.wix.com', 'VERIFIED_OPT_IN'],
    ['jane@wix.com.evil.io', 'VERIFIED_OPT_IN'],
    ['jane@notwix.com', 'VERIFIED_OPT_IN'],
    ['a@b@wix.com', 'VERIFIED_OPT_IN'],
    ['@wix.com', 'VERIFIED_OPT_IN'],
    [null, 'VERIFIED_OPT_IN'],
  ])('rejects %s with status %s', (email, status) => {
    expect(isVerifiedWixEmail(email, status)).toBe(false);
  });
});

describe('resolveAccess', () => {
  it('grants INTERNAL_WIX only for a verified wix.com owner', () => {
    expect(resolveAccess(instance({ ownerEmail: 'dev@wix.com' }), config, now).tier).toBe('INTERNAL_WIX');
    expect(resolveAccess(instance({ ownerEmail: 'dev@wix.com', ownerEmailStatus: 'NOT_VERIFIED_OPT_OUT' }), config, now).tier).toBe('BASIC');
  });

  it('is BASIC with a start-trial action when a trial is available', () => {
    const access = resolveAccess(instance(), config, now);
    expect(access.tier).toBe('BASIC');
    expect(access.monthlyLimit).toBe(10);
    expect(access.actions).toEqual([{ type: 'START_TRIAL', url: 'https://www.wix.com/apps/upgrade/app-1?appInstanceId=inst-1' }]);
  });

  it('offers UPGRADE when no trial is available', () => {
    expect(resolveAccess(instance({ freeTrialAvailable: false }), config, now).actions[0]?.type).toBe('UPGRADE');
  });

  it('maps an active configured plan to PRO, case-insensitively', () => {
    const access = resolveAccess(instance(paid('PRO')), config, now);
    expect(access.tier).toBe('PRO');
    expect(access.unlimited).toBe(true);
    expect(access.actions).toEqual([]);
    expect(access.billingPeriodAnchor).toBe('2026-09-10T08:00:00.000Z');
  });

  it('maps an in-progress trial of the Pro plan to PRO_TRIAL without inventing an end date', () => {
    const access = resolveAccess(instance(paid('pro', 'IN_PROGRESS')), config, now);
    expect(access.tier).toBe('PRO_TRIAL');
    expect(access.trialEndDate).toBeNull();
  });

  it('shows a trial end date only when Wix supplies a future one', () => {
    expect(resolveAccess(instance(paid('pro', 'IN_PROGRESS', '2026-10-05T00:00:00Z')), config, now).trialEndDate).toBe('2026-10-05T00:00:00.000Z');
    expect(resolveAccess(instance(paid('pro', 'IN_PROGRESS', '2026-09-01T00:00:00Z')), config, now).trialEndDate).toBeNull();
  });

  it('grants unlimited access for the whole trial window and not after it', () => {
    const during = resolveAccess(instance(paid('pro', 'IN_PROGRESS', '2026-10-05T00:00:00Z')), config, now);
    expect(during.tier).toBe('PRO_TRIAL');
    expect(during.unlimited).toBe(true);
    expect(during.monthlyLimit).toBeNull();
    expect(during.actions).toEqual([]);

    const lastMoment = new Date('2026-10-04T23:59:59Z');
    expect(resolveAccess(instance(paid('pro', 'IN_PROGRESS', '2026-10-05T00:00:00Z')), config, lastMoment).tier).toBe('PRO_TRIAL');

    const pastEnd = new Date('2026-10-05T00:00:00Z');
    const unconfigured = { ...config, proPlanPackageNames: [] };
    const after = resolveAccess(instance(paid('pro', 'IN_PROGRESS', '2026-10-05T00:00:00Z')), unconfigured, pastEnd);
    expect(after.tier).toBe('BASIC');
    expect(after.monthlyLimit).toBe(10);
  });

  it('keeps Pro after a trial converts to a paid subscription', () => {
    expect(resolveAccess(instance(paid('pro', 'ENDED', '2026-09-20T00:00:00Z')), config, now).tier).toBe('PRO');
  });

  it('honors an active trial even when the package name is not configured as Pro', () => {
    expect(resolveAccess(instance(paid('Premium Monthly', 'IN_PROGRESS', '2026-10-05T00:00:00Z')), config, now).tier).toBe('PRO_TRIAL');
    expect(resolveAccess(instance(paid('pro', 'IN_PROGRESS')), { ...config, proPlanPackageNames: [] }, now).tier).toBe('PRO_TRIAL');
  });

  it('falls back to BASIC after a trial expires or a subscription is cancelled (isFree returns to true)', () => {
    const expired = instance({ isFree: true, billing: paid('pro', 'ENDED').billing });
    expect(resolveAccess(expired, config, now).tier).toBe('BASIC');
  });

  it('does not treat an unconfigured paid package as Pro', () => {
    const access = resolveAccess(instance(paid('enterprise')), config, now);
    expect(access.tier).toBe('BASIC');
    expect(resolveAccess(instance(paid('pro')), { ...config, proPlanPackageNames: [] }, now).proPlanConfigured).toBe(false);
  });
});

describe('monthlyPeriod', () => {
  it('resets on the install anniversary in UTC', () => {
    const period = monthlyPeriod(new Date('2026-03-15T22:30:00Z'), new Date('2026-09-29T00:00:00Z'));
    expect(period.start.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-10-15T00:00:00.000Z');
  });

  it('uses the previous month before the anniversary day', () => {
    const period = monthlyPeriod(new Date('2026-01-20T00:00:00Z'), new Date('2026-09-05T00:00:00Z'));
    expect(period.start.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    expect(period.end.toISOString()).toBe('2026-09-20T00:00:00.000Z');
  });

  it('clamps day 31 anchors to short months and crosses years', () => {
    expect(monthlyPeriod(new Date('2025-01-31T00:00:00Z'), new Date('2026-02-28T05:00:00Z')).start.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    const december = monthlyPeriod(new Date('2025-01-31T00:00:00Z'), new Date('2026-01-10T00:00:00Z'));
    expect(december.start.toISOString()).toBe('2025-12-31T00:00:00.000Z');
    expect(december.end.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('includes the exact reset instant in the new period', () => {
    expect(monthlyPeriod(new Date('2026-01-10T00:00:00Z'), new Date('2026-09-10T00:00:00Z')).start.toISOString()).toBe('2026-09-10T00:00:00.000Z');
  });
});
