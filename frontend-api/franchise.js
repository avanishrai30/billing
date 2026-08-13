window.api = window.api || {};

const franchiseMethods = {
  async list() {
    const res = await window.api.request('/api/v1/franchises');
    return Array.isArray(res) ? res : res?.franchises || [];
  },
  async save(franchiseData) {
    return await window.api.request('/api/v1/franchises', {
      method: 'POST',
      body: JSON.stringify(franchiseData)
    });
  },
  async delete(id) {
    return await window.api.request(`/api/v1/franchises/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },
  async listOrders() {
    const res = await window.api.request('/api/v1/franchise-supply-orders');
    return Array.isArray(res) ? res : res?.orders || [];
  },
  async saveOrder(orderData) {
    return await window.api.request('/api/v1/franchise-supply-orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }
};

const franchiseSupplyOrderMethods = {
  async list() {
    return await franchiseMethods.listOrders();
  },
  async save(orderData) {
    return await franchiseMethods.saveOrder(orderData);
  }
};

window.api.franchise = franchiseMethods;
window.api.franchises = franchiseMethods;
window.api.franchiseSupplyOrders = franchiseSupplyOrderMethods;
