// Minimal DOM builder for site plugins. Text is always set through text nodes, never HTML,
// so customer-controlled values (file names, product names) cannot inject markup.

type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (typeof value === 'function') {
      el.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Default font for all widget text, used until the site owner picks fonts in the settings panel. */
export const DEFAULT_FONT = '16px "helvetica-w01-roman"';

export const BASE_STYLES = `
  :host {
    display: block;
    font: var(--pfu-body-font, ${DEFAULT_FONT});
    color: var(--pfu-body-color, var(--wst-color-text-primary, inherit));
  }
  * { box-sizing: border-box; }
  .pfu {
    display: flex; flex-direction: column; gap: 12px; padding: var(--pfu-padding, 16px);
    color: var(--pfu-body-color, var(--wst-color-text-primary, inherit));
    font: var(--pfu-body-font, ${DEFAULT_FONT});
    text-decoration: var(--pfu-body-decoration, none);
    background: var(--pfu-surface, transparent);
    border: none;
    border-radius: var(--pfu-radius, 8px);
  }
  .pfu-title {
    margin: 0;
    color: var(--pfu-title-color, var(--wst-heading-1-color, var(--wst-color-title, currentColor)));
    font: var(--pfu-title-font, ${DEFAULT_FONT});
    text-decoration: var(--pfu-title-decoration, none);
  }
  .pfu-help, .pfu-meta { margin: 0; font-size: 0.9em; opacity: 0.8; }
  .pfu-badge { display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; font-size: 0.75em; font-weight: 600;
    background: var(--pfu-accent, #116dff); color: var(--pfu-accent-text, #fff); vertical-align: middle; }
  .pfu-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 18px;
    background: var(--pfu-dropzone, transparent); border: var(--pfu-border-width, 1.5px) dashed var(--pfu-border-color, currentColor);
    border-radius: var(--pfu-radius, 8px); opacity: 0.85; cursor: pointer; text-align: center; }
  .pfu-drop:hover, .pfu-drop:focus-within, .pfu-drop.is-over { opacity: 1; }
  .pfu-drop input { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .pfu-button { font: inherit; cursor: pointer; border: none; border-radius: var(--pfu-radius, 6px); padding: 8px 14px;
    background: var(--pfu-accent, #116dff); color: var(--pfu-accent-text, #fff); }
  .pfu-button[disabled] { opacity: 0.5; cursor: default; }
  .pfu-link { font: inherit; cursor: pointer; background: none; border: none; padding: 0; color: inherit; text-decoration: underline; }
  .pfu-actions { display: inline-flex; align-items: center; gap: 4px; }
  .pfu-icon-button { display: inline-grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 1px solid transparent;
    border-radius: var(--pfu-radius, 6px); background: transparent; color: inherit; cursor: pointer; }
  .pfu-icon-button:hover { background: rgba(127, 127, 127, 0.15); }
  .pfu-icon-button:focus-visible { outline: 2px solid var(--pfu-accent, #116dff); outline-offset: 2px; }
  .pfu-icon-button svg { width: 16px; height: 16px; }
  .pfu-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
  .pfu-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .pfu-file { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 2px 12px; align-items: center; padding: 10px 12px;
    border: var(--pfu-border-width, 1.5px) solid var(--pfu-border-color, rgba(127, 127, 127, 0.35)); border-radius: var(--pfu-radius, 6px); }
  .pfu-file-icon { grid-row: 1 / span 2; display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: var(--pfu-radius, 6px);
    background: rgba(127, 127, 127, 0.12); }
  .pfu-file-icon svg { width: 18px; height: 18px; }
  .pfu-file.is-ready .pfu-file-icon { color: var(--pfu-success-color, #1e8e3e); background: rgba(30, 142, 62, 0.12); }
  .pfu-file.is-failed .pfu-file-icon { color: var(--pfu-error-color, #d6453d); background: rgba(214, 69, 61, 0.12); }
  .pfu-name { grid-column: 2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pfu-file > .pfu-actions, .pfu-file > span:nth-child(3) { grid-column: 3; grid-row: 1 / span 2; }
  .pfu-status { grid-column: 2; font-size: 0.85em; opacity: 0.8; }
  .pfu-status.is-error { color: var(--pfu-error-color, #d6453d); opacity: 1; }
  .pfu-bar { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: rgba(127, 127, 127, 0.25); overflow: hidden; }
  .pfu-bar > span { display: block; height: 100%; background: var(--pfu-accent, #116dff); transition: width 0.2s; }
  .pfu-error { margin: 0; color: var(--pfu-error-color, #d6453d); font-size: 0.9em; }
  .pfu-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  select { font: inherit; padding: 6px 8px; border-radius: var(--pfu-radius, 6px); max-width: 100%; }
  .pfu-icon { width: 16px; height: 16px; flex-shrink: 0; }

  /* Checkout */
  .pfu-checkout { display: flex; flex-direction: column; gap: 16px; }
  .pfu-head { display: flex; flex-direction: column; gap: 4px; }
  .pfu-items { display: flex; flex-direction: column; gap: 12px; }
  .pfu-item { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--pfu-surface, transparent);
    border: 1px solid var(--pfu-border-color, rgba(127, 127, 127, 0.3)); border-radius: var(--pfu-radius, 8px); }
  .pfu-item-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .pfu-item-name { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
  .pfu-qty { font-weight: 400; opacity: 0.7; }
  .pfu-pill { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 3px 10px; border-radius: 999px;
    font-size: 0.8em; white-space: nowrap; background: rgba(127, 127, 127, 0.12); }
  .pfu-pill .pfu-icon { width: 14px; height: 14px; }
  .pfu-pill.is-done { color: var(--pfu-success-color, #1e8e3e); background: rgba(30, 142, 62, 0.12); }
  .pfu-pill.is-needed { color: var(--pfu-error-color, #d6453d); background: rgba(214, 69, 61, 0.1); }
  .pfu-upload { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; padding: 14px 12px; font: inherit;
    color: inherit; text-align: center; cursor: pointer; background: transparent; border-radius: var(--pfu-radius, 8px);
    border: 1.5px dashed var(--pfu-border-color, rgba(127, 127, 127, 0.5)); transition: border-color 0.15s, background 0.15s; }
  .pfu-upload:hover, .pfu-upload.is-over { border-color: var(--pfu-accent, #116dff); background: rgba(127, 127, 127, 0.06); }
  .pfu-upload:focus-visible { outline: 2px solid var(--pfu-accent, #116dff); outline-offset: 2px; }
  .pfu-upload-label { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
  .pfu-upload .pfu-meta { font-size: 0.8em; }
  .pfu-secondary { display: inline-flex; align-items: center; gap: 6px; font: inherit; cursor: pointer; padding: 6px 12px; color: inherit;
    background: transparent; border: 1px solid var(--pfu-border-color, rgba(127, 127, 127, 0.5)); border-radius: var(--pfu-radius, 6px); }
  .pfu-secondary:hover { background: rgba(127, 127, 127, 0.08); }
  .pfu-error { display: flex; align-items: center; gap: 6px; }
  .pfu-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`;
