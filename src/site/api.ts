// Authenticated calls from site plugins to the app backend. `fetchWithAuth` attaches the
// visitor's or member's Wix token; the backend derives the site and caller from it.
import { httpClient } from '@wix/essentials';
import type { ApiErrorBody, ApiErrorCode } from '../shared/types';

export class ClientApiError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';
  readonly status: number;
  readonly details: Record<string, number | string | null>;

  constructor(code: ApiErrorCode | 'NETWORK', message: string, status: number, details: Record<string, number | string | null> = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value && typeof (value as ApiErrorBody).error?.code === 'string';
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const url = new URL(path, import.meta.url).href;
  let response: Response;
  try {
    response = await httpClient.fetchWithAuth(url, {
      method: init.method ?? 'GET',
      ...(init.body !== undefined ? { body: JSON.stringify(init.body), headers: { 'Content-Type': 'application/json' } } : {}),
    });
  } catch (error) {
    console.error('Request failed', path, error);
    throw new ClientApiError('NETWORK', 'You appear to be offline. Check your connection and try again.', 0);
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorBody(body)) throw new ClientApiError(body.error.code, body.error.message, response.status, body.error.details ?? {});
    throw new ClientApiError('INTERNAL', 'Something went wrong. Please try again.', response.status);
  }
  return body as T;
}
