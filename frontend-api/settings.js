window.api = window.api || {};

window.api.settings = {
  async getRolePermissions() {
    return await window.api.request('/api/v1/role-permissions');
  },
  async saveRolePermissions(matrix) {
    return await window.api.request('/api/v1/role-permissions', {
      method: 'POST',
      body: JSON.stringify(matrix)
    });
  },
  async getPublicSettings() {
    return await window.api.request('/api/v1/public/settings');
  },
  async saveBranding(brandingData) {
    return await window.api.request('/api/v1/settings', {
      method: 'POST',
      body: JSON.stringify(brandingData)
    });
  },
  async getServerInfo() {
    return await window.api.request('/api/v1/server-info');
  }
};
