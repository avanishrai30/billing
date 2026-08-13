api.scanner = {
  async scan(sessionId, barcode) {
    return await request('/api/v1/scan', {
      method: 'POST',
      body: JSON.stringify({ sessionId, barcode })
    });
  },
  async serverInfo() {
    return await request('/api/v1/server-info');
  }
};
