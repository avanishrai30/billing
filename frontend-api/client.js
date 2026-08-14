// Central Frontend API Client Core (V3)

/**
 * Resolves the backend API base URL with strict environment distinction:
 * - Production (Vercel, *.vercel.app, *.vcorganics.com, custom domains):
 *   Always fixed to 'https://api.vcorganics.com'.
 *   Stale localStorage values CANNOT override production unless explicit debug mode is enabled.
 * - Development (localhost, 127.0.0.1, file://):
 *   Allows local dev overrides or defaults to 'http://localhost:8181' (or window.location.origin if on port 8181).
 * - Debug Mode: Enabled via localStorage.getItem("aiavro_debug_mode") === "true" or query ?debug_api=true.
 */
function resolveBackendUrl() {
  if (typeof window === 'undefined') return 'https://api.vcorganics.com';

  const host = window.location.hostname;
  const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '' || window.location.protocol === 'file:';
  const isExplicitDebug = localStorage.getItem("aiavro_debug_mode") === "true" ||
                          new URLSearchParams(window.location.search).get("debug_api") === "true";

  // Development environment or explicit debug override
  if (isLocalDev || isExplicitDebug) {
    const customUrl = localStorage.getItem("aiavro_backend_url");
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, '');
    }
    if (isLocalDev) {
      return window.location.port === '8181' ? window.location.origin : 'http://localhost:8181';
    }
  }

  // Production environment: Always fixed production API
  return 'https://api.vcorganics.com';
}

function getApiBaseUrl() {
  return resolveBackendUrl();
}

async function request(url, options = {}) {
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem("aiavro_jwt_token");
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-ID': `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const targetUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `${baseUrl}${url}`;

    const isLoginRequest = targetUrl.endsWith('/api/v1/auth/login') || targetUrl.endsWith('/auth/login');

    if (isLoginRequest) {
      console.log(`[Auth] Login endpoint: /api/v1/auth/login`);
    }

    const res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (isLoginRequest) {
      console.log(`[Auth] Login response status: ${res.status}`);
    }

    // Only treat 401 as session expiration when the request is made with an existing authenticated session (NOT login)
    if (res.status === 401 && !isLoginRequest) {
      console.warn("[API] Session expired or unauthorized (401), logging out...");
      localStorage.removeItem("aiavro_jwt_token");
      localStorage.removeItem("aiavro_logged_in_user");
      if (typeof initAuthentication === 'function') {
        initAuthentication();
      }
      const err = new Error("Session expired. Please log in again.");
      err.code = "SESSION_EXPIRED";
      err.status = 401;
      throw err;
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || errData.message || (isLoginRequest && res.status === 401 ? "Invalid username or password" : `HTTP error! Status: ${res.status}`);
      const err = new Error(errMsg);
      err.code = errData.error?.code || (res.status === 401 ? 'UNAUTHORIZED' : (res.status === 403 ? 'FORBIDDEN' : 'API_ERROR'));
      err.status = res.status;
      err.data = errData;
      throw err;
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error("Request timeout. Please check your connection.");
      timeoutErr.code = "TIMEOUT";
      throw timeoutErr;
    }
    throw err;
  }
}

// Global api namespace
if (typeof window !== 'undefined') {
  window.api = window.api || {};
  window.api.request = request;
  window.api.getBaseUrl = getApiBaseUrl;
  window.api.resolveBackendUrl = resolveBackendUrl;
  window.resolveBackendUrl = resolveBackendUrl;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    request,
    getApiBaseUrl,
    resolveBackendUrl
  };
}
