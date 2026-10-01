import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MAX_FILES_CAP } from '../../shared/file-rules';
import type { ProductRule, ProductRuleInput, ProductSummary, RuleDefaults } from '../../shared/types';
import { AcceptedTypesField } from '../components/accepted-types-field';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { api, errorText } from '../lib/api';

const MB = 1024 * 1024;

interface RuleDialogProps {
  product: ProductSummary | null;
  defaults: RuleDefaults;
  checkoutVerified: boolean;
  onClose: () => void;
  onSaved: (productId: string, rule: ProductRule | null) => void;
}

export function RuleDialog({ product, defaults, checkoutVerified, onClose, onSaved }: RuleDialogProps) {
  const [form, setForm] = useState<ProductRuleInput | null>(null);
  const [sizeMb, setSizeMb] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    const rule = product.rule;
    const initial: ProductRuleInput = rule
      ? { ...rule, productName: product.name }
      : { productName: product.name, enabled: true, requirement: 'OPTIONAL', instructions: '', ...defaults };
    setForm(initial);
    setSizeMb(String(Math.round((initial.maxFileSizeBytes / MB) * 10) / 10));
  }, [product, defaults]);

  if (!product || !form) return null;
  const requiredLocked = !checkoutVerified && !(product.rule?.enabled && product.rule.requirement === 'REQUIRED');
  const update = (patch: Partial<ProductRuleInput>) => setForm({ ...form, ...patch });
  const save = async () => {
    const bytes = Math.round(Number(sizeMb) * MB);
    if (!Number.isFinite(bytes) || bytes <= 0) {
      toast.error('Enter a maximum file size.');
      return;
    }
    setSaving(true);
    try {
      const saved = await api<ProductRule>(`/api/products/${encodeURIComponent(product.id)}/rule`, {
        method: 'PUT',
        body: { ...form, maxFileSizeBytes: bytes },
      });
      toast.success('Upload settings saved');
      onSaved(product.id, saved);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api(`/api/products/${encodeURIComponent(product.id)}/rule`, { method: 'DELETE' });
      toast.success('Uploads turned off for this product');
      onSaved(product.id, null);
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>File uploads for “{product.name}”</DialogTitle>
          <DialogDescription>Customers upload these files on the product page or at checkout. Files are stored privately in your Media Manager.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="rule-enabled">Accept files for this product</Label>
              <p className="text-xs text-muted-foreground">Turning this off hides the uploader. Existing files are kept.</p>
            </div>
            <Switch id="rule-enabled" checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Requirement</legend>
            {(['OPTIONAL', 'REQUIRED'] as const).map((value) => {
              const locked = value === 'REQUIRED' && requiredLocked;
              return (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.requirement === value ? 'border-primary bg-primary/5' : ''} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input type="radio" name="requirement" className="mt-1" checked={form.requirement === value} disabled={locked} onChange={() => update({ requirement: value })} />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {value === 'OPTIONAL' ? 'Optional' : 'Required — block checkout without a file'}
                      {locked ? <Lock className="size-3.5" aria-hidden /> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {value === 'OPTIONAL'
                        ? 'Customers can add files, but can order without them.'
                        : locked
                          ? 'Available after a test order proves the checkout flow on your site (Settings → Checkout verification).'
                          : 'Checkout shows an error on this item until a file is uploaded and ready.'}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <AcceptedTypesField id="rule-accepted-types" types={form.acceptedTypes} onChange={(acceptedTypes) => update({ acceptedTypes })} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-size">Maximum file size (MB)</Label>
              <Input id="rule-size" type="number" min={0.1} max={1024} step={0.1} value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-count">Maximum files per item</Label>
              <Input id="rule-count" type="number" min={1} max={MAX_FILES_CAP} value={form.maxFiles} onChange={(e) => update({ maxFiles: Math.max(1, Math.min(MAX_FILES_CAP, Number.parseInt(e.target.value, 10) || 1)) })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-instructions">Instructions for customers (optional)</Label>
            <Textarea id="rule-instructions" maxLength={500} value={form.instructions} placeholder="e.g. Upload a high-resolution PNG, at least 3000 px wide." onChange={(e) => update({ instructions: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {product.rule ? <Button variant="ghost" className="text-destructive" disabled={saving} onClick={() => void remove()}>Remove settings</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button disabled={saving || form.acceptedTypes.length === 0} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
