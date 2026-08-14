window.api = window.api || {};

window.api.dashboard = {
  async getMetrics(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/v1/dashboard/metrics?${query}` : '/api/v1/dashboard/metrics';
    return await window.api.request(url);
  }
};
