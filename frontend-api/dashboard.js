api.dashboard = {
  async getMetrics() {
    return await request('/api/v1/public/settings');
  }
};
