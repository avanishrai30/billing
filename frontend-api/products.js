window.api = window.api || {};

window.api.products = {
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
    const res = await window.api.request(`/api/v1/products${queryString}`);
    return Array.isArray(res) ? res : res?.products || [];
  },

  async getById(id) {
    return await window.api.request(`/api/v1/products/${encodeURIComponent(id)}`);
  },

  async getBySku(sku) {
    return await window.api.request(`/api/v1/products/by-sku/${encodeURIComponent(sku)}`);
  },

  async getByBarcode(barcode) {
    return await window.api.request(`/api/v1/products/by-barcode/${encodeURIComponent(barcode)}`);
  },

  async search(queryText, options = {}) {
    return await this.list({ search: queryText, ...options });
  },

  async save(productData) {
    return await window.api.request('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async delete(id) {
    return await window.api.request(`/api/v1/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  // Bulk Import Preview (Read-Only)
  async importPreview(previewData) {
    return await window.api.request('/api/v1/products/import/preview', {
      method: 'POST',
      body: JSON.stringify(previewData)
    });
  },

  // Bulk Import Commit (Transactional)
  async importCommit(commitData) {
    return await window.api.request('/api/v1/products/import/commit', {
      method: 'POST',
      body: JSON.stringify(commitData)
    });
  },

  // Bulk Import Session Status
  async importStatus(importId) {
    return await window.api.request(`/api/v1/products/import/${encodeURIComponent(importId)}`);
  },

  // Bulk Import Error Log
  async importErrors(importId) {
    return await window.api.request(`/api/v1/products/import/${encodeURIComponent(importId)}/errors`);
  },

  // Legacy Bulk Import Wrapper
  async import(importData) {
    return await window.api.request('/api/v1/products/import', {
      method: 'POST',
      body: JSON.stringify(importData)
    });
  }
};
