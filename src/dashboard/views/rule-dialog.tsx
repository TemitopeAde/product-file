import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_CAP_BYTES, MAX_FILES_CAP } from '../../shared/file-rules';
import type { ProductRule, ProductRuleInput, ProductSummary, RuleDefaults } from '../../shared/types';
import { AcceptedTypesField } from '../components/accepted-types-field';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input, Textarea } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { useI18n } from '../i18n/runtime';
import { api } from '../lib/api';

const MB = 1024 * 1024;

interface RuleDialogProps {
  product: ProductSummary | null;
  defaults: RuleDefaults;
  checkoutVerified: boolean;
  onClose: () => void;
  onSaved: (productId: string, rule: ProductRule | null) => void;
}

export function RuleDialog({ product, defaults, checkoutVerified, onClose, onSaved }: RuleDialogProps) {
  const { m, fill, errorMessage } = useI18n();
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
      toast.error(m.toasts.enterMaxSize);
      return;
    }
    setSaving(true);
    try {
      const saved = await api<ProductRule>(`/api/products/${encodeURIComponent(product.id)}/rule`, {
        method: 'PUT',
        body: { ...form, maxFileSizeBytes: bytes },
      });
      toast.success(m.toasts.uploadSettingsSaved);
      onSaved(product.id, saved);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api(`/api/products/${encodeURIComponent(product.id)}/rule`, { method: 'DELETE' });
      toast.success(m.toasts.uploadsTurnedOff);
      onSaved(product.id, null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{fill(m.rule.title, { name: product.name })}</DialogTitle>
          <DialogDescription>{m.rule.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="rule-enabled">{m.rule.accept}</Label>
              <p className="text-xs text-muted-foreground">{m.rule.acceptHelp}</p>
            </div>
            <Switch id="rule-enabled" checked={form.enabled} onCheckedChange={(enabled) => update({ enabled })} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{m.rule.requirement}</legend>
            {(['OPTIONAL', 'REQUIRED'] as const).map((value) => {
              const locked = value === 'REQUIRED' && requiredLocked;
              return (
                <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.requirement === value ? 'border-primary bg-primary/5' : ''} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}>
                  <input type="radio" name="requirement" className="mt-1" checked={form.requirement === value} disabled={locked} onChange={() => update({ requirement: value })} />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {value === 'OPTIONAL' ? m.rule.optional : m.rule.required}
                      {locked ? <Lock className="size-3.5" aria-hidden /> : null}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {value === 'OPTIONAL'
                        ? m.rule.optionalHelp
                        : locked
                          ? m.rule.requiredLocked
                          : m.rule.requiredHelp}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <AcceptedTypesField id="rule-accepted-types" types={form.acceptedTypes} maxFileSizeBytes={Math.round(Number(sizeMb) * MB) || undefined} onChange={(acceptedTypes) => update({ acceptedTypes })} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-size">{m.rule.maxSize}</Label>
              <Input id="rule-size" type="number" min={0.1} max={MAX_FILE_SIZE_CAP_BYTES / MB} step={0.1} value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-count">{m.rule.maxFiles}</Label>
              <Input id="rule-count" type="number" min={1} max={MAX_FILES_CAP} value={form.maxFiles} onChange={(e) => update({ maxFiles: Math.max(1, Math.min(MAX_FILES_CAP, Number.parseInt(e.target.value, 10) || 1)) })} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-instructions">{m.rule.instructions}</Label>
            <Textarea id="rule-instructions" maxLength={500} value={form.instructions} placeholder={m.rule.instructionsPlaceholder} onChange={(e) => update({ instructions: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {product.rule ? <Button variant="ghost" className="text-destructive" disabled={saving} onClick={() => void remove()}>{m.rule.remove}</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="outline" disabled={saving} onClick={onClose}>{m.common.cancel}</Button>
            <Button disabled={saving || form.acceptedTypes.length === 0} onClick={() => void save()}>{saving ? m.common.saving : m.common.save}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
