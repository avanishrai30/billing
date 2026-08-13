// Central API Client Core
const API_BASE_URL = window.location.origin;

async function request(url, options = {}) {
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
  const id = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(id);

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
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error("Request timeout. Please check your connection.");
    }
    throw err;
  }
}

// Global api namespace
window.api = {
  request
};
