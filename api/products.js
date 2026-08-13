api.products = {
  async list(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.category) query.set('category', params.category);
    if (params.brand) query.set('brand', params.brand);
    if (params.sellingMode) query.set('sellingMode', params.sellingMode);
    if (params.type) query.set('type', params.type);
    if (params.status) query.set('status', params.status);
    if (params.limit) query.set('limit', params.limit);
    if (params.page) query.set('page', params.page);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await request(`/api/v1/products${queryString}`);
    return Array.isArray(res) ? res : res?.products || [];
  },

  async getById(id) {
    return await request(`/api/v1/products/${encodeURIComponent(id)}`);
  },

  async getBySku(sku) {
    return await request(`/api/v1/products/by-sku/${encodeURIComponent(sku)}`);
  },

  async getByBarcode(barcode) {
    return await request(`/api/v1/products/by-barcode/${encodeURIComponent(barcode)}`);
  },

  async search(queryText, options = {}) {
    return await this.list({ search: queryText, ...options });
  },

  async save(productData) {
    return await request('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async delete(id) {
    return await request(`/api/v1/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async import(importData) {
    return await request('/api/v1/products/import', {
      method: 'POST',
      body: JSON.stringify(importData)
    });
  }
};
