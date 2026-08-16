import { ApiError } from './types';
import type { ApiErrorEnvelope } from '../../types/api';

/**
 * Normalizes any error or response into a structured ApiError.
 * Preserves status, code, message, and requestId without losing context.
 * Source: docs/ERROR_CONTRACT.md
 */
export function normalizeApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  // Handle AbortError / Timeout
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError({
      message: 'Request timed out. Please check your connection.',
      status: 408,
      code: 'TIMEOUT'
    });
  }

  // Handle standard HTTP JSON error response envelope
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, any>;
    const status = typeof obj.status === 'number' ? obj.status : fallbackStatus;
    const requestId = obj.requestId || obj.error?.requestId;
    const code = obj.error?.code || obj.code || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'API_ERROR');
    const message = obj.error?.message || obj.message || `HTTP ${status} error`;
    const validationErrors = obj.errors || obj.error?.errors;

    return new ApiError({
      message,
      status,
      code,
      requestId,
      validationErrors,
      data: obj
    });
  }

  // Handle standard JavaScript Error
  if (error instanceof Error) {
    return new ApiError({
      message: error.message || 'An unexpected error occurred',
      status: fallbackStatus,
      code: 'CLIENT_ERROR'
    });
  }

  return new ApiError({
    message: typeof error === 'string' ? error : 'An unknown error occurred',
    status: fallbackStatus,
    code: 'UNKNOWN_ERROR'
  });
}
