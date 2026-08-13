api.customers = {
  async list() {
    const res = await request('/api/v1/customers');
    return Array.isArray(res) ? res : res?.customers || [];
  },
  async save(customerData) {
    return await request('/api/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customerData)
    });
  }
};
