window.api = window.api || {};

window.api.businesses = {
  async list() {
    const res = await window.api.request('/api/v1/businesses');
    return Array.isArray(res) ? res : res?.businesses || [];
  },
  async save(bizData) {
    return await window.api.request('/api/v1/businesses', {
      method: 'POST',
      body: JSON.stringify(bizData)
    });
  },
  async delete(id) {
    return await window.api.request(`/api/v1/businesses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
