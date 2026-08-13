window.api = window.api || {};

window.api.dashboard = {
  async getMetrics() {
    return await window.api.request('/api/v1/public/settings');
  }
};
