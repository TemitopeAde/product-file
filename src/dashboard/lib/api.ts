// Dashboard calls to the app backend. `fetchWithAuth` sends the Wix user's token; the backend
// derives the site and caller from it and never trusts IDs sent by the browser.
import { httpClient } from '@wix/essentials';
import type { ApiErrorBody, ApiErrorCode } from '../../shared/types';

export class DashboardApiError extends Error {
  readonly code: ApiErrorCode | 'NETWORK';
  readonly details: Record<string, number | string | null>;

  constructor(code: ApiErrorCode | 'NETWORK', message: string, details: Record<string, number | string | null> = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
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
    console.error('Dashboard request failed', path, error);
    throw new DashboardApiError('NETWORK', 'Could not reach the app. Check your connection and try again.');
  }
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    if (error && typeof error.code === 'string') throw new DashboardApiError(error.code, error.message, error.details ?? {});
    throw new DashboardApiError('INTERNAL', 'Something went wrong. Please try again.');
  }
  return body as T;
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
