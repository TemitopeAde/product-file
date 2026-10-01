import { auth } from '@wix/essentials';
import { catalogVersioning, products, productsV3 } from '@wix/stores';
import type { CatalogVersion } from '../../shared/types';
import { ApiError } from '../errors';

export interface CatalogProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  visible: boolean;
}

export interface CatalogPage {
  catalogVersion: CatalogVersion;
  products: CatalogProduct[];
  nextCursor: string | null;
}

const versionCache = new Map<string, CatalogVersion>();

export async function getCatalogVersion(instanceId: string): Promise<CatalogVersion> {
  const cached = versionCache.get(instanceId);
  if (cached) return cached;
  try {
    const { catalogVersion } = await auth.elevate(catalogVersioning.getCatalogVersion)();
    const version: CatalogVersion =
      catalogVersion === 'V1_CATALOG' || catalogVersion === 'V3_CATALOG' ? catalogVersion : 'STORES_NOT_INSTALLED';
    // The version is permanent once Stores is installed; "not installed" may change.
    if (version !== 'STORES_NOT_INSTALLED') versionCache.set(instanceId, version);
    return version;
  } catch (error) {
    console.error('getCatalogVersion failed', error);
    throw new ApiError('SERVICE_UNAVAILABLE', 'Could not read the Wix Stores catalog.');
  }
}

function v1Image(product: products.Product): string | null {
  return product.media?.mainMedia?.image?.url ?? null;
}

function v3Image(product: productsV3.V3Product): string | null {
  const main = product.media?.main;
  return main?.image ?? main?.url ?? null;
}

async function listV1(limit: number, cursor: string | null, search: string | null): Promise<CatalogPage> {
  const skip = cursor ? Number.parseInt(cursor, 10) : 0;
  const offset = Number.isFinite(skip) && skip >= 0 ? skip : 0;
  let builder = auth.elevate(products.queryProducts)().limit(limit).skip(offset).ascending('name');
  if (search) builder = builder.startsWith('name', search);
  const res = await builder.find();
  return {
    catalogVersion: 'V1_CATALOG',
    products: res.items.map((p) => ({ id: p._id ?? '', name: p.name ?? 'Untitled product', imageUrl: v1Image(p), visible: p.visible !== false })).filter((p) => p.id),
    nextCursor: res.hasNext() ? String(offset + res.items.length) : null,
  };
}

async function listV3(limit: number, cursor: string | null, search: string | null): Promise<CatalogPage> {
  if (search) {
    const res = await auth.elevate(productsV3.searchProducts)(
      { cursorPaging: { limit, ...(cursor ? { cursor } : {}) }, search: { expression: search, fields: ['name'], fuzzy: true } },
      { fields: [] },
    );
    return {
      catalogVersion: 'V3_CATALOG',
      products: (res.products ?? []).map(mapV3).filter((p) => p.id),
      nextCursor: res.pagingMetadata?.hasNext ? res.pagingMetadata.cursors?.next ?? null : null,
    };
  }
  let builder = auth.elevate(productsV3.queryProducts)().limit(limit);
  if (cursor) builder = builder.skipTo(cursor);
  const res = await builder.find();
  return {
    catalogVersion: 'V3_CATALOG',
    products: res.items.map(mapV3).filter((p) => p.id),
    nextCursor: res.hasNext() ? res.cursors.next ?? null : null,
  };
}

function mapV3(p: productsV3.V3Product): CatalogProduct {
  return { id: p._id ?? '', name: p.name ?? 'Untitled product', imageUrl: v3Image(p), visible: p.visible !== false };
}

export async function listCatalogProducts(instanceId: string, limit: number, cursor: string | null, search: string | null): Promise<CatalogPage> {
  const version = await getCatalogVersion(instanceId);
  try {
    if (version === 'V3_CATALOG') return await listV3(limit, cursor, search);
    if (version === 'V1_CATALOG') return await listV1(limit, cursor, search);
    return { catalogVersion: version, products: [], nextCursor: null };
  } catch (error) {
    console.error('Catalog query failed', { version, error });
    throw new ApiError('SERVICE_UNAVAILABLE', 'Could not load products from Wix Stores.');
  }
}
