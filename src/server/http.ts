import type { APIContext } from 'astro';
import type { ApiErrorBody } from '../shared/types';
import { ApiError } from './errors';

type Handler = (context: APIContext) => Promise<Response>;

const NO_STORE = { 'Cache-Control': 'no-store' };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = {
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  };
  return json(body, error.status);
}

/** Wraps a handler so every failure becomes a typed JSON error and nothing leaks internals. */
export function handle(handler: Handler): Handler {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      console.error(`Unhandled error in ${context.request.method} ${new URL(context.request.url).pathname}`, error);
      return errorResponse(new ApiError('INTERNAL', 'Something went wrong. Please try again.'));
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError('INVALID_REQUEST', 'The request body must be valid JSON.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError('INVALID_REQUEST', 'The request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
}

export function requireString(body: Record<string, unknown>, key: string, maxLength = 200): string {
  const value = body[key];
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new ApiError('INVALID_REQUEST', `"${key}" is required.`);
  }
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, key: string, maxLength = 200): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApiError('INVALID_REQUEST', `"${key}" must be a string.`);
  }
  return value.trim();
}

export function requireParam(context: APIContext, key: string): string {
  const value = context.params[key];
  if (!value || value.length > 200) throw new ApiError('INVALID_REQUEST', `Missing "${key}".`);
  return value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) throw new ApiError('NOT_FOUND', `${label} not found.`);
  return value.toLowerCase();
}

export function searchParam(context: APIContext, key: string, maxLength = 200): string | null {
  const value = context.url.searchParams.get(key);
  if (value === null || value === '') return null;
  if (value.length > maxLength) throw new ApiError('INVALID_REQUEST', `"${key}" is too long.`);
  return value;
}
