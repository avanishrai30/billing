api.purchases = {
  async list() {
    const res = await request('/api/v1/purchases');
    return Array.isArray(res) ? res : res?.purchases || [];
  },
  async save(purchaseData) {
    return await request('/api/v1/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData)
    });
  }
};
