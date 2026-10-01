import type { ProductRule, ProductRuleInput, Requirement } from '../../shared/types';
import { countItems, filter, findAll, getItem, iso, num, query, removeItem, saveItem, str, strArray, type DataItem } from './client';

function toRule(item: DataItem): ProductRule {
  const requirement: Requirement = str(item['requirement']) === 'REQUIRED' ? 'REQUIRED' : 'OPTIONAL';
  return {
    productId: item._id,
    productName: str(item['productName']),
    enabled: item['enabled'] === true,
    requirement,
    acceptedTypes: strArray(item['acceptedTypes']),
    maxFileSizeBytes: num(item['maxFileSizeBytes']),
    maxFiles: num(item['maxFiles']),
    instructions: str(item['instructions']),
    updatedAt: iso(item._updatedDate),
  };
}

export async function getRule(productId: string): Promise<ProductRule | null> {
  const item = await getItem('product-rules', productId);
  return item ? toRule(item) : null;
}

export async function getRules(productIds: readonly string[]): Promise<Map<string, ProductRule>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();
  const found = await findAll('product-rules', query('product-rules').hasSome('_id', ids));
  return new Map(found.map((item) => [item._id, toRule(item)]));
}

export async function listEnabledRules(): Promise<ProductRule[]> {
  const found = await findAll('product-rules', query('product-rules').eq('enabled', true).ascending('productName'));
  return found.map(toRule);
}

export async function upsertRule(productId: string, input: ProductRuleInput): Promise<ProductRule> {
  await saveItem('product-rules', { _id: productId, ...input });
  const saved = await getItem('product-rules', productId, true);
  return saved ? toRule(saved) : { ...input, productId, updatedAt: new Date().toISOString() };
}

/** Saves a catalog page of rules with bounded concurrency. */
export async function saveRules(rules: readonly { productId: string; input: ProductRuleInput }[]): Promise<void> {
  const concurrency = 10;
  for (let index = 0; index < rules.length; index += concurrency) {
    await Promise.all(
      rules.slice(index, index + concurrency).map(({ productId, input }) => saveItem('product-rules', { _id: productId, ...input })),
    );
  }
}

export async function deleteRule(productId: string): Promise<void> {
  await removeItem('product-rules', productId);
}

export async function countRules(): Promise<{ enabled: number; required: number }> {
  const [enabled, required] = await Promise.all([
    countItems('product-rules', query('product-rules').eq('enabled', true)),
    countItems('product-rules', query('product-rules').eq('enabled', true).and(filter().eq('requirement', 'REQUIRED'))),
  ]);
  return { enabled, required };
}
