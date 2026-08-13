api.businesses = {
  async list() {
    const res = await request('/api/v1/businesses');
    return Array.isArray(res) ? res : res?.businesses || [];
  },
  async save(bizData) {
    return await request('/api/v1/businesses', {
      method: 'POST',
      body: JSON.stringify(bizData)
    });
  },
  async delete(id) {
    return await request(`/api/v1/businesses/${id}`, {
      method: 'DELETE'
    });
  }
};
