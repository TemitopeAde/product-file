import { describe, expect, it } from 'vitest';
import { de } from '../../src/dashboard/i18n/de';
import { en } from '../../src/dashboard/i18n/en';
import { fr } from '../../src/dashboard/i18n/fr';
import { CATALOGS, fill, isLocaleId, LOCALES, pluralize } from '../../src/dashboard/i18n/runtime';

function placeholders(value: string): string {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort().join(',');
}

function compare(english: unknown, other: unknown, path: string, errors: string[]) {
  if (typeof english === 'string') {
    if (typeof other !== 'string') {
      errors.push(`${path} is not a string`);
      return;
    }
    if (other.trim() === '') errors.push(`${path} is empty`);
    const left = placeholders(english);
    const right = placeholders(other);
    if (left !== right) errors.push(`${path} placeholders {${left}} vs {${right}}`);
    return;
  }
  if (!english || !other || typeof english !== 'object' || typeof other !== 'object') {
    errors.push(`${path} shape differs`);
    return;
  }
  const leftKeys = Object.keys(english).sort();
  const rightKeys = Object.keys(other).sort();
  if (leftKeys.join() !== rightKeys.join()) errors.push(`${path} keys differ`);
  for (const key of leftKeys) {
    compare((english as Record<string, unknown>)[key], (other as Record<string, unknown>)[key], `${path}.${key}`, errors);
  }
}

describe('dashboard catalogs', () => {
  it('defaults to English and lists every shipped locale', () => {
    expect(LOCALES[0]?.id).toBe('en');
    expect(LOCALES.map((locale) => locale.id)).toEqual(Object.keys(CATALOGS));
    expect(LOCALES.filter((locale) => locale.dir === 'rtl').map((locale) => locale.id)).toEqual(['ar', 'ur']);
    expect(isLocaleId('en')).toBe(true);
    expect(isLocaleId('xx')).toBe(false);
    expect(isLocaleId(null)).toBe(false);
  });

  it('keeps the same placeholders in every language', () => {
    const errors: string[] = [];
    for (const locale of LOCALES) {
      if (locale.id === 'en') continue;
      compare(en, CATALOGS[locale.id], locale.id, errors);
    }
    expect(errors).toEqual([]);
  });

  it('fills placeholders and pluralizes with the active locale', () => {
    expect(fill('Order #{number}', { number: '1042' })).toBe('Order #1042');
    expect(pluralize('en', en.plural.files, 1)).toBe('1 file');
    expect(pluralize('en', en.plural.files, 2)).toBe('2 files');
    expect(pluralize('fr', fr.plural.files, 0)).toBe('0 fichier');
    expect(pluralize('de', de.plural.files, 0)).toBe('0 Dateien');
  });
});
