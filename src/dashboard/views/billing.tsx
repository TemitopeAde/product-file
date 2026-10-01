import { Check } from 'lucide-react';
import type { BillingSummary } from '../../shared/types';
import { PageHeader } from '../components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useI18n } from '../i18n/runtime';
import { useResource } from '../lib/use-resource';
import { PlanCard } from './plan-card';

function Feature({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" />{children}</li>;
}

export function BillingView() {
  const { m, fill, formatDate, formatNumber, label } = useI18n();
  const billing = useResource<BillingSummary>('/api/billing');
  const data = billing.data;
  const trialLabel = data?.trial.status === 'IN_PROGRESS'
    ? m.trial.inProgress
    : data?.trial.status === 'ENDED'
      ? m.trial.used
      : data?.trial.eligible
        ? m.trial.available
        : m.trial.notAvailable;
  return (
    <div>
      <PageHeader title={m.billing.title} description={m.billing.description} />
      <div className="grid gap-6 lg:grid-cols-3">
        <PlanCard billing={billing} />
        <Card>
          <CardHeader>
            <CardTitle>{m.billing.basic}</CardTitle>
            <CardDescription>{m.common.free}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <Feature>{data?.usage.limit !== null && data?.usage.limit !== undefined ? fill(m.billing.uploadsPerMonth, { count: formatNumber(data.usage.limit) }) : m.billing.limitedUploads}</Feature>
              <Feature>{m.billing.resets}</Feature>
              <Feature>{m.billing.bothUploaders}</Feature>
              <Feature>{m.billing.orderFiles}</Feature>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>{m.billing.pro}</CardTitle>
            <CardDescription>{data?.trial.eligible ? m.billing.trialAvailable : m.billing.paidPlan}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <Feature>{m.billing.unlimited}</Feature>
              <Feature>{m.billing.everythingBasic}</Feature>
              <Feature>{m.billing.kept}</Feature>
            </ul>
          </CardContent>
        </Card>
      </div>
      {data ? (
        <Card className="mt-6">
          <CardHeader><CardTitle>{m.billing.details}</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">{m.billing.access}</dt><dd className="font-medium">{m.tiers[data.tier]}</dd></div>
              <div><dt className="text-muted-foreground">{m.billing.wixPlan}</dt><dd className="font-medium">{data.plan.packageName ?? m.common.free}</dd></div>
              <div><dt className="text-muted-foreground">{m.billing.cycle}</dt><dd className="font-medium">{data.plan.billingCycle ? label(m.billingCycle, data.plan.billingCycle, m.billingCycle.unknown) : m.common.empty}</dd></div>
              <div><dt className="text-muted-foreground">{m.billing.period}</dt><dd className="font-medium">{fill(m.billing.periodRange, { start: formatDate(data.usage.periodStart), end: formatDate(data.usage.periodEnd) })}</dd></div>
              <div><dt className="text-muted-foreground">{m.billing.trial}</dt><dd className="font-medium">{trialLabel}</dd></div>
              {data.plan.autoRenewing !== null ? <div><dt className="text-muted-foreground">{m.billing.autoRenew}</dt><dd className="font-medium">{data.plan.autoRenewing ? m.common.on : m.common.off}</dd></div> : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
