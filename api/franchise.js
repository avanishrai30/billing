api.franchise = {
  async list() {
    const res = await request('/api/v1/franchises');
    return Array.isArray(res) ? res : res?.franchises || [];
  },
  async save(franchiseData) {
    return await request('/api/v1/franchises', {
      method: 'POST',
      body: JSON.stringify(franchiseData)
    });
  },
  async delete(id) {
    return await request(`/api/v1/franchises/${id}`, {
      method: 'DELETE'
    });
  },
  async listOrders() {
    const res = await request('/api/v1/franchise-supply-orders');
    return Array.isArray(res) ? res : res?.orders || [];
  },
  async saveOrder(orderData) {
    return await request('/api/v1/franchise-supply-orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }
};
