import { Crown, Sparkles } from 'lucide-react';
import type { BillingSummary } from '../../shared/types';
import { ErrorState, LoadingRows } from '../components/states';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { formatDate, openExternal, TIER_LABEL } from '../lib/format';
import type { Navigate } from '../lib/navigation';
import type { Resource } from '../lib/use-resource';

export function PlanCard({ billing, navigate }: { billing: Resource<BillingSummary>; navigate?: Navigate }) {
  const data = billing.data;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Plan</CardTitle>
          {data ? <Badge variant={data.tier === 'BASIC' ? 'secondary' : 'default'}>{data.tier === 'BASIC' ? null : <Crown />}{TIER_LABEL[data.tier]}</Badge> : null}
        </div>
        <CardDescription>Billing is managed by Wix.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {billing.error ? <ErrorState message={billing.error} onRetry={billing.reload} /> : !data ? <LoadingRows rows={2} /> : (
          <>
            {data.usage.limit !== null ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium tabular-nums">{data.usage.used} of {data.usage.limit} uploads</span>
                  <span className="text-muted-foreground">{data.usage.remaining} left</span>
                </div>
                <Progress value={(data.usage.used / data.usage.limit) * 100} indicatorClassName={data.usage.remaining === 0 ? 'bg-destructive' : undefined} aria-label="Monthly uploads used" />
                <p className="text-xs text-muted-foreground">Resets {formatDate(data.usage.periodEnd)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{data.usage.used}</span> uploads this period · unlimited</p>
            )}
            {data.trial.status === 'IN_PROGRESS' ? (
              <p className="text-sm text-muted-foreground">Your Pro trial is active{data.trial.endDate ? ` until ${formatDate(data.trial.endDate)}` : ''}.</p>
            ) : null}
            {data.actions.map((action) => (
              <Button key={action.type} onClick={() => openExternal(action.url)}>
                <Sparkles /> {action.type === 'START_TRIAL' ? 'Start free Pro trial' : action.type === 'UPGRADE' ? 'Upgrade to Pro' : 'Manage plan'}
              </Button>
            ))}
            {navigate ? <Button variant="link" className="h-auto self-start p-0" onClick={() => navigate('billing')}>Plan details</Button> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
