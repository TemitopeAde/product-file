import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import type { ApiErrorCode } from '../../shared/types';
import { DashboardApiError } from '../lib/api';
import { formatChartDate, formatDate, formatDateTime } from '../lib/format';
import { ar } from './ar';
import { bn } from './bn';
import { de } from './de';
import { en, type Messages } from './en';
import { es } from './es';
import { fr } from './fr';
import { hi } from './hi';
import { indonesian } from './id';
import { it } from './it';
import { ja } from './ja';
import { mr } from './mr';
import { nl } from './nl';
import { pt } from './pt';
import { ru } from './ru';
import { sw } from './sw';
import { ta } from './ta';
import { te } from './te';
import { tr } from './tr';
import { ur } from './ur';
import { vi } from './vi';
import { zh } from './zh';
import { zhHK } from './zh-HK';

export type { Messages };
export type PluralText = Messages['plural']['files'];

export const LOCALES = [
  { id: 'en', intl: 'en', nativeName: 'English', dir: 'ltr' },
  { id: 'zh', intl: 'zh-CN', nativeName: '简体中文', dir: 'ltr' },
  { id: 'hi', intl: 'hi', nativeName: 'हिन्दी', dir: 'ltr' },
  { id: 'es', intl: 'es', nativeName: 'Español', dir: 'ltr' },
  { id: 'fr', intl: 'fr', nativeName: 'Français', dir: 'ltr' },
  { id: 'ar', intl: 'ar', nativeName: 'العربية', dir: 'rtl' },
  { id: 'bn', intl: 'bn', nativeName: 'বাংলা', dir: 'ltr' },
  { id: 'pt', intl: 'pt-BR', nativeName: 'Português', dir: 'ltr' },
  { id: 'ru', intl: 'ru', nativeName: 'Русский', dir: 'ltr' },
  { id: 'ur', intl: 'ur', nativeName: 'اردو', dir: 'rtl' },
  { id: 'id', intl: 'id', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  { id: 'de', intl: 'de', nativeName: 'Deutsch', dir: 'ltr' },
  { id: 'ja', intl: 'ja', nativeName: '日本語', dir: 'ltr' },
  { id: 'mr', intl: 'mr', nativeName: 'मराठी', dir: 'ltr' },
  { id: 'te', intl: 'te', nativeName: 'తెలుగు', dir: 'ltr' },
  { id: 'tr', intl: 'tr', nativeName: 'Türkçe', dir: 'ltr' },
  { id: 'ta', intl: 'ta', nativeName: 'தமிழ்', dir: 'ltr' },
  { id: 'zh-HK', intl: 'zh-HK', nativeName: '繁體中文', dir: 'ltr' },
  { id: 'vi', intl: 'vi', nativeName: 'Tiếng Việt', dir: 'ltr' },
  { id: 'sw', intl: 'sw', nativeName: 'Kiswahili', dir: 'ltr' },
  { id: 'it', intl: 'it', nativeName: 'Italiano', dir: 'ltr' },
  { id: 'nl', intl: 'nl', nativeName: 'Nederlands', dir: 'ltr' },
] as const;

export type LocaleId = (typeof LOCALES)[number]['id'];

export const CATALOGS: Record<LocaleId, Messages> = {
  en,
  zh,
  hi,
  es,
  fr,
  ar,
  bn,
  pt,
  ru,
  ur,
  id: indonesian,
  de,
  ja,
  mr,
  te,
  tr,
  ta,
  'zh-HK': zhHK,
  vi,
  sw,
  it,
  nl,
};

const STORAGE_KEY = 'product-file.locale';

export function isLocaleId(value: string | null): value is LocaleId {
  return LOCALES.some((locale) => locale.id === value);
}

export function intlLocale(id: LocaleId): string {
  return LOCALES.find((locale) => locale.id === id)?.intl ?? 'en';
}

let activeMessages: Messages = en;

export function getActiveMessages(): Messages {
  return activeMessages;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function pluralize(locale: string, forms: PluralText, count: number, vars: Record<string, string | number> = {}): string {
  const category = new Intl.PluralRules(locale).select(count);
  const template = category === 'one' ? forms.one : forms.other;
  return fill(template, { ...vars, count: count.toLocaleString(locale) });
}

export function lookup(map: Record<string, string>, key: string, fallback: string): string {
  return Object.prototype.hasOwnProperty.call(map, key) ? (map[key] ?? fallback) : fallback;
}

export function translateError(error: unknown, messages: Messages = activeMessages): string {
  if (error instanceof DashboardApiError) {
    const code = error.code as ApiErrorCode | 'NETWORK';
    return messages.errors[code] ?? messages.errors.INTERNAL;
  }
  return messages.errors.INTERNAL;
}

function readStoredLocale(): LocaleId {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocaleId(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

interface LocaleContextValue {
  locale: LocaleId;
  intl: string;
  messages: Messages;
  setLocale: (locale: LocaleId) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function LocaleProvider({ children }: { children: ReactNode }) {
  // English on the first render so a saved choice cannot disagree with server HTML.
  // The stored choice is applied before paint.
  const [locale, setLocaleState] = useState<LocaleId>('en');
  const messages = CATALOGS[locale];
  const intl = intlLocale(locale);
  activeMessages = messages;

  useClientLayoutEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can reject storage; the choice still applies for this visit.
    }
  }, []);

  useEffect(() => {
    const dir = LOCALES.find((item) => item.id === locale)?.dir ?? 'ltr';
    document.documentElement.lang = intl;
    document.documentElement.dir = dir;
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isLocaleId(event.newValue)) setLocaleState(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [intl, locale]);

  return <LocaleContext.Provider value={{ locale, intl, messages, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useI18n must be used within LocaleProvider');
  const { locale, intl, messages, setLocale } = context;
  return {
    locale,
    intl,
    dir: LOCALES.find((item) => item.id === locale)?.dir ?? 'ltr',
    setLocale,
    m: messages,
    fill,
    plural: (forms: PluralText, count: number, vars?: Record<string, string | number>) => pluralize(intl, forms, count, vars),
    formatDate: (iso: string | null) => formatDate(iso, intl),
    formatDateTime: (iso: string | null) => formatDateTime(iso, intl),
    formatChartDate: (isoDate: string) => formatChartDate(isoDate, intl),
    formatNumber: (value: number) => value.toLocaleString(intl),
    errorMessage: (error: unknown) => translateError(error, messages),
    label: (map: Record<string, string>, key: string, fallback: string) => lookup(map, key, fallback),
  };
}
