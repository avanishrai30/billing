window.api = window.api || {};

window.api.purchases = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/v1/purchases?${query}` : '/api/v1/purchases';
    const res = await window.api.request(url);
    if (Array.isArray(res)) return res;
    return res?.purchases || [];
  },

  async listWithPagination(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/v1/purchases?${query}` : '/api/v1/purchases';
    return await window.api.request(url);
  },

  async save(purchaseData) {
    return await window.api.request('/api/v1/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });
  },

  async delete(id) {
    return await window.api.request(`/api/v1/purchases/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
