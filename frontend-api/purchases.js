window.api = window.api || {};

window.api.purchases = {
  async list() {
    const res = await window.api.request('/api/v1/purchases');
    return Array.isArray(res) ? res : res?.purchases || [];
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
