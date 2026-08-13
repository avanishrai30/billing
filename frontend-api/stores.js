window.api = window.api || {};

window.api.stores = {
  async list() {
    const res = await window.api.request('/api/v1/stores');
    return Array.isArray(res) ? res : res?.stores || [];
  },
  async save(storeData) {
    return await window.api.request('/api/v1/stores', {
      method: 'POST',
      body: JSON.stringify(storeData)
    });
  },
  async delete(id) {
    return await window.api.request(`/api/v1/stores/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
