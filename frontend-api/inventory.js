window.api = window.api || {};

window.api.inventory = {
  async list(params = {}) {
    const query = new URLSearchParams();
    if (params.locationId) query.set('locationId', params.locationId);
    if (params.storeId) query.set('storeId', params.storeId);
    if (params.productId) query.set('productId', params.productId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await window.api.request(`/api/v1/inventory${qs}`);
    if (res && res.inventory) {
      return Array.isArray(res.inventory) ? res.inventory : [];
    }
    return Array.isArray(res) ? res : [];
  },

  async logs(params = {}) {
    const query = new URLSearchParams();
    if (params.locationId) query.set('locationId', params.locationId);
    if (params.storeId) query.set('storeId', params.storeId);
    if (params.productId) query.set('productId', params.productId);
    if (params.type) query.set('type', params.type);
    if (params.limit) query.set('limit', params.limit);
    if (params.cursor) query.set('cursor', params.cursor);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await window.api.request(`/api/v1/inventory/logs${qs}`);
    if (res && res.data) {
      return Array.isArray(res.data) ? res.data : [];
    }
    return Array.isArray(res) ? res : [];
  },

  async summary(params = {}) {
    const query = new URLSearchParams();
    if (params.locationId) query.set('locationId', params.locationId);
    if (params.storeId) query.set('storeId', params.storeId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return await window.api.request(`/api/v1/inventory/summary${qs}`);
  },

  async checkAvailability(items, locationId) {
    return await window.api.request('/api/v1/inventory/check-availability', {
      method: 'POST',
      body: JSON.stringify({ items, locationId, storeId: locationId })
    });
  },

  async adjust(adjustData) {
    return await window.api.request('/api/v1/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustData)
    });
  },

  async transfer(transferData) {
    return await window.api.request('/api/v1/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData)
    });
  }
};
