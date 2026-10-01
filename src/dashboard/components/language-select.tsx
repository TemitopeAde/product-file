import { Languages } from 'lucide-react';
import { isLocaleId, LOCALES, useI18n } from '../i18n/runtime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function LanguageSelect() {
  const { locale, setLocale, m } = useI18n();
  return (
    <div className="flex w-full min-w-36 flex-col gap-1">
      <span id="dashboard-language-label" className="px-1 text-xs font-medium text-muted-foreground">
        {m.language.label}
      </span>
      <Select value={locale} onValueChange={(value) => { if (isLocaleId(value)) setLocale(value); }}>
        <SelectTrigger aria-labelledby="dashboard-language-label" className="h-8">
          <span className="flex min-w-0 items-center gap-2">
            <Languages className="size-4 shrink-0" aria-hidden="true" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {LOCALES.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.nativeName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
