// Lucide icon paths drawn as plain SVG, so site plugins can use them without rendering React.

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_PATHS = {
  x: ['M18 6 6 18', 'm6 6 12 12'],
  trash: ['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4'],
  check: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'm9 12 2 2 4-4'],
  alert: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 8v4', 'M12 16h.01'],
  paperclip: ['m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName, className = 'pfu-icon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = { class: className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, value);
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
