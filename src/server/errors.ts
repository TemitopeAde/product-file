import type { ApiErrorCode } from '../shared/types';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_REQUEST: 400,
  CONFLICT: 409,
  MONTHLY_UPLOAD_LIMIT_REACHED: 429,
  TOO_MANY_ACTIVE_UPLOADS: 429,
  VISITOR_DAILY_LIMIT_REACHED: 429,
  UPLOADS_NOT_ENABLED: 403,
  FILE_TYPE_NOT_ACCEPTED: 422,
  FILE_TOO_LARGE: 422,
  MAX_FILES_REACHED: 409,
  RESERVATION_EXPIRED: 410,
  CHECKOUT_NOT_VERIFIED: 409,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, number | string | null> | undefined;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, number | string | null>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}
