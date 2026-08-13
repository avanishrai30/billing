window.api = window.api || {};

window.api.auth = {
  async login(username, password) {
    return await window.api.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  async verify() {
    return await window.api.request('/api/v1/auth/verify');
  }
};
