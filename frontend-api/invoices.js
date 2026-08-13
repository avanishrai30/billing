window.api = window.api || {};

window.api.invoices = {
  async list() {
    const res = await window.api.request('/api/v1/invoices');
    return Array.isArray(res) ? res : res?.invoices || [];
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
  }
};
