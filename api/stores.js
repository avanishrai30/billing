api.stores = {
  async list() {
    const res = await request('/api/v1/stores');
    return Array.isArray(res) ? res : res?.stores || [];
  }
};
