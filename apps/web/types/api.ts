/**
 * Authoritative API Types & Envelopes
 * Source: docs/API_CONTRACTS_FREEZE.md & docs/ERROR_CONTRACT.md
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  requestId?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  requestId?: string;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}
