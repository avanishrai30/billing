window.api = window.api || {};

window.api.invoices = {
  async list() {
    const res = await window.api.request('/api/v1/invoices');
    return Array.isArray(res) ? res : res?.invoices || [];
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
