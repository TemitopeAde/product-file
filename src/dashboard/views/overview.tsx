import { AlertTriangle, ArrowRight, CheckCircle2, Circle, FileCheck2, FolderUp, Package, PlugZap, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { AnalyticsResponse, BillingSummary, PluginStatusResponse, SettingsResponse } from '../../shared/types';
import { PageHeader } from '../components/page-header';
import { ErrorState, LoadingRows } from '../components/states';
import { UploadChart } from '../components/upload-chart';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useI18n } from '../i18n/runtime';
import type { Navigate } from '../lib/navigation';
import { addPlugin } from '../lib/plugins';
import { useResource } from '../lib/use-resource';
import { PlanCard } from './plan-card';

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  const { formatNumber } = useI18n();
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="size-5" /></div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Step({ done, title, description, action }: { done: boolean | null; title: string; description: string; action?: React.ReactNode }) {
  const { m } = useI18n();
  return (
    <li className="flex items-start gap-3 py-3">
      {done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label={m.common.done} /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label={m.common.notDone} />}
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {!done && action ? <div className="shrink-0">{action}</div> : null}
    </li>
  );
}

export function OverviewView({ navigate }: { navigate: Navigate }) {
  const { m, fill, plural } = useI18n();
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
        title={m.overview.title}
        description={m.overview.description}
        actions={
          <Button disabled={addingCheckoutPlugin} onClick={() => void addCheckoutPlugin()}>
            <PlugZap aria-hidden="true" />
            {addingCheckoutPlugin ? m.overview.addingCheckout : m.overview.addCheckout}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3">
        {billing.data && !billing.data.proPlanConfigured && billing.data.plan.packageName ? (
          <Alert variant="warning"><AlertTriangle /><div><AlertTitle>{m.overview.planNotRecognized}</AlertTitle><AlertDescription>{fill(m.overview.planNotMapped, { name: billing.data.plan.packageName })}</AlertDescription></div></Alert>
        ) : null}
        {quotaReached && totals && totals.requiredProducts > 0 ? (
          <Alert variant="destructive"><AlertTriangle /><div><AlertTitle>{m.overview.limitReached}</AlertTitle><AlertDescription>{m.overview.limitReachedBody}</AlertDescription></div></Alert>
        ) : null}
        {totals && totals.unresolvedLinks > 0 ? (
          <Alert variant="warning"><AlertTriangle /><div className="flex flex-1 flex-wrap items-center justify-between gap-2"><div><AlertTitle>{plural(m.overview.unresolvedTitle, totals.unresolvedLinks)}</AlertTitle><AlertDescription>{m.overview.unresolvedBody}</AlertDescription></div><Button size="sm" variant="outline" onClick={() => navigate('orders')}>{m.overview.reviewOrders}</Button></div></Alert>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.loading && !totals ? <LoadingRows rows={1} /> : null}
            {totals ? (
              <>
                <Stat icon={FolderUp} label={m.overview.uploadsThisPeriod} value={totals.filesThisPeriod} />
                <Stat icon={FileCheck2} label={m.overview.filesReady} value={totals.readyFiles} />
                <Stat icon={ShoppingBag} label={m.overview.ordersWithFiles} value={totals.ordersWithFiles} />
                <Stat icon={Package} label={m.overview.productsAccepting} value={totals.enabledProducts} />
              </>
            ) : null}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{m.overview.chartTitle}</CardTitle>
              <CardDescription>{m.overview.chartDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.error ? <ErrorState error={analytics.error} onRetry={analytics.reload} /> : analytics.data ? <UploadChart daily={analytics.data.daily} /> : <LoadingRows rows={3} />}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <PlanCard billing={billing} navigate={navigate} />
          <Card>
            <CardHeader>
              <CardTitle>{m.overview.setup}</CardTitle>
              <CardDescription>{m.overview.setupDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {plugins.error ? <ErrorState error={plugins.error} onRetry={plugins.reload} /> : !plugins.data ? <LoadingRows rows={3} /> : (
                <ul className="divide-y">
                  <Step done={plugins.data.catalogVersion !== 'STORES_NOT_INSTALLED'} title={m.overview.wixStores} description={m.overview.wixStoresBody} />
                  <Step done={plugins.data.productPage.placedInSlot} title={m.overview.productPageUploader} description={m.overview.productPageUploaderBody} action={plugins.data.productPage.placedInSlot === false ? <Button size="sm" variant="outline" onClick={() => void addPlugin('productPage', pageVersion).then((ok) => ok && plugins.reload())}>{m.common.add}</Button> : undefined} />
                  <Step done={plugins.data.checkout.placedInSlot} title={m.overview.checkoutAttachments} description={m.overview.checkoutAttachmentsBody} action={plugins.data.checkout.placedInSlot === false ? <Button size="sm" variant="outline" onClick={() => void addPlugin('checkout', pageVersion).then((ok) => ok && plugins.reload())}>{m.common.add}</Button> : undefined} />
                  <Step done={totals ? totals.enabledProducts > 0 : null} title={m.overview.chooseProducts} description={m.overview.chooseProductsBody} action={<Button size="sm" variant="outline" onClick={() => navigate('products')}>{m.nav.products} <ArrowRight /></Button>} />
                  <Step done={settings.data ? settings.data.checkoutVerification.verifiedAt !== null : null} title={m.overview.verifyCheckout} description={m.overview.verifyCheckoutBody} action={<Button size="sm" variant="outline" onClick={() => navigate('settings')}>{m.overview.how}</Button>} />
                </ul>
              )}
              {plugins.data?.statusError ? <p className="mt-2 text-xs text-muted-foreground">{m.overview.pluginStatusError}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
