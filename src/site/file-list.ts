import { formatBytes } from '../shared/file-rules';
import type { StorefrontRule, UploadRecord } from '../shared/types';
import { h } from './dom';

export interface LiveUpload {
  key: string;
  fileName: string;
  sizeBytes: number;
  progress: number;
  phase: 'reserving' | 'uploading' | 'waiting-for-network' | 'processing' | 'error';
  error: string | null;
  cancel: () => void;
}

const STATUS_TEXT: Record<UploadRecord['status'], string> = {
  RESERVED: 'Waiting to upload',
  UPLOADING: 'Uploading',
  PROCESSING: 'Processing',
  READY: 'Uploaded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  DELETED: 'Removed',
};

const PHASE_TEXT: Record<LiveUpload['phase'], string> = {
  reserving: 'Preparing…',
  uploading: 'Uploading',
  'waiting-for-network': 'Offline — will resume automatically',
  processing: 'Processing…',
  error: 'Failed',
};

export function ruleSummary(rule: StorefrontRule): string {
  const types = rule.acceptedTypes.map((t) => (t.endsWith('/*') ? `${t.slice(0, -2)} files` : t.startsWith('.') ? t.slice(1).toUpperCase() : t.split('/')[1]?.toUpperCase() ?? t));
  return `${types.join(', ')} · up to ${formatBytes(rule.maxFileSizeBytes)} each · up to ${rule.maxFiles} file${rule.maxFiles === 1 ? '' : 's'}`;
}

export function savedFileItem(upload: UploadRecord, actions: HTMLElement | null): HTMLElement {
  const failed = upload.status === 'FAILED';
  return h(
    'li',
    { class: 'pfu-file' },
    h('span', { class: 'pfu-name', title: upload.fileName }, upload.fileName),
    actions ?? h('span'),
    h('span', { class: `pfu-status${failed ? ' is-error' : ''}` }, `${STATUS_TEXT[upload.status]} · ${formatBytes(upload.sizeBytes)}`),
  );
}

export function liveFileItem(live: LiveUpload): HTMLElement {
  const percent = Math.round(live.progress * 100);
  const status = live.phase === 'uploading' ? `${PHASE_TEXT.uploading} ${percent}%` : live.error ?? PHASE_TEXT[live.phase];
  return h(
    'li',
    { class: 'pfu-file', 'aria-busy': live.phase !== 'error' ? 'true' : 'false' },
    h('span', { class: 'pfu-name', title: live.fileName }, live.fileName),
    live.phase === 'error'
      ? h('span')
      : h('button', { type: 'button', class: 'pfu-link', onclick: () => live.cancel() }, 'Cancel'),
    h('span', { class: `pfu-status${live.phase === 'error' ? ' is-error' : ''}`, role: 'status' }, `${status} · ${formatBytes(live.sizeBytes)}`),
    live.phase === 'uploading' || live.phase === 'processing'
      ? h('div', { class: 'pfu-bar', role: 'progressbar', 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { style: `width:${percent}%` }))
      : null,
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    const details = (error as { details?: Record<string, unknown> }).details;
    if ((error as { code?: string }).code === 'MONTHLY_UPLOAD_LIMIT_REACHED' && details) {
      return 'This store can’t accept more files this month. Please contact the store.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
