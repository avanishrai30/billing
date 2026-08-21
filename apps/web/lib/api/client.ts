import { sessionManager } from '../auth/session';
import { normalizeApiError } from '../errors/normalize';
import { ApiError } from '../errors/types';
import type { RequestOptions } from '../../types/api';

/**
 * Resolves the backend API base URL with strict environment support.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
    if (isLocalDev) {
      return 'http://localhost:8181';
    }
  }

  return 'https://api.vcorganics.com';
}

/**
 * Global session invalidation handler for 401 responses.
 */
let onSessionExpiredCallback: (() => void) | null = null;

export function registerSessionExpiredCallback(cb: () => void): void {
  onSessionExpiredCallback = cb;
}

/**
 * Central Typed HTTP Transport Client
 */
export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = sessionManager.getToken();

  const url = new URL(
    endpoint.startsWith('http://') || endpoint.startsWith('https://') ? endpoint : `${baseUrl}${endpoint}`
  );

  // Append query parameters if provided
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Request-ID': `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    ...(options.headers as Record<string, string> || {})
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeout || 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      ...options,
      headers,
      signal: options.signal || controller.signal
    });

    clearTimeout(timeoutId);

    const isLoginEndpoint = endpoint.includes('/auth/login');

    // Handle 401 Unauthorized for active sessions. Unauthenticated background
    // requests must not be allowed to synthesize a session-expired transition.
    if (res.status === 401 && token && !options.skipAuth && !isLoginEndpoint) {
      sessionManager.clearSession();
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
    }

    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      const text = await res.text().catch(() => '');
      data = { message: text };
    }

    if (!res.ok) {
      throw normalizeApiError({
        status: res.status,
        requestId: headers['X-Request-ID'],
        error: data?.error || {
          code: res.status === 401 ? 'UNAUTHORIZED' : res.status === 403 ? 'FORBIDDEN' : res.status === 404 ? 'NOT_FOUND' : 'API_ERROR',
          message: data?.message || data?.error?.message || `HTTP error ${res.status}`
        },
        errors: data?.errors,
        ...data
      }, res.status);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw normalizeApiError(err);
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),

  request
};
