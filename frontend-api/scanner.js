window.api = window.api || {};

window.api.scanner = {
  async scan(sessionId, barcode) {
    return await window.api.request('/api/v1/scan', {
      method: 'POST',
      body: JSON.stringify({ sessionId, barcode })
    });
  },
  async serverInfo() {
    return await window.api.request('/api/v1/server-info');
  }
};
