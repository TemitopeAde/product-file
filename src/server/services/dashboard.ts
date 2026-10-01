import type {
  AnalyticsResponse,
  EnableAllProductsResult,
  OrderDetail,
  OrderFilesPage,
  OrdersPage,
  ProductRule,
  ProductsPage,
  SettingsResponse,
  UploadsPage,
  UploadStatus,
} from '../../shared/types';
import type { Caller } from '../auth';
import { getOrder, listOrders, orderCounts } from '../data/orders';
import { quotaUsage } from '../data/quota';
import { countRules, deleteRule, getRule, getRules, saveRules, upsertRule } from '../data/rules';
import { getAppState, saveSettings } from '../data/settings';
import * as uploads from '../data/uploads';
import { assertRequirementAllowed, parseRuleInput } from '../domain/rules';
import { parseSettingsInput } from '../domain/settings';
import { ApiError } from '../errors';
import { listCatalogProducts } from '../wix/catalog';
import { createDownloadUrl, trashFiles } from '../wix/media';
import { getAccessContext } from './access';
import { endUpload } from './upload-lifecycle';

const PAGE_SIZE = 25;
const UPLOAD_STATUSES: readonly UploadStatus[] = ['RESERVED', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED', 'CANCELLED', 'EXPIRED', 'DELETED'];

/** Offset paging for Wix Data queries, exposed as an opaque cursor. */
function offsetFromCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isInteger(offset) && offset >= 0 && offset <= 100_000 ? offset : 0;
}

export async function listProducts(caller: Caller, cursor: string | null, search: string | null): Promise<ProductsPage> {
  const page = await listCatalogProducts(caller.instanceId, PAGE_SIZE, cursor, search);
  const rules = await getRules(page.products.map((p) => p.id));
  return {
    catalogVersion: page.catalogVersion,
    nextCursor: page.nextCursor,
    products: page.products.map((p) => ({ ...p, rule: rules.get(p.id) ?? null })),
  };
}

export async function saveProductRule(productId: string, body: Record<string, unknown>): Promise<ProductRule> {
  const input = parseRuleInput(body);
  const [existing, app] = await Promise.all([getRule(productId), getAppState()]);
  assertRequirementAllowed(input, existing, app.checkoutVerifiedAt);
  return upsertRule(productId, input);
}

export async function removeProductRule(productId: string): Promise<void> {
  await deleteRule(productId);
}

export async function enableAllProducts(caller: Caller): Promise<EnableAllProductsResult> {
  const app = await getAppState();
  let cursor: string | null = null;
  let updated = 0;

  do {
    const page = await listCatalogProducts(caller.instanceId, 100, cursor, null);
    const existing = await getRules(page.products.map((product) => product.id));
    await saveRules(
      page.products.map((product) => {
        const rule = existing.get(product.id);
        return {
          productId: product.id,
          input: rule
            ? {
                productName: product.name,
                enabled: true,
                requirement: rule.requirement,
                acceptedTypes: rule.acceptedTypes,
                maxFileSizeBytes: rule.maxFileSizeBytes,
                maxFiles: rule.maxFiles,
                instructions: rule.instructions,
              }
            : { ...app.settings.defaults, productName: product.name, enabled: true, requirement: 'OPTIONAL', instructions: '' },
        };
      }),
    );
    updated += page.products.length;
    cursor = page.nextCursor;
  } while (cursor);

  return { updated };
}

export async function listUploadsPage(params: { status: string | null; productId: string | null; search: string | null; cursor: string | null }): Promise<UploadsPage> {
  const status = params.status && UPLOAD_STATUSES.includes(params.status as UploadStatus) ? (params.status as UploadStatus) : null;
  const offset = offsetFromCursor(params.cursor);
  const { rows, hasNext } = await uploads.listUploads({ status, productId: params.productId, search: params.search, offset, limit: PAGE_SIZE });
  return { uploads: rows.map(uploads.toPublicUpload), nextCursor: hasNext ? String(offset + rows.length) : null };
}

export async function getUploadDownloadUrl(id: string): Promise<{ url: string }> {
  const upload = await uploads.getUpload(id);
  if (!upload || upload.status !== 'READY' || !upload.wixFileId) throw new ApiError('NOT_FOUND', 'File not available.');
  return { url: await createDownloadUrl(upload.wixFileId, upload.fileName) };
}

export async function deleteUpload(id: string): Promise<void> {
  const upload = await uploads.getUpload(id, true);
  if (!upload) throw new ApiError('NOT_FOUND', 'File not found.');
  if (upload.status === 'READY') {
    if (upload.wixFileId) await trashFiles([upload.wixFileId]);
    await uploads.markDeleted(id);
  } else {
    await endUpload(upload, 'CANCELLED', 'CANCELLED_BY_MERCHANT');
  }
  if (upload.binding && !upload.binding.orderId) await uploads.unbind(id, upload.binding.cartId);
}

export async function listOrdersPage(cursor: string | null, search: string | null): Promise<OrdersPage> {
  const offset = offsetFromCursor(cursor);
  const { orders, hasNext } = await listOrders(offset, PAGE_SIZE, search);
  return { orders, nextCursor: hasNext ? String(offset + orders.length) : null };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const [order, files] = await Promise.all([getOrder(orderId), uploads.uploadsForOrder(orderId)]);
  return { order, files: files.map(uploads.toPublicUpload) };
}

export async function listOrderFilesPage(orderId: string, cursor: string | null, search: string | null): Promise<OrderFilesPage> {
  const offset = offsetFromCursor(cursor);
  const [order, result] = await Promise.all([
    getOrder(orderId),
    uploads.listUploadsForOrder({ orderId, search, offset, limit: PAGE_SIZE }),
  ]);
  return {
    order,
    files: result.rows.map(uploads.toPublicUpload),
    nextCursor: result.hasNext ? String(offset + result.rows.length) : null,
  };
}

export async function getAnalytics(caller: Caller): Promise<AnalyticsResponse> {
  const { period } = await getAccessContext(caller.instanceId);
  const [daily, ready, periodCount, orders, rules] = await Promise.all([
    uploads.dailyReadyCounts(30),
    uploads.countReady(),
    quotaUsage(period.start),
    orderCounts(),
    countRules(),
  ]);
  return {
    daily,
    totals: {
      readyFiles: ready,
      filesThisPeriod: periodCount,
      ordersWithFiles: orders.ordersWithFiles,
      unresolvedLinks: orders.unresolvedLinks,
      enabledProducts: rules.enabled,
      requiredProducts: rules.required,
    },
  };
}

export async function getSettings(): Promise<SettingsResponse> {
  const app = await getAppState();
  return {
    settings: app.settings,
    checkoutVerification: { verifiedAt: app.checkoutVerifiedAt, orderId: app.checkoutVerifiedOrderId },
  };
}

export async function updateSettings(body: Record<string, unknown>): Promise<SettingsResponse> {
  await saveSettings(parseSettingsInput(body));
  return getSettings();
}
