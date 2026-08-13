api.inventory = {
  async list() {
    const res = await request('/api/v1/inventory');
    if (res && res.inventory) {
      return Array.isArray(res.inventory) ? res.inventory : [];
    }
    return Array.isArray(res) ? res : [];
  },
  async logs() {
    return [];
  },
  async adjust(adjustData) {
    return await request('/api/v1/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustData)
    });
  },
  async transfer(transferData) {
    return await request('/api/v1/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
  }
};
