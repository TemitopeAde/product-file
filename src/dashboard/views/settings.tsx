import { CheckCircle2, CircleDashed, PlugZap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AppSettings, PluginStatusResponse, SettingsResponse } from '../../shared/types';
import { AcceptedTypesField } from '../components/accepted-types-field';
import { PageHeader } from '../components/page-header';
import { ErrorState, LoadingRows } from '../components/states';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { api, errorText } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { addPlugin } from '../lib/plugins';
import { useResource } from '../lib/use-resource';

const MB = 1024 * 1024;

function PlacementRow({ name, placed, onAdd }: { name: string; placed: boolean | null; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">{name}</div>
      <div className="flex items-center gap-2">
        {placed ? <Badge variant="success">On your site</Badge> : null}
        <Button size="sm" variant="outline" onClick={onAdd}>{placed ? 'Add again' : 'Add to site'}</Button>
      </div>
    </div>
  );
}

export function SettingsView() {
  const resource = useResource<SettingsResponse>('/api/settings');
  const plugins = useResource<PluginStatusResponse>('/api/plugin-status');
  const [form, setForm] = useState<AppSettings | null>(null);
  const [sizeMb, setSizeMb] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCheckoutPlugin, setAddingCheckoutPlugin] = useState(false);

  useEffect(() => {
    if (!resource.data) return;
    setForm(resource.data.settings);
    setSizeMb(String(Math.round((resource.data.settings.defaults.maxFileSizeBytes / MB) * 10) / 10));
  }, [resource.data]);

  if (resource.error) return <div><PageHeader title="Settings" /><Card><ErrorState message={resource.error} onRetry={resource.reload} /></Card></div>;
  if (!form || !resource.data) return <div><PageHeader title="Settings" /><Card><LoadingRows /></Card></div>;

  const setText = (key: keyof AppSettings['storefront'], value: string) => setForm({ ...form, storefront: { ...form.storefront, [key]: value } });
  const verification = resource.data.checkoutVerification;
  const pageVersion = plugins.data?.productPageVersion ?? 'UNKNOWN';

  const save = async () => {
    const bytes = Math.round(Number(sizeMb) * MB);
    setSaving(true);
    try {
      const saved = await api<SettingsResponse>('/api/settings', { method: 'PUT', body: { ...form, defaults: { ...form.defaults, maxFileSizeBytes: bytes } } });
      resource.setData(saved);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const addCheckoutPlugin = async () => {
    setAddingCheckoutPlugin(true);
    try {
      const added = await addPlugin('checkout', pageVersion);
      if (added) plugins.reload();
    } finally {
      setAddingCheckoutPlugin(false);
    }
  };

  const refreshCheckoutFlow = () => {
    resource.reload();
    plugins.reload();
  };

  return (
    <div>
      <PageHeader title="Settings" actions={<Button disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save changes'}</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Checkout verification</CardTitle>
            <CardDescription>Required uploads block checkout, so they unlock only after this site proves the full flow works.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {verification.verifiedAt ? (
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-5 text-success" /> Verified {formatDateTime(verification.verifiedAt)}. Required uploads are available.</div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm"><CircleDashed className="size-5 text-muted-foreground" /> Not verified yet</div>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>Add the checkout plugin to your site (below).</li>
                  <li>Turn on optional uploads for a product.</li>
                  <li>On your live site, add that product to the cart and go to checkout.</li>
                  <li>Attach a file to the item in checkout and wait until it shows “Uploaded”.</li>
                  <li>Place the order (a manual or test payment method works).</li>
                </ol>
                <p className="text-sm text-muted-foreground">When the order is created with its file matched to the exact line item, verification completes automatically.</p>
                <div className="flex flex-wrap gap-2">
                  {plugins.data?.checkout.placedInSlot === true ? (
                    <Badge variant="success"><CheckCircle2 aria-hidden="true" /> Checkout plugin added</Badge>
                  ) : null}
                  <Button disabled={addingCheckoutPlugin} onClick={() => void addCheckoutPlugin()}>
                    <PlugZap aria-hidden="true" />
                    {addingCheckoutPlugin ? 'Adding checkout plugin…' : 'Add checkout plugin'}
                  </Button>
                  <Button variant="outline" onClick={refreshCheckoutFlow}>Check again</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Site plugins</CardTitle>
            <CardDescription>Place the uploaders on your product page and checkout. You can move them later in the Editor.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {plugins.error ? <ErrorState message={plugins.error} onRetry={plugins.reload} /> : !plugins.data ? <LoadingRows rows={2} /> : (
              <>
                <PlacementRow name="Product page uploader" placed={plugins.data.productPage.placedInSlot} onAdd={() => void addPlugin('productPage', pageVersion).then((ok) => ok && plugins.reload())} />
                <PlacementRow name="Checkout file attachments" placed={plugins.data.checkout.placedInSlot} onAdd={() => void addPlugin('checkout', pageVersion).then((ok) => ok && plugins.reload())} />
                {plugins.data.statusError ? <p className="pt-3 text-xs text-muted-foreground">{plugins.data.statusError}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Storefront text</CardTitle><CardDescription>What customers see on product pages and at checkout.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label htmlFor="s-ppt">Product page title</Label><Input id="s-ppt" maxLength={80} value={form.storefront.productPageTitle} onChange={(e) => setText('productPageTitle', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-pph">Product page help text</Label><Textarea id="s-pph" maxLength={300} value={form.storefront.productPageHelp} onChange={(e) => setText('productPageHelp', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-ct">Checkout title</Label><Input id="s-ct" maxLength={80} value={form.storefront.checkoutTitle} onChange={(e) => setText('checkoutTitle', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-ch">Checkout help text</Label><Textarea id="s-ch" maxLength={300} value={form.storefront.checkoutHelp} onChange={(e) => setText('checkoutHelp', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Defaults for new products</CardTitle><CardDescription>Applied when you turn on uploads for a product. You can change them per product.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AcceptedTypesField id="d-types" types={form.defaults.acceptedTypes} onChange={(acceptedTypes) => setForm({ ...form, defaults: { ...form.defaults, acceptedTypes } })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2"><Label htmlFor="d-size">Max file size (MB)</Label><Input id="d-size" type="number" min={0.1} max={1024} step={0.1} value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="d-count">Max files per item</Label><Input id="d-count" type="number" min={1} max={20} value={form.defaults.maxFiles} onChange={(e) => setForm({ ...form, defaults: { ...form.defaults, maxFiles: Number.parseInt(e.target.value, 10) || 1 } })} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
