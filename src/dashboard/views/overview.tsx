import { AlertTriangle, ArrowRight, CheckCircle2, Circle, FileCheck2, FolderUp, Package, PlugZap, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { AnalyticsResponse, BillingSummary, PluginStatusResponse, SettingsResponse } from '../../shared/types';
import { PageHeader } from '../components/page-header';
import { ErrorState, LoadingRows } from '../components/states';
import { UploadChart } from '../components/upload-chart';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import type { Navigate } from '../lib/navigation';
import { addPlugin } from '../lib/plugins';
import { useResource } from '../lib/use-resource';
import { PlanCard } from './plan-card';

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ done, title, description, action }: { done: boolean | null; title: string; description: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Not done" />}
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {!done && action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export function OverviewView({ navigate }: { navigate: Navigate }) {
  const billing = useResource<BillingSummary>('/api/billing');
  const analytics = useResource<AnalyticsResponse>('/api/analytics');
  const plugins = useResource<PluginStatusResponse>('/api/plugin-status');
  const settings = useResource<SettingsResponse>('/api/settings');

  const totals = analytics.data?.totals;
  const quotaReached = billing.data?.usage.remaining === 0;
  const pageVersion = plugins.data?.productPageVersion ?? 'UNKNOWN';
  const [addingCheckoutPlugin, setAddingCheckoutPlugin] = useState(false);

  const addCheckoutPlugin = async () => {
    setAddingCheckoutPlugin(true);
    try {
      if (await addPlugin('checkout', pageVersion)) plugins.reload();
    } finally {
      setAddingCheckoutPlugin(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Collect files from customers on your product pages and receive them with each order."
        actions={
          <Button disabled={addingCheckoutPlugin} onClick={() => void addCheckoutPlugin()}>
            <PlugZap aria-hidden="true" />
            {addingCheckoutPlugin ? 'Adding checkout plugin…' : 'Add checkout plugin'}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        {billing.data && !billing.data.proPlanConfigured && billing.data.plan.packageName ? (
          <Alert variant="warning"><AlertTriangle /><div><AlertTitle>Paid plan not recognized</AlertTitle><AlertDescription>Your Wix plan “{billing.data.plan.packageName}” isn’t mapped to Pro in this app’s configuration, so Basic limits apply. Contact support.</AlertDescription></div></Alert>
        ) : null}
        {quotaReached && totals && totals.requiredProducts > 0 ? (
          <Alert variant="destructive"><AlertTriangle /><div><AlertTitle>Monthly upload limit reached</AlertTitle><AlertDescription>Customers can’t upload files until your limit resets, and products that require a file can’t be checked out. Upgrade to Pro for unlimited uploads.</AlertDescription></div></Alert>
        ) : null}
        {totals && totals.unresolvedLinks > 0 ? (
          <Alert variant="warning"><AlertTriangle /><div className="flex flex-1 flex-wrap items-center justify-between gap-2"><div><AlertTitle>{totals.unresolvedLinks} file(s) need review</AlertTitle><AlertDescription>These files belong to an order but couldn’t be matched to an exact line item.</AlertDescription></div><Button size="sm" variant="outline" onClick={() => navigate('orders')}>Review orders</Button></div></Alert>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.loading && !totals ? <LoadingRows rows={1} /> : null}
            {totals ? (
              <>
                <Stat icon={FolderUp} label="Uploads this period" value={totals.filesThisPeriod} />
                <Stat icon={FileCheck2} label="Files ready" value={totals.readyFiles} />
                <Stat icon={ShoppingBag} label="Orders with files" value={totals.ordersWithFiles} />
                <Stat icon={Package} label="Products accepting files" value={totals.enabledProducts} />
              </>
            ) : null}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Files uploaded, last 30 days</CardTitle>
              <CardDescription>Completed uploads per day (UTC).</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.error ? <ErrorState message={analytics.error} onRetry={analytics.reload} /> : analytics.data ? <UploadChart daily={analytics.data.daily} /> : <LoadingRows rows={3} />}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <PlanCard billing={billing} navigate={navigate} />
          <Card>
            <CardHeader>
              <CardTitle>Setup</CardTitle>
              <CardDescription>Finish these steps to start collecting files.</CardDescription>
            </CardHeader>
            <CardContent>
              {plugins.error ? <ErrorState message={plugins.error} onRetry={plugins.reload} /> : !plugins.data ? <LoadingRows rows={3} /> : (
                <ul className="divide-y">
                  <Step done={plugins.data.catalogVersion !== 'STORES_NOT_INSTALLED'} title="Wix Stores" description="Uploads attach to Wix Stores products." />
                  <Step done={plugins.data.productPage.placedInSlot} title="Product page uploader" description="Shows the upload box on product pages." action={plugins.data.productPage.placedInSlot === false ? <Button size="sm" variant="outline" onClick={() => void addPlugin('productPage', pageVersion).then((ok) => ok && plugins.reload())}>Add</Button> : undefined} />
                  <Step done={plugins.data.checkout.placedInSlot} title="Checkout attachments" description="Customers attach files to each item before paying." action={plugins.data.checkout.placedInSlot === false ? <Button size="sm" variant="outline" onClick={() => void addPlugin('checkout', pageVersion).then((ok) => ok && plugins.reload())}>Add</Button> : undefined} />
                  <Step done={totals ? totals.enabledProducts > 0 : null} title="Choose products" description="Turn on uploads for the products that need files." action={<Button size="sm" variant="outline" onClick={() => navigate('products')}>Products <ArrowRight /></Button>} />
                  <Step done={settings.data ? settings.data.checkoutVerification.verifiedAt !== null : null} title="Verify checkout" description="Place one test order with a file to unlock required uploads." action={<Button size="sm" variant="outline" onClick={() => navigate('settings')}>How</Button>} />
                </ul>
              )}
              {plugins.data?.statusError ? <p className="mt-2 text-xs text-muted-foreground">{plugins.data.statusError}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
