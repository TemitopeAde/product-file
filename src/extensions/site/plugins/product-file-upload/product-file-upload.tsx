import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { site } from '@wix/site-site';
import { window as wixWindow } from '@wix/site-window';
import { acceptAttribute, formatBytes, isAcceptedFile } from '../../../../shared/file-rules';
import type { StorefrontProductConfig, UploadRecord } from '../../../../shared/types';
import { api } from '../../../../site/api';
import { BASE_STYLES, h } from '../../../../site/dom';
import { errorMessage, liveFileItem, ruleSummary, savedFileItem, type LiveUpload } from '../../../../site/file-list';
import { removeUpload, startUpload } from '../../../../site/upload-engine';
import { applyDesign, DESIGN_PROPS, isDesignProp, readDesign, selectedFonts } from './product-file-upload.design';

const LOG_PREFIX = '[Product File Upload]';

function log(message: string, details?: Record<string, boolean | number | string | null>) {
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  console.info(`${LOG_PREFIX} ${message}${suffix}`);
}

function logError(message: string, error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`${LOG_PREFIX} ${message} ${detail}`);
}

// Product page slot (old and new Stores product pages). The host passes the product plugin
// API as kebab-case attributes: `product-id` and `selected-variant-id`.
class ProductFileUpload extends HTMLElement {
  static get observedAttributes() {
    return ['product-id', 'selected-variant-id', ...DESIGN_PROPS];
  }

  private readonly root: ShadowRoot;
  private config: StorefrontProductConfig | null = null;
  private saved: UploadRecord[] = [];
  private live: LiveUpload[] = [];
  private error: string | null = null;
  private loadedProductId: string | null = null;
  private isEditor = false;
  private loading = false;
  private lastRenderState: string | null = null;
  private toasterHost: HTMLDivElement | null = null;
  private toasterRoot: Root | null = null;
  private iconRoots: Root[] = [];
  private wixDesignHtml = '';
  private wixDesignRequest = 0;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    log('custom element constructed');
  }

  async connectedCallback() {
    log('connected', {
      productId: this.currentProductId,
      variantId: this.currentVariantId,
      productIdAttributePresent: this.hasAttribute('product-id'),
    });
    try {
      const viewMode = await wixWindow.viewMode();
      this.isEditor = viewMode !== 'Site';
      log('view mode resolved', { viewMode, isEditor: this.isEditor });
    } catch (error) {
      this.isEditor = false;
      logError('view mode lookup failed; assuming published site mode.', error);
    }
    applyDesign(this, readDesign(this));
    void this.loadWixDesignResources();
    void this.load();
  }

  disconnectedCallback() {
    log('disconnected');
    this.clearActionIcons();
    this.toasterRoot?.unmount();
    this.toasterRoot = null;
    this.toasterHost = null;
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    log('host attribute changed', { name, oldValue, newValue });
    if (name === 'product-id') {
      if (this.isConnected) void this.load();
      else log('product load deferred until the element is connected');
    } else if (isDesignProp(name)) {
      applyDesign(this, readDesign(this));
      if (this.isConnected) {
        if (name === 'title-font' || name === 'body-font') void this.loadWixDesignResources();
        this.render();
      }
    }
  }

  private async loadWixDesignResources() {
    const request = ++this.wixDesignRequest;
    const fonts = selectedFonts(readDesign(this));
    try {
      const [themeHtml, fontsHtml] = await Promise.all([
        site.getSiteThemeHtml(),
        fonts.length > 0 ? site.getFontsHtml(fonts) : Promise.resolve(''),
      ]);
      if (request !== this.wixDesignRequest) return;
      this.wixDesignHtml = `${themeHtml}${fontsHtml}`;
      log('Wix theme and fonts loaded', { selectedFonts: fonts.length });
      this.render();
    } catch (error) {
      if (request !== this.wixDesignRequest) return;
      logError('Wix theme or font loading failed; using CSS fallbacks.', error);
    }
  }

  private wixDesignNodes(): Node[] {
    if (!this.wixDesignHtml) return [];
    const template = document.createElement('template');
    // This HTML is returned by Wix's site theme API, not by a visitor or merchant text field.
    template.innerHTML = this.wixDesignHtml;
    return Array.from(template.content.childNodes);
  }

  // Do not name these getters `productId` or `selectedVariantId`. Wix owns those
  // plugin API properties and assigns them directly on the custom element at runtime.
  private get currentProductId(): string | null {
    return this.getAttribute('product-id');
  }

  private get currentVariantId(): string | null {
    const value = this.getAttribute('selected-variant-id');
    return value && value !== 'undefined' ? value : null;
  }

  private async load() {
    const productId = this.currentProductId;
    if (!productId) {
      log('load skipped: host supplied no product-id attribute');
      this.render();
      return;
    }
    if (productId === this.loadedProductId) {
      log('load skipped: product is already loaded', { productId });
      this.render();
      return;
    }
    if (this.loading) {
      log('load skipped: another request is in progress', { productId, loadedProductId: this.loadedProductId });
      this.render();
      return;
    }
    this.loading = true;
    log('requesting product upload configuration', { productId });
    try {
      this.config = await api<StorefrontProductConfig>(`/api/storefront/product?productId=${encodeURIComponent(productId)}`);
      this.saved = this.config.uploads;
      this.loadedProductId = productId;
      this.error = null;
      log('product upload configuration received', {
        productId,
        enabled: this.config.enabled,
        hasRule: this.config.rule !== null,
        savedUploads: this.saved.length,
      });
    } catch (error) {
      logError(`product upload configuration failed for productId=${productId}.`, error);
      this.config = null;
      this.error = this.isEditor ? null : 'File upload is unavailable right now.';
    } finally {
      this.loading = false;
      if (this.currentProductId && this.currentProductId !== productId) {
        log('product changed during request; loading current product', { requestedProductId: productId, currentProductId: this.currentProductId });
        void this.load();
        return;
      }
      this.render();
    }
  }

  private slotsLeft(): number {
    const rule = this.config?.rule;
    if (!rule) return 0;
    const active = this.saved.filter((u) => u.status !== 'FAILED').length + this.live.filter((l) => l.phase !== 'error').length;
    return Math.max(0, rule.maxFiles - active);
  }

  private handleFiles(fileList: FileList | null) {
    const rule = this.config?.rule;
    const productId = this.currentProductId;
    if (!fileList || !rule || !productId) return;
    this.error = null;
    for (const file of Array.from(fileList)) {
      if (this.slotsLeft() <= 0) {
        this.error = `You can upload up to ${rule.maxFiles} file(s) for this item.`;
        break;
      }
      if (!isAcceptedFile(file.name, file.type || 'application/octet-stream', rule.acceptedTypes)) {
        this.error = `"${file.name}" isn’t an accepted file type.`;
        continue;
      }
      if (file.size > rule.maxFileSizeBytes) {
        this.error = `"${file.name}" is larger than ${formatBytes(rule.maxFileSizeBytes)}.`;
        continue;
      }
      this.upload(file, productId);
    }
    this.render();
  }

  private upload(file: File, productId: string, successMessage = 'File uploaded') {
    const live: LiveUpload = {
      key: `${file.name}-${file.size}-${Date.now()}`,
      fileName: file.name,
      sizeBytes: file.size,
      progress: 0,
      phase: 'reserving',
      error: null,
      cancel: () => undefined,
    };
    const handle = startUpload(
      file,
      { productId, variantId: this.currentVariantId, source: 'PRODUCT_PAGE' },
      {
        onReserved: () => this.render(),
        onProgress: (fraction) => {
          live.progress = fraction;
          this.render();
        },
        onPhase: (phase) => {
          live.phase = phase;
          this.render();
        },
      },
    );
    live.cancel = () => {
      void handle.cancel();
      this.live = this.live.filter((l) => l !== live);
      this.render();
    };
    this.live.push(live);
    handle.done
      .then((record) => {
        this.live = this.live.filter((l) => l !== live);
        this.saved = [...this.saved.filter((u) => u.id !== record.id), record];
        toast.success(successMessage);
        this.render();
      })
      .catch((error: unknown) => {
        if (!this.live.includes(live)) return;
        live.phase = 'error';
        live.error = errorMessage(error);
        toast.error(live.error);
        this.render();
      });
  }

  private async removeFile(upload: UploadRecord) {
    try {
      await removeUpload(upload.id);
      this.saved = this.saved.filter((u) => u.id !== upload.id);
      toast.success('File removed');
    } catch (error) {
      this.error = errorMessage(error);
      toast.error(this.error);
    }
    this.render();
  }

  private async replaceFile(upload: UploadRecord, file: File) {
    const rule = this.config?.rule;
    const productId = this.currentProductId;
    if (!rule || !productId) return;

    this.error = null;
    if (!isAcceptedFile(file.name, file.type || 'application/octet-stream', rule.acceptedTypes)) {
      this.error = `"${file.name}" isn’t an accepted file type.`;
      toast.error(this.error);
      this.render();
      return;
    }
    if (file.size > rule.maxFileSizeBytes) {
      this.error = `"${file.name}" is larger than ${formatBytes(rule.maxFileSizeBytes)}.`;
      toast.error(this.error);
      this.render();
      return;
    }

    try {
      await removeUpload(upload.id);
      this.saved = this.saved.filter((item) => item.id !== upload.id);
      this.upload(file, productId, 'File updated');
    } catch (error) {
      this.error = errorMessage(error);
      toast.error(this.error);
    }
    this.render();
  }

  private ensureToaster(): HTMLDivElement {
    if (this.toasterHost) return this.toasterHost;
    const host = document.createElement('div');
    this.toasterRoot = createRoot(host);
    this.toasterRoot.render(createElement(Toaster, { position: 'bottom-right', richColors: true, closeButton: true }));
    this.toasterHost = host;
    return host;
  }

  private actionIcon(Icon: LucideIcon): HTMLElement {
    const host = document.createElement('span');
    host.className = 'pfu-action-icon';
    const root = createRoot(host);
    flushSync(() => root.render(createElement(Icon, { size: 16, strokeWidth: 2, 'aria-hidden': true })));
    this.iconRoots.push(root);
    return host;
  }

  private clearActionIcons(): void {
    for (const root of this.iconRoots) root.unmount();
    this.iconRoots = [];
  }

  private savedFileActions(upload: UploadRecord): HTMLElement {
    const replacementInput = h('input', {
      type: 'file',
      class: 'pfu-file-input',
      accept: acceptAttribute(this.config?.rule?.acceptedTypes ?? []),
      'aria-label': `Choose a replacement for ${upload.fileName}`,
    }) as HTMLInputElement;
    replacementInput.addEventListener('change', () => {
      const [file] = Array.from(replacementInput.files ?? []);
      replacementInput.value = '';
      if (file) void this.replaceFile(upload, file);
    });
    return h(
      'span',
      { class: 'pfu-actions' },
      replacementInput,
      h('button', { type: 'button', class: 'pfu-icon-button', 'aria-label': `Update ${upload.fileName}`, title: 'Update file', onclick: () => replacementInput.click() }, this.actionIcon(RefreshCw)),
      h('button', { type: 'button', class: 'pfu-icon-button', 'aria-label': `Remove ${upload.fileName}`, title: 'Remove file', onclick: () => void this.removeFile(upload) }, this.actionIcon(Trash2)),
    );
  }

  private render() {
    this.clearActionIcons();
    applyDesign(this, readDesign(this));
    const wixDesignNodes = this.wixDesignNodes();
    const style = h('style', {}, BASE_STYLES);
    const toasterHost = this.ensureToaster();
    const config = this.config;
    const renderState = config?.enabled && config.rule
      ? 'visible'
      : this.error
        ? 'error-visible'
        : this.isEditor
          ? 'editor-placeholder'
          : this.currentProductId
            ? 'hidden-disabled-or-missing-rule'
            : 'hidden-missing-product-id';
    if (renderState !== this.lastRenderState) {
      this.lastRenderState = renderState;
      log('render state changed', {
        state: renderState,
        productId: this.currentProductId,
        enabled: config?.enabled ?? false,
        hasRule: config?.rule != null,
        isEditor: this.isEditor,
      });
    }
    if (!config?.enabled || !config.rule) {
      const placeholder = this.isEditor
        ? h('div', { class: 'pfu' }, h('p', { class: 'pfu-help' }, 'Product File Upload: turn on uploads for this product in the app dashboard to show the uploader here.'))
        : this.error
          ? h('p', { class: 'pfu-error' }, this.error)
          : null;
      this.root.replaceChildren(...wixDesignNodes, style, ...(placeholder ? [placeholder] : []), toasterHost);
      return;
    }
    const rule = config.rule;
    const inputId = 'pfu-input';
    const input = h('input', {
      id: inputId,
      type: 'file',
      accept: acceptAttribute(rule.acceptedTypes),
      multiple: rule.maxFiles > 1,
      disabled: this.isEditor || this.slotsLeft() === 0,
    }) as HTMLInputElement;
    input.addEventListener('change', () => {
      this.handleFiles(input.files);
      input.value = '';
    });
    const drop = h(
      'label',
      { class: 'pfu-drop', for: inputId },
      input,
      h('strong', {}, this.slotsLeft() === 0 ? 'File limit reached' : 'Choose files or drag them here'),
      h('span', { class: 'pfu-meta' }, ruleSummary(rule)),
    );
    drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('is-over');
      if (!this.isEditor) this.handleFiles(event.dataTransfer?.files ?? null);
    });

    const items = [
      ...this.saved.map((u) =>
        savedFileItem(u, this.savedFileActions(u)),
      ),
      ...this.live.map(liveFileItem),
    ];
    this.root.replaceChildren(
      ...wixDesignNodes,
      style,
      h(
        'section',
        { class: 'pfu', 'aria-label': config.text.productPageTitle },
        h('h3', { class: 'pfu-title' }, config.text.productPageTitle, rule.requirement === 'REQUIRED' ? h('span', { class: 'pfu-badge' }, 'Required') : null),
        config.text.productPageHelp ? h('p', { class: 'pfu-help' }, config.text.productPageHelp) : null,
        rule.instructions ? h('p', { class: 'pfu-help' }, rule.instructions) : null,
        drop,
        this.error ? h('p', { class: 'pfu-error', role: 'alert' }, this.error) : null,
        items.length > 0 ? h('ul', { class: 'pfu-list' }, ...items) : null,
      ),
      toasterHost,
    );
  }
}

export default ProductFileUpload;
