api.products = {
  async list() {
    const res = await request('/api/v1/products');
    return Array.isArray(res) ? res : res?.products || [];
  },
  async save(productData) {
    return await request('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },
  async import(importData) {
    return await request('/api/v1/products/import', {
      method: 'POST',
      body: JSON.stringify(importData)
    });
  }
};
