// Mirrors the AppError subclass -> code taxonomy in apps/api/src/shared/errors.ts; keep in sync if a subclass is added there.
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiSuccessResponse<T> {
  readonly data: T;
}

export interface ApiErrorBody {
  readonly code: ApiErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export interface ApiErrorResponse {
  readonly error: ApiErrorBody;
}
