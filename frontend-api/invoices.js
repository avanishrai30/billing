window.api = window.api || {};

window.api.invoices = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/v1/invoices?${query}` : '/api/v1/invoices';
    const res = await window.api.request(url);
    if (Array.isArray(res)) return res;
    return res?.invoices || [];
  },

  async listWithPagination(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/v1/invoices?${query}` : '/api/v1/invoices';
    return await window.api.request(url);
  },

  async getById(id) {
    const res = await window.api.request(`/api/v1/invoices/${encodeURIComponent(id)}`);
    return res;
  },

  async save(invoiceData) {
    return await window.api.request('/api/v1/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  },

  async void(id) {
    return await window.api.request(`/api/v1/invoices/${encodeURIComponent(id)}/void`, {
      method: 'POST'
    });
  },

  async getPdf(id) {
    const backendUrl = (typeof window.resolveBackendUrl === 'function')
      ? window.resolveBackendUrl()
      : 'https://api.vcorganics.com';
    const token = localStorage.getItem('aiavro_jwt_token') || '';
    const response = await fetch(`${backendUrl}/api/v1/invoices/${encodeURIComponent(id)}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('PDF download failed');
    return await response.blob();
  }
};
