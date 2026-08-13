window.api = window.api || {};

window.api.customers = {
  async list() {
    const res = await window.api.request('/api/v1/customers');
    return Array.isArray(res) ? res : res?.customers || [];
  },
  async save(customerData) {
    return await window.api.request('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  },
  async delete(id) {
    return await window.api.request(`/api/v1/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
