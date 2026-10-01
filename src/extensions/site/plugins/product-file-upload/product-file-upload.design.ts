import { DEFAULT_FONT } from '../../../../site/dom';

export const DESIGN_PROPS = [
  'title-font',
  'title-decoration',
  'body-font',
  'body-decoration',
  'title-color',
  'body-color',
  'accent-color',
  'accent-text-color',
  'surface-color',
  'dropzone-color',
  'border-color',
  'error-color',
  'border-width',
  'corner-radius',
  'container-padding',
] as const;

export type DesignProp = (typeof DESIGN_PROPS)[number];
export type ProductFileDesign = Record<DesignProp, string>;

export const DEFAULT_DESIGN: ProductFileDesign = {
  'title-font': DEFAULT_FONT,
  'title-decoration': '',
  'body-font': DEFAULT_FONT,
  'body-decoration': '',
  'title-color': 'var(--wst-heading-1-color, var(--wst-color-title, #000000))',
  'body-color': 'var(--wst-color-text-primary, #333333)',
  'accent-color': 'var(--wst-button-color-fill-primary, #116dff)',
  'accent-text-color': 'var(--wst-button-color-text-primary, #ffffff)',
  'surface-color': 'var(--wst-color-fill-background-primary, #ffffff)',
  'dropzone-color': 'var(--wst-color-fill-background-primary, #ffffff)',
  'border-color': 'var(--wst-color-line, #999999)',
  'error-color': '#d6453d',
  'border-width': '1.5',
  'corner-radius': '8',
  'container-padding': '16',
};

export function isDesignProp(value: string): value is DesignProp {
  return (DESIGN_PROPS as readonly string[]).includes(value);
}

const VARIABLE_BY_PROP: Record<DesignProp, string> = {
  'title-font': '--pfu-title-font',
  'title-decoration': '--pfu-title-decoration',
  'body-font': '--pfu-body-font',
  'body-decoration': '--pfu-body-decoration',
  'title-color': '--pfu-title-color',
  'body-color': '--pfu-body-color',
  'accent-color': '--pfu-accent',
  'accent-text-color': '--pfu-accent-text',
  'surface-color': '--pfu-surface',
  'dropzone-color': '--pfu-dropzone',
  'border-color': '--pfu-border-color',
  'error-color': '--pfu-error-color',
  'border-width': '--pfu-border-width',
  'corner-radius': '--pfu-radius',
  'container-padding': '--pfu-padding',
};

const PIXEL_PROPS = new Set<DesignProp>(['border-width', 'corner-radius', 'container-padding']);

export function readDesign(element: HTMLElement): ProductFileDesign {
  return Object.fromEntries(
    DESIGN_PROPS.map((prop) => [prop, element.getAttribute(prop) ?? DEFAULT_DESIGN[prop]]),
  ) as ProductFileDesign;
}

export function applyDesign(element: HTMLElement, design: ProductFileDesign): void {
  for (const prop of DESIGN_PROPS) {
    const variable = VARIABLE_BY_PROP[prop];
    const value = design[prop].trim();
    if (!value) {
      element.style.removeProperty(variable);
      continue;
    }
    if (PIXEL_PROPS.has(prop)) {
      const parsed = Number(value);
      const limits = prop === 'border-width' ? [0, 12] : prop === 'corner-radius' ? [0, 100] : [0, 80];
      const bounded = Number.isFinite(parsed) ? Math.min(limits[1], Math.max(limits[0], parsed)) : Number(DEFAULT_DESIGN[prop]);
      element.style.setProperty(variable, `${bounded}px`);
    } else {
      element.style.setProperty(variable, value);
    }
  }
}

export function selectedFonts(design: ProductFileDesign): string[] {
  return [...new Set([design['title-font'].trim(), design['body-font'].trim()].filter(Boolean))];
}
