const EMPTY = '—';

export function formatDate(iso: string | null, locale: string): string {
  if (!iso) return EMPTY;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? EMPTY : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return EMPTY;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? EMPTY : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatChartDate(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
