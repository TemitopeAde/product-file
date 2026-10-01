import { describe, expect, it } from 'vitest';
import { compatibleMediaTypes, formatBytes, isAcceptedFile, normalizeAcceptedType } from '../../src/shared/file-rules';
import { planAutoBindings } from '../../src/server/domain/auto-bind';
import { requiredFileViolations } from '../../src/server/domain/validation';
import { assertRequirementAllowed, parseRuleInput } from '../../src/server/domain/rules';

describe('file rules', () => {
  it('normalizes MIME types, wildcards, and extensions', () => {
    expect(normalizeAcceptedType(' Image/* ')).toBe('image/*');
    expect(normalizeAcceptedType('.PDF')).toBe('.pdf');
    expect(normalizeAcceptedType('pdf')).toBeNull();
    expect(normalizeAcceptedType('<script>')).toBeNull();
  });

  it('matches by MIME, wildcard, or extension', () => {
    expect(isAcceptedFile('a.png', 'image/png', ['image/*'])).toBe(true);
    expect(isAcceptedFile('a.ai', 'application/postscript', ['.ai'])).toBe(true);
    expect(isAcceptedFile('a.exe', 'application/x-msdownload', ['image/*', '.pdf'])).toBe(false);
    expect(isAcceptedFile('doc.pdf', 'application/pdf', ['application/pdf'])).toBe(true);
  });

  it('maps declared MIME types to compatible Wix media types', () => {
    expect(compatibleMediaTypes('image/png')).toContain('IMAGE');
    expect(compatibleMediaTypes('image/png')).not.toContain('DOCUMENT');
    expect(compatibleMediaTypes('application/pdf')).toContain('DOCUMENT');
  });

  it('formats sizes', () => {
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('parseRuleInput', () => {
  const valid = { productName: 'Shirt', enabled: true, requirement: 'REQUIRED', acceptedTypes: ['image/*'], maxFileSizeBytes: 1024, maxFiles: 2, instructions: '' };
  it('accepts a valid rule', () => {
    expect(parseRuleInput(valid).requirement).toBe('REQUIRED');
  });
  it.each([
    [{ ...valid, requirement: 'SOMETIMES' }],
    [{ ...valid, maxFiles: 0 }],
    [{ ...valid, maxFiles: 21 }],
    [{ ...valid, maxFileSizeBytes: 2 * 1024 * 1024 * 1024 }],
    [{ ...valid, acceptedTypes: [] }],
    [{ ...valid, acceptedTypes: ['nonsense'] }],
  ])('rejects %j', (input) => {
    expect(() => parseRuleInput(input)).toThrow();
  });
});

describe('assertRequirementAllowed', () => {
  const required = parseRuleInput({ productName: 'P', enabled: true, requirement: 'REQUIRED', acceptedTypes: ['.pdf'], maxFileSizeBytes: 10, maxFiles: 1 });
  it('blocks enabling required uploads before checkout verification', () => {
    expect(() => assertRequirementAllowed(required, null, null)).toThrow(/test order/);
  });
  it('allows it once verified', () => {
    expect(() => assertRequirementAllowed(required, null, '2026-09-01T00:00:00Z')).not.toThrow();
  });
  it('keeps an existing required rule editable', () => {
    expect(() => assertRequirementAllowed(required, { ...required, productId: 'p', updatedAt: '' }, null)).not.toThrow();
  });
});

describe('requiredFileViolations', () => {
  const items = [
    { lineItemId: 'li-1', productId: 'shirt', name: 'Shirt' },
    { lineItemId: 'li-2', productId: 'shirt', name: 'Shirt' },
    { lineItemId: 'li-3', productId: 'mug', name: 'Mug' },
  ];
  it('flags each required line item without a ready file, even for duplicate products', () => {
    const violations = requiredFileViolations(items, new Set(['shirt']), new Map([['li-1', 1]]));
    expect(violations.map((v) => v.lineItemId)).toEqual(['li-2']);
  });
  it('ignores optional products', () => {
    expect(requiredFileViolations(items, new Set(), new Map())).toEqual([]);
  });
});

describe('planAutoBindings', () => {
  const item = (lineItemId: string, variantId: string | null, capacity = 1) => ({ lineItemId, productId: 'shirt', variantId, capacity });
  it('binds when exactly one line item matches', () => {
    expect(planAutoBindings([item('li-1', 'v1')], [{ uploadId: 'u1', productId: 'shirt', variantId: null }])).toEqual([{ uploadId: 'u1', lineItemId: 'li-1' }]);
  });
  it('uses the recorded variant to disambiguate duplicate products', () => {
    expect(planAutoBindings([item('li-1', 'v1'), item('li-2', 'v2')], [{ uploadId: 'u1', productId: 'shirt', variantId: 'v2' }])).toEqual([{ uploadId: 'u1', lineItemId: 'li-2' }]);
  });
  it('leaves ambiguous uploads for the customer to choose', () => {
    expect(planAutoBindings([item('li-1', 'v1'), item('li-2', 'v1')], [{ uploadId: 'u1', productId: 'shirt', variantId: 'v1' }])).toEqual([]);
    expect(planAutoBindings([item('li-1', null), item('li-2', null)], [{ uploadId: 'u1', productId: 'shirt', variantId: null }])).toEqual([]);
  });
  it('respects the per-item file limit', () => {
    const plan = planAutoBindings([item('li-1', null, 1)], [
      { uploadId: 'u1', productId: 'shirt', variantId: null },
      { uploadId: 'u2', productId: 'shirt', variantId: null },
    ]);
    expect(plan).toEqual([{ uploadId: 'u1', lineItemId: 'li-1' }]);
  });
});
