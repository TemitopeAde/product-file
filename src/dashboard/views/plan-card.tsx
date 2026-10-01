import { Crown, Sparkles } from 'lucide-react';
import type { BillingSummary } from '../../shared/types';
import { ErrorState, LoadingRows } from '../components/states';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { useI18n } from '../i18n/runtime';
import { openExternal } from '../lib/format';
import type { Navigate } from '../lib/navigation';
import type { Resource } from '../lib/use-resource';

export function PlanCard({ billing, navigate }: { billing: Resource<BillingSummary>; navigate?: Navigate }) {
  const { m, fill, formatDate, formatNumber } = useI18n();
  const data = billing.data;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{m.plan.title}</CardTitle>
          {data ? <Badge variant={data.tier === 'BASIC' ? 'secondary' : 'default'}>{data.tier === 'BASIC' ? null : <Crown />}{m.tiers[data.tier]}</Badge> : null}
        </div>
        <CardDescription>{m.plan.managedByWix}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {billing.error ? <ErrorState error={billing.error} onRetry={billing.reload} /> : !data ? <LoadingRows rows={2} /> : (
          <>
            {data.usage.limit !== null ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium tabular-nums">{fill(m.plan.usedOfLimit, { used: formatNumber(data.usage.used), limit: formatNumber(data.usage.limit) })}</span>
                  <span className="text-muted-foreground">{fill(m.plan.remaining, { count: formatNumber(data.usage.remaining ?? 0) })}</span>
                </div>
                <Progress value={(data.usage.used / data.usage.limit) * 100} indicatorClassName={data.usage.remaining === 0 ? 'bg-destructive' : undefined} aria-label={m.plan.usageLabel} />
                <p className="text-xs text-muted-foreground">{fill(m.plan.resets, { date: formatDate(data.usage.periodEnd) })}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{fill(m.plan.unlimited, { used: formatNumber(data.usage.used) })}</p>
            )}
            {data.trial.status === 'IN_PROGRESS' ? (
              <p className="text-sm text-muted-foreground">{data.trial.endDate ? fill(m.plan.trialActiveUntil, { date: formatDate(data.trial.endDate) }) : m.plan.trialActive}</p>
            ) : null}
            {data.actions.map((action) => (
              <Button key={action.type} onClick={() => openExternal(action.url)}>
                <Sparkles /> {action.type === 'START_TRIAL' ? m.plan.startTrial : action.type === 'UPGRADE' ? m.plan.upgrade : m.plan.manage}
              </Button>
            ))}
            {navigate ? <Button variant="link" className="h-auto self-start p-0" onClick={() => navigate('billing')}>{m.plan.details}</Button> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
