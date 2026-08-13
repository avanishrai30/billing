// Central Frontend API Client Core (V3)
function getApiBaseUrl() {
  const customUrl = localStorage.getItem("aiavro_backend_url");
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.VC_API_URL) return window.VC_API_URL.replace(/\/+$/, '');
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.port === '8181' ? window.location.origin : 'http://localhost:8181';
    }
  }
  return 'https://api.vcorganics.com';
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

    const res = await fetch(targetUrl, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.status === 401) {
      console.warn("[API] Unauthorized (401), logging out...");
      localStorage.removeItem("aiavro_jwt_token");
      localStorage.removeItem("aiavro_logged_in_user");
      if (typeof initAuthentication === 'function') {
        initAuthentication();
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error! Status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("Request timeout. Please check your connection.");
    }
    throw err;
  }
}

// Global api namespace
window.api = {
  request,
  getBaseUrl: getApiBaseUrl
};
