import { acceptAttribute, formatBytes, isAcceptedFile } from '../../../../shared/file-rules';
import type { CheckoutLineItemState, CheckoutState, UploadRecord } from '../../../../shared/types';
import { api } from '../../../../site/api';
import { BASE_STYLES, h } from '../../../../site/dom';
import { errorMessage, liveFileItem, ruleSummary, savedFileItem, type LiveUpload } from '../../../../site/file-list';
import { removeUpload, startUpload } from '../../../../site/upload-engine';

interface SlotBrand {
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  cornerRadius?: number;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

// Checkout page slot. Binds each file to a specific checkout line item, so the same product in
// two line items keeps separate files, then asks checkout to refresh so validation re-runs.
class CheckoutFileUpload extends HTMLElement {
  static get observedAttributes() {
    return ['checkout-id', 'checkout-updated-date', 'slot-brand'];
  }

  private readonly root: ShadowRoot;
  private state: CheckoutState | null = null;
  private live = new Map<string, LiveUpload[]>();
  private errors = new Map<string, string>();
  private refreshCheckout: (() => void) | null = null;
  private brand: SlotBrand = {};
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  onRefreshCheckout(callback: () => void) {
    this.refreshCheckout = callback;
  }

  connectedCallback() {
    void this.load();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'slot-brand') {
      try {
        this.brand = value ? (JSON.parse(value) as SlotBrand) : {};
      } catch {
        this.brand = {};
      }
      this.render();
      return;
    }
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => void this.load(), 300);
  }

  private get checkoutId(): string | null {
    return this.getAttribute('checkout-id');
  }

  private async load() {
    const checkoutId = this.checkoutId;
    if (!checkoutId) return;
    try {
      this.state = await api<CheckoutState>(`/api/storefront/checkout?checkoutId=${encodeURIComponent(checkoutId)}`);
      this.errors.delete('global');
    } catch (error) {
      console.error('Failed to load checkout files', error);
      this.errors.set('global', errorMessage(error));
    }
    this.render();
  }

  private notifyCheckout() {
    try {
      this.refreshCheckout?.();
    } catch (error) {
      console.error('refreshCheckout failed', error);
    }
  }

  private async mutate(path: string, body: Record<string, string>, itemKey: string) {
    try {
      this.state = await api<CheckoutState>(path, { method: 'POST', body });
      this.errors.delete(itemKey);
      this.notifyCheckout();
    } catch (error) {
      this.errors.set(itemKey, errorMessage(error));
    }
    this.render();
  }

  private uploadFor(item: CheckoutLineItemState, files: FileList | null) {
    const checkoutId = this.checkoutId;
    if (!files || !checkoutId) return;
    this.errors.delete(item.lineItemId);
    const live = this.live.get(item.lineItemId) ?? [];
    for (const file of Array.from(files)) {
      const used = item.files.length + live.filter((l) => l.phase !== 'error').length;
      if (used >= item.rule.maxFiles) {
        this.errors.set(item.lineItemId, `This item accepts up to ${item.rule.maxFiles} file(s).`);
        break;
      }
      if (!isAcceptedFile(file.name, file.type || 'application/octet-stream', item.rule.acceptedTypes)) {
        this.errors.set(item.lineItemId, `"${file.name}" isn’t an accepted file type.`);
        continue;
      }
      if (file.size > item.rule.maxFileSizeBytes) {
        this.errors.set(item.lineItemId, `"${file.name}" is larger than ${formatBytes(item.rule.maxFileSizeBytes)}.`);
        continue;
      }
      const entry: LiveUpload = {
        key: `${file.name}-${Date.now()}`,
        fileName: file.name,
        sizeBytes: file.size,
        progress: 0,
        phase: 'reserving',
        error: null,
        cancel: () => undefined,
      };
      const handle = startUpload(
        file,
        { productId: item.productId, variantId: item.variantId, source: 'CHECKOUT', checkoutId, lineItemId: item.lineItemId },
        {
          onReserved: () => this.render(),
          onProgress: (fraction) => {
            entry.progress = fraction;
            this.render();
          },
          onPhase: (phase) => {
            entry.phase = phase;
            this.render();
          },
        },
      );
      entry.cancel = () => {
        void handle.cancel();
        this.dropLive(item.lineItemId, entry);
      };
      live.push(entry);
      handle.done
        .then(() => {
          this.dropLive(item.lineItemId, entry);
          void this.load().then(() => this.notifyCheckout());
        })
        .catch((error: unknown) => {
          entry.phase = 'error';
          entry.error = errorMessage(error);
          this.render();
        });
    }
    this.live.set(item.lineItemId, live);
    this.render();
  }

  private dropLive(lineItemId: string, entry: LiveUpload) {
    this.live.set(lineItemId, (this.live.get(lineItemId) ?? []).filter((l) => l !== entry));
    this.render();
  }

  private async removeFile(item: CheckoutLineItemState, upload: UploadRecord) {
    try {
      await removeUpload(upload.id);
      await this.load();
      this.notifyCheckout();
    } catch (error) {
      this.errors.set(item.lineItemId, errorMessage(error));
      this.render();
    }
  }

  private itemCard(item: CheckoutLineItemState, unbound: UploadRecord[]): HTMLElement {
    const checkoutId = this.checkoutId ?? '';
    const live = this.live.get(item.lineItemId) ?? [];
    const hasReady = item.files.some((f) => f.status === 'READY');
    const full = item.files.length + live.filter((l) => l.phase !== 'error').length >= item.rule.maxFiles;
    const input = h('input', { type: 'file', tabindex: '-1', 'aria-hidden': 'true', class: 'pfu-sr', accept: acceptAttribute(item.rule.acceptedTypes), multiple: item.rule.maxFiles > 1, disabled: full }) as HTMLInputElement;
    input.addEventListener('change', () => {
      this.uploadFor(item, input.files);
      input.value = '';
    });

    const candidates = unbound.filter((u) => u.productId === item.productId && u.status !== 'FAILED');
    let attach: HTMLElement | null = null;
    if (candidates.length > 0 && !full) {
      const select = h('select', { 'aria-label': `Attach an uploaded file to ${item.name}` }, ...candidates.map((u) => h('option', { value: u.id }, u.fileName))) as HTMLSelectElement;
      attach = h(
        'div',
        { class: 'pfu-row' },
        select,
        h('button', { type: 'button', class: 'pfu-link', onclick: () => void this.mutate('/api/storefront/checkout/bind', { checkoutId, lineItemId: item.lineItemId, uploadId: select.value }, item.lineItemId) }, 'Attach'),
      );
    }

    const error = this.errors.get(item.lineItemId);
    const files = [
      ...item.files.map((f) => savedFileItem(f, h('button', { type: 'button', class: 'pfu-link', onclick: () => void this.removeFile(item, f) }, 'Remove'))),
      ...live.map(liveFileItem),
    ];
    return h(
      'div',
      { class: 'pfu', role: 'group', 'aria-label': item.name },
      h(
        'p',
        { class: 'pfu-title' },
        `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`,
        item.rule.requirement === 'REQUIRED' ? h('span', { class: 'pfu-badge' }, hasReady ? 'Required ✓' : 'Required') : null,
      ),
      item.rule.instructions ? h('p', { class: 'pfu-help' }, item.rule.instructions) : null,
      h('p', { class: 'pfu-meta' }, ruleSummary(item.rule)),
      files.length > 0 ? h('ul', { class: 'pfu-list' }, ...files) : null,
      attach,
      full ? null : h('div', { class: 'pfu-row' }, input, h('button', { type: 'button', class: 'pfu-button', onclick: () => input.click() }, 'Upload file')),
      error ? h('p', { class: 'pfu-error', role: 'alert' }, error) : null,
    );
  }

  private brandStyles(): string {
    const color = (value: string | undefined) => (value && HEX.test(value) ? value : null);
    const bg = color(this.brand.backgroundColor);
    const text = color(this.brand.textColor);
    const accent = color(this.brand.buttonColor);
    const accentText = color(this.brand.buttonTextColor);
    const radius = typeof this.brand.cornerRadius === 'number' && this.brand.cornerRadius >= 0 && this.brand.cornerRadius <= 40 ? this.brand.cornerRadius : null;
    return `:host { ${bg ? `background: ${bg};` : ''} ${text ? `color: ${text};` : ''} ${accent ? `--pfu-accent: ${accent};` : ''} ${accentText ? `--pfu-accent-text: ${accentText};` : ''} ${radius !== null ? `--pfu-radius: ${radius}px;` : ''} }
      .wrap { padding: 0 16px; }`;
  }

  private render() {
    const styles = h('style', {}, BASE_STYLES + this.brandStyles());
    const state = this.state;
    const globalError = this.errors.get('global');
    if (!state || state.lineItems.length === 0) {
      const message = globalError && state === null ? h('div', { class: 'wrap' }, h('p', { class: 'pfu-error', role: 'alert' }, globalError)) : null;
      this.root.replaceChildren(styles, ...(message ? [message] : []));
      return;
    }
    this.root.replaceChildren(
      styles,
      h(
        'section',
        { class: 'wrap', 'aria-label': state.text.checkoutTitle },
        h('div', { class: 'pfu' }, h('h3', { class: 'pfu-title' }, state.text.checkoutTitle), state.text.checkoutHelp ? h('p', { class: 'pfu-help' }, state.text.checkoutHelp) : null),
        ...state.lineItems.map((item) => this.itemCard(item, state.unboundUploads)),
        globalError ? h('p', { class: 'pfu-error', role: 'alert' }, globalError) : null,
      ),
    );
  }
}

export default CheckoutFileUpload;
