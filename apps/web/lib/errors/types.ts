/**
 * Authoritative Error Models & Types
 * Source: docs/ERROR_CONTRACT.md
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly validationErrors?: Array<{ path: (string | number)[]; message: string }>;
  public readonly data?: any;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    requestId?: string;
    validationErrors?: Array<{ path: (string | number)[]; message: string }>;
    data?: any;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
    this.validationErrors = params.validationErrors;
    this.data = params.data;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}
