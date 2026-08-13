window.api = window.api || {};

window.api.users = {
  async list() {
    const res = await window.api.request('/api/v1/users');
    return Array.isArray(res) ? res : res?.users || [];
  },
  async presences() {
    const res = await window.api.request('/api/v1/users/presences');
    return Array.isArray(res) ? res : res?.presences || [];
  },
  async save(userData) {
    return await window.api.request('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  async updateProfile(profileData) {
    return await window.api.request('/api/v1/users/profile', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  },
  async updateAvatar(avatarData) {
    return await window.api.request('/api/v1/users/avatar', {
      method: 'POST',
      body: JSON.stringify(avatarData)
    });
  },
  async changePassword(passwordData) {
    return await window.api.request('/api/v1/users/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }
};
