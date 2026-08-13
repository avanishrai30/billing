api.suppliers = {
  async list() {
    const res = await request('/api/v1/suppliers');
    return Array.isArray(res) ? res : res?.suppliers || [];
  },
  async save(supplierData) {
    return await request('/api/v1/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData)
    });
  }
};
