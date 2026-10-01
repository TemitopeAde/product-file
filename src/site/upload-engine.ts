// Browser side of Wix's resumable (TUS) upload flow. One reservation is kept for the life of
// a file: network retries, offline pauses, page reloads, and expired Wix sessions all reuse it,
// so they never consume another monthly slot.
import * as tus from 'tus-js-client';
import { resolveMimeType } from '../shared/file-rules';
import type { ReserveUploadRequest, UploadRecord, UploadSession } from '../shared/types';
import { api, ClientApiError } from './api';

export interface UploadCallbacks {
  onReserved(upload: UploadRecord): void;
  onProgress(fraction: number): void;
  onPhase(phase: 'uploading' | 'waiting-for-network' | 'processing'): void;
}

export interface UploadHandle {
  done: Promise<UploadRecord>;
  cancel(): Promise<void>;
}

const RETRY_DELAYS = [0, 1000, 3000, 5000, 10000, 20000];
const PROCESSING_POLL_MS = 2500;
const PROCESSING_POLL_LIMIT = 48;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resumeKey(file: File, req: Omit<ReserveUploadRequest, 'fileName' | 'mimeType' | 'sizeBytes'>): string {
  return ['pfu', req.productId, req.lineItemId ?? '', file.name, file.size, file.lastModified].join(':');
}

function remember(key: string, uploadId: string | null): void {
  try {
    if (uploadId) storage()?.setItem(key, uploadId);
    else storage()?.removeItem(key);
  } catch {
    // Storage is optional; without it, resuming after a reload is not available.
  }
}

function recall(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function waitForOnline(): Promise<void> {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('online', () => resolve(), { once: true }));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpStatus(error: unknown): number | null {
  return error instanceof tus.DetailedError && error.originalResponse ? error.originalResponse.getStatus() : null;
}

/** Canonical MIME type for known Wix formats; browsers often report none for them. */
function mimeTypeOf(file: File): string {
  return resolveMimeType(file.name, file.type);
}

async function openSession(key: string, file: File, req: Omit<ReserveUploadRequest, 'fileName' | 'mimeType' | 'sizeBytes'>): Promise<UploadSession | UploadRecord> {
  const previous = recall(key);
  if (previous) {
    try {
      const resumed = await api<UploadSession | { upload: UploadRecord }>(`/api/storefront/uploads/${previous}/resume`, { method: 'POST' });
      if ('uploadUrl' in resumed) return resumed;
      if (resumed.upload.status === 'READY' || resumed.upload.status === 'PROCESSING') return resumed.upload;
    } catch (error) {
      if (!(error instanceof ClientApiError) || error.code === 'NETWORK') throw error;
    }
    remember(key, null);
  }
  const session = await api<UploadSession>('/api/storefront/uploads', {
    method: 'POST',
    body: { ...req, fileName: file.name, mimeType: mimeTypeOf(file), sizeBytes: file.size },
  });
  remember(key, session.upload.id);
  return session;
}

function runTus(file: File, session: UploadSession, callbacks: UploadCallbacks, registerAbort: (abort: () => void) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: session.uploadUrl,
      retryDelays: RETRY_DELAYS,
      metadata: { filename: file.name, contentType: mimeTypeOf(file), token: session.uploadToken },
      fingerprint: async () => `pfu-tus:${session.upload.id}:${session.uploadUrl}`,
      storeFingerprintForResuming: true,
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => callbacks.onProgress(total > 0 ? sent / total : 0),
      onSuccess: () => resolve(),
      onError: (error) => reject(error),
    });
    registerAbort(() => void upload.abort(false));
    void upload.findPreviousUploads().then((previous) => {
      const last = previous[0];
      if (last) upload.resumeFromPreviousUpload(last);
      upload.start();
    });
  });
}

async function finalizeWithWix(session: UploadSession, file: File): Promise<string> {
  const url = `${session.uploadUrl}/${encodeURIComponent(session.uploadToken)}?filename=${encodeURIComponent(file.name)}`;
  for (let attempt = 0; ; attempt += 1) {
    await waitForOnline();
    try {
      const response = await fetch(url, { method: 'PUT' });
      if (!response.ok) throw new Error(`Wix finalize failed with ${response.status}`);
      const body = (await response.json()) as { file?: { id?: string; _id?: string } };
      const fileId = body.file?.id ?? body.file?._id;
      if (!fileId) throw new Error('Wix finalize returned no file ID');
      return fileId;
    } catch (error) {
      if (attempt >= 4) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

async function completeAndWait(uploadId: string, fileId: string, callbacks: UploadCallbacks): Promise<UploadRecord> {
  let record = await api<UploadRecord>(`/api/storefront/uploads/${uploadId}/complete`, { method: 'POST', body: { fileId } });
  for (let poll = 0; record.status === 'PROCESSING' && poll < PROCESSING_POLL_LIMIT; poll += 1) {
    callbacks.onPhase('processing');
    await sleep(PROCESSING_POLL_MS);
    await waitForOnline();
    record = await api<UploadRecord>(`/api/storefront/uploads/${uploadId}/complete`, { method: 'POST', body: { fileId } });
  }
  return record;
}

export function startUpload(
  file: File,
  req: Omit<ReserveUploadRequest, 'fileName' | 'mimeType' | 'sizeBytes'>,
  callbacks: UploadCallbacks,
): UploadHandle {
  const key = resumeKey(file, req);
  let cancelled = false;
  let abortTus: () => void = () => undefined;
  let uploadId: string | null = null;

  const done = (async (): Promise<UploadRecord> => {
    const opened = await openSession(key, file, req);
    if (!('uploadUrl' in opened)) {
      callbacks.onReserved(opened);
      remember(key, null);
      return opened;
    }
    let session = opened;
    let networkFailures = 0;
    uploadId = session.upload.id;
    callbacks.onReserved(session.upload);

    for (;;) {
      if (cancelled) throw new ClientApiError('CONFLICT', 'Upload cancelled.', 0);
      callbacks.onPhase('uploading');
      try {
        await runTus(file, session, callbacks, (abort) => {
          abortTus = abort;
        });
        break;
      } catch (error) {
        if (cancelled) throw new ClientApiError('CONFLICT', 'Upload cancelled.', 0);
        const status = httpStatus(error);
        if (!navigator.onLine || status === null) {
          // Keep the reservation: choosing the same file again resumes where it stopped.
          if (navigator.onLine && ++networkFailures > 5) {
            throw new ClientApiError('NETWORK', 'The upload keeps getting interrupted. Choose the file again to resume.', 0);
          }
          callbacks.onPhase('waiting-for-network');
          await waitForOnline();
          await sleep(1000);
          continue;
        }
        if (status === 401 || status === 403 || status === 404 || status === 410) {
          session = await api<UploadSession>(`/api/storefront/uploads/${session.upload.id}/renew`, { method: 'POST' });
          continue;
        }
        await api(`/api/storefront/uploads/${session.upload.id}/fail`, { method: 'POST', body: { reason: `TUS_HTTP_${status}` } }).catch(() => undefined);
        remember(key, null);
        throw new ClientApiError('INTERNAL', 'Wix could not accept this file. Please try another file.', status);
      }
    }

    const fileId = await finalizeWithWix(session, file);
    const record = await completeAndWait(session.upload.id, fileId, callbacks);
    if (record.status !== 'PROCESSING') remember(key, null);
    return record;
  })();

  return {
    done,
    async cancel() {
      cancelled = true;
      abortTus();
      remember(key, null);
      if (uploadId) await api(`/api/storefront/uploads/${uploadId}/cancel`, { method: 'POST' }).catch(() => undefined);
    },
  };
}

export async function removeUpload(uploadId: string): Promise<void> {
  await api(`/api/storefront/uploads/${uploadId}/cancel`, { method: 'POST' });
}
