export interface ErrorDetails {
  readonly [key: string]: unknown;
}

export class AppError extends Error {
  public readonly code: string;

  public readonly details?: ErrorDetails;

  public readonly statusCode: number;

  public constructor(statusCode: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class ValidationError extends AppError {
  public constructor(message: string, details?: ErrorDetails) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  public constructor(message: string, details?: ErrorDetails) {
    super(404, 'NOT_FOUND', message, details);
  }
}

export class ConflictError extends AppError {
  public constructor(message: string, details?: ErrorDetails) {
    super(409, 'CONFLICT', message, details);
  }
}

export class PayloadTooLargeError extends AppError {
  public constructor(message = 'Request payload exceeded the configured size limit.', details?: ErrorDetails) {
    super(413, 'PAYLOAD_TOO_LARGE', message, details);
  }
}

export class RateLimitError extends AppError {
  public constructor(message = 'Too many requests. Please try again later.', details?: ErrorDetails) {
    super(429, 'RATE_LIMIT_EXCEEDED', message, details);
  }
}

export class InternalServerError extends AppError {
  public constructor(message = 'An unexpected error occurred.') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
