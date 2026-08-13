api.auth = {
  async login(username, password) {
    return await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  async verify() {
    return await request('/api/v1/auth/verify');
  }
};
