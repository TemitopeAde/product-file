import { CheckCircle2, CircleDashed, PlugZap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AppSettings, PluginStatusResponse, SettingsResponse } from '../../shared/types';
import { MAX_FILE_SIZE_CAP_BYTES } from '../../shared/file-rules';
import { AcceptedTypesField } from '../components/accepted-types-field';
import { PageHeader } from '../components/page-header';
import { ErrorState, LoadingRows } from '../components/states';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useI18n } from '../i18n/runtime';
import { api } from '../lib/api';
import { addPlugin } from '../lib/plugins';
import { useResource } from '../lib/use-resource';

const MB = 1024 * 1024;

function PlacementRow({ name, placed, onAdd }: { name: string; placed: boolean | null; onAdd: () => void }) {
  const { m } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">{name}</div>
      <div className="flex items-center gap-2">
        {placed ? <Badge variant="success">{m.settings.onSite}</Badge> : null}
        <Button size="sm" variant="outline" onClick={onAdd}>{placed ? m.settings.addAgain : m.settings.addToSite}</Button>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { m, fill, formatDateTime, errorMessage } = useI18n();
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

  if (resource.error) return <div><PageHeader title={m.settings.title} /><Card><ErrorState error={resource.error} onRetry={resource.reload} /></Card></div>;
  if (!form || !resource.data) return <div><PageHeader title={m.settings.title} /><Card><LoadingRows /></Card></div>;

  const setText = (key: keyof AppSettings['storefront'], value: string) => setForm({ ...form, storefront: { ...form.storefront, [key]: value } });
  const verification = resource.data.checkoutVerification;
  const pageVersion = plugins.data?.productPageVersion ?? 'UNKNOWN';

  const save = async () => {
    const bytes = Math.round(Number(sizeMb) * MB);
    setSaving(true);
    try {
      const saved = await api<SettingsResponse>('/api/settings', { method: 'PUT', body: { ...form, defaults: { ...form.defaults, maxFileSizeBytes: bytes } } });
      resource.setData(saved);
      toast.success(m.toasts.settingsSaved);
    } catch (error) {
      toast.error(errorMessage(error));
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
      <PageHeader title={m.settings.title} actions={<Button disabled={saving} onClick={() => void save()}>{saving ? m.common.saving : m.settings.save}</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{m.settings.verification}</CardTitle>
            <CardDescription>{m.settings.verificationBody}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {verification.verifiedAt ? (
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-5 text-success" /> {fill(m.settings.verified, { date: formatDateTime(verification.verifiedAt) })}</div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm"><CircleDashed className="size-5 text-muted-foreground" /> {m.settings.notVerified}</div>
                <ol className="list-decimal space-y-1.5 ps-5 text-sm text-muted-foreground">
                  <li>{m.settings.stepAddPlugin}</li>
                  <li>{m.settings.stepOptional}</li>
                  <li>{m.settings.stepLive}</li>
                  <li>{m.settings.stepAttach}</li>
                  <li>{m.settings.stepPlace}</li>
                </ol>
                <p className="text-sm text-muted-foreground">{m.settings.verificationDone}</p>
                <div className="flex flex-wrap gap-2">
                  {plugins.data?.checkout.placedInSlot === true ? (
                    <Badge variant="success"><CheckCircle2 aria-hidden="true" /> {m.settings.pluginAdded}</Badge>
                  ) : null}
                  <Button disabled={addingCheckoutPlugin} onClick={() => void addCheckoutPlugin()}>
                    <PlugZap aria-hidden="true" />
                    {addingCheckoutPlugin ? m.overview.addingCheckout : m.overview.addCheckout}
                  </Button>
                  <Button variant="outline" onClick={refreshCheckoutFlow}>{m.settings.checkAgain}</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.settings.plugins}</CardTitle>
            <CardDescription>{m.settings.pluginsBody}</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {plugins.error ? <ErrorState error={plugins.error} onRetry={plugins.reload} /> : !plugins.data ? <LoadingRows rows={2} /> : (
              <>
                <PlacementRow name={m.settings.productPage} placed={plugins.data.productPage.placedInSlot} onAdd={() => void addPlugin('productPage', pageVersion).then((ok) => ok && plugins.reload())} />
                <PlacementRow name={m.settings.checkoutFiles} placed={plugins.data.checkout.placedInSlot} onAdd={() => void addPlugin('checkout', pageVersion).then((ok) => ok && plugins.reload())} />
                {plugins.data.statusError ? <p className="pt-3 text-xs text-muted-foreground">{m.overview.pluginStatusError}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{m.settings.storefront}</CardTitle><CardDescription>{m.settings.storefrontBody}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2"><Label htmlFor="s-ppt">{m.settings.productPageTitle}</Label><Input id="s-ppt" maxLength={80} value={form.storefront.productPageTitle} onChange={(e) => setText('productPageTitle', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-pph">{m.settings.productPageHelp}</Label><Textarea id="s-pph" maxLength={300} value={form.storefront.productPageHelp} onChange={(e) => setText('productPageHelp', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-ct">{m.settings.checkoutTitle}</Label><Input id="s-ct" maxLength={80} value={form.storefront.checkoutTitle} onChange={(e) => setText('checkoutTitle', e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="s-ch">{m.settings.checkoutHelp}</Label><Textarea id="s-ch" maxLength={300} value={form.storefront.checkoutHelp} onChange={(e) => setText('checkoutHelp', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{m.settings.defaults}</CardTitle><CardDescription>{m.settings.defaultsBody}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AcceptedTypesField id="d-types" types={form.defaults.acceptedTypes} maxFileSizeBytes={Math.round(Number(sizeMb) * MB) || undefined} onChange={(acceptedTypes) => setForm({ ...form, defaults: { ...form.defaults, acceptedTypes } })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2"><Label htmlFor="d-size">{m.settings.maxSize}</Label><Input id="d-size" type="number" min={0.1} max={MAX_FILE_SIZE_CAP_BYTES / MB} step={0.1} value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="d-count">{m.settings.maxFiles}</Label><Input id="d-count" type="number" min={1} max={20} value={form.defaults.maxFiles} onChange={(e) => setForm({ ...form, defaults: { ...form.defaults, maxFiles: Number.parseInt(e.target.value, 10) || 1 } })} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
