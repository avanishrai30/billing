api.settings = {
  async getRolePermissions() {
    return await request('/api/v1/role-permissions');
  },
  async saveRolePermissions(matrix) {
    return await request('/api/v1/role-permissions', {
      method: 'POST',
      body: JSON.stringify(matrix)
    });
  },
  async getPublicSettings() {
    return await request('/api/v1/public/settings');
  },
  async saveBranding(brandingData) {
    return await request('/api/v1/settings', {
      method: 'POST',
      body: JSON.stringify(brandingData)
    });
  },
  async getServerInfo() {
    return await request('/api/v1/server-info');
  }
};
