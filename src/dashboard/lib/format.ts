import type { AccessTier, UploadStatus } from '../../shared/types';

export const TIER_LABEL: Record<AccessTier, string> = {
  BASIC: 'Basic',
  PRO_TRIAL: 'Pro trial',
  PRO: 'Pro',
  INTERNAL_WIX: 'Wix internal',
};

export const STATUS_LABEL: Record<UploadStatus, string> = {
  RESERVED: 'Reserved',
  UPLOADING: 'Uploading',
  PROCESSING: 'Processing',
  READY: 'Ready',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DELETED: 'Deleted',
};

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormat.format(date);
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
