window.api = window.api || {};

window.api.suppliers = {
  async list() {
    const res = await window.api.request('/api/v1/suppliers');
    return Array.isArray(res) ? res : res?.suppliers || [];
  },
  async save(supplierData) {
    return await window.api.request('/api/v1/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData)
    });
  },
  async delete(id) {
    return await window.api.request(`/api/v1/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
