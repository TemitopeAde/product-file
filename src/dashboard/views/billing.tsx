import { Check } from 'lucide-react';
import type { BillingSummary } from '../../shared/types';
import { PageHeader } from '../components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { formatDate, TIER_LABEL } from '../lib/format';
import { useResource } from '../lib/use-resource';
import { PlanCard } from './plan-card';

function Feature({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" />{children}</li>;
}

export function BillingView() {
  const billing = useResource<BillingSummary>('/api/billing');
  const data = billing.data;
  return (
    <div>
      <PageHeader title="Billing" description="Your plan is billed and managed by Wix. Prices and trials are shown on the Wix pricing page." />
      <div className="grid gap-6 lg:grid-cols-3">
        <PlanCard billing={billing} />
        <Card>
          <CardHeader>
            <CardTitle>Basic</CardTitle>
            <CardDescription>Free</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <Feature>{data?.usage.limit !== null && data?.usage.limit !== undefined ? `${data.usage.limit}` : 'Limited'} customer uploads per month</Feature>
              <Feature>Resets monthly on your install date (UTC)</Feature>
              <Feature>Product page and checkout uploaders</Feature>
              <Feature>Order-linked files and downloads</Feature>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>{data?.trial.eligible ? 'Free trial available' : 'Paid plan'}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <Feature>Unlimited customer uploads</Feature>
              <Feature>Everything in Basic</Feature>
              <Feature>Your files and settings stay if you change plans</Feature>
            </ul>
          </CardContent>
        </Card>
      </div>
      {data ? (
        <Card className="mt-6">
          <CardHeader><CardTitle>Plan details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Access</dt><dd className="font-medium">{TIER_LABEL[data.tier]}</dd></div>
              <div><dt className="text-muted-foreground">Wix plan</dt><dd className="font-medium">{data.plan.packageName ?? 'Free'}</dd></div>
              <div><dt className="text-muted-foreground">Billing cycle</dt><dd className="font-medium">{data.plan.billingCycle ? data.plan.billingCycle.toLowerCase().replaceAll('_', ' ') : '—'}</dd></div>
              <div><dt className="text-muted-foreground">Current usage period</dt><dd className="font-medium">{formatDate(data.usage.periodStart)} – {formatDate(data.usage.periodEnd)}</dd></div>
              <div><dt className="text-muted-foreground">Trial</dt><dd className="font-medium">{data.trial.status === 'IN_PROGRESS' ? 'In progress' : data.trial.status === 'ENDED' ? 'Used' : data.trial.eligible ? 'Available' : 'Not available'}</dd></div>
              {data.plan.autoRenewing !== null ? <div><dt className="text-muted-foreground">Auto-renew</dt><dd className="font-medium">{data.plan.autoRenewing ? 'On' : 'Off'}</dd></div> : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
