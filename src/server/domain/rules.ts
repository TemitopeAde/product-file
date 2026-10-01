import type { ProductRule, ProductRuleInput, StorefrontRule } from '../../shared/types';
import { formatBytes, MAX_FILE_SIZE_CAP_BYTES, MAX_FILES_CAP, MAX_INSTRUCTIONS_LENGTH } from '../../shared/file-rules';
import { ApiError } from '../errors';
import { parseAcceptedTypes } from './settings';

export function parseRuleInput(body: Record<string, unknown>): ProductRuleInput {
  const { productName, enabled, requirement, maxFileSizeBytes, maxFiles, instructions } = body;
  if (typeof productName !== 'string' || productName.length > 200) {
    throw new ApiError('INVALID_REQUEST', '"productName" is required.');
  }
  if (typeof enabled !== 'boolean') throw new ApiError('INVALID_REQUEST', '"enabled" must be true or false.');
  if (requirement !== 'OPTIONAL' && requirement !== 'REQUIRED') {
    throw new ApiError('INVALID_REQUEST', '"requirement" must be OPTIONAL or REQUIRED.');
  }
  if (typeof maxFileSizeBytes !== 'number' || !Number.isInteger(maxFileSizeBytes) || maxFileSizeBytes < 1 || maxFileSizeBytes > MAX_FILE_SIZE_CAP_BYTES) {
    throw new ApiError('INVALID_REQUEST', `Maximum file size must be between 1 byte and ${formatBytes(MAX_FILE_SIZE_CAP_BYTES)}.`);
  }
  if (typeof maxFiles !== 'number' || !Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > MAX_FILES_CAP) {
    throw new ApiError('INVALID_REQUEST', `Maximum file count must be between 1 and ${MAX_FILES_CAP}.`);
  }
  const text = typeof instructions === 'string' ? instructions.trim() : '';
  if (text.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new ApiError('INVALID_REQUEST', `Instructions must be at most ${MAX_INSTRUCTIONS_LENGTH} characters.`);
  }
  return {
    productName: productName.trim(),
    enabled,
    requirement,
    acceptedTypes: parseAcceptedTypes(body['acceptedTypes']),
    maxFileSizeBytes,
    maxFiles,
    instructions: text,
  };
}

/**
 * Required uploads block checkout, so they are only allowed once this site has proven the
 * binding + validation + order-linking flow end to end. Keeping an existing REQUIRED rule
 * unchanged is always allowed.
 */
export function assertRequirementAllowed(input: ProductRuleInput, existing: ProductRule | null, checkoutVerifiedAt: string | null): void {
  const turningOnRequired = input.enabled && input.requirement === 'REQUIRED' && !(existing?.enabled && existing.requirement === 'REQUIRED');
  if (turningOnRequired && checkoutVerifiedAt === null) {
    throw new ApiError(
      'CHECKOUT_NOT_VERIFIED',
      'Required uploads can be turned on after a test order on this site proves the checkout flow. See Settings → Checkout verification.',
    );
  }
}

export function toStorefrontRule(rule: ProductRule): StorefrontRule {
  return {
    requirement: rule.requirement,
    acceptedTypes: rule.acceptedTypes,
    maxFileSizeBytes: rule.maxFileSizeBytes,
    maxFiles: rule.maxFiles,
    instructions: rule.instructions,
  };
}
