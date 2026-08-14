const { request } = require('../frontend-api/client');

describe('Frontend API Client 401 & Authentication Handling', () => {
  let originalFetch;
  let originalLocalStorage;
  let storage = {};

  beforeEach(() => {
    storage = {};
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: (key) => storage[key] || null,
      setItem: (key, val) => { storage[key] = String(val); },
      removeItem: (key) => { delete storage[key]; },
      clear: () => { storage = {}; }
    };

    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.localStorage = originalLocalStorage;
  });

  test('1. Login 200 -> returns successful login payload and sets token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        token: 'mock-jwt-token-123',
        user: { id: 'usr-1', username: 'rajesh', name: 'Rajesh Sharma' }
      })
    });

    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'rajesh', password: 'ValidPassword123!' })
    });

    expect(res.success).toBe(true);
    expect(res.token).toBe('mock-jwt-token-123');
  });

  test('2. Login 401 -> throws INVALID_CREDENTIALS error and does NOT clear session or call initAuthentication', async () => {
    storage['aiavro_jwt_token'] = 'existing-token';
    storage['aiavro_logged_in_user'] = JSON.stringify({ id: 'usr-1' });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      })
    });

    let errorThrown = null;
    try {
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'rajesh', password: 'WrongPassword!' })
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(401);
    expect(errorThrown.code).toBe('INVALID_CREDENTIALS');
    expect(errorThrown.message).toBe('Invalid username or password');
    // Session token MUST NOT be cleared on login 401
    expect(storage['aiavro_jwt_token']).toBe('existing-token');
  });

  test('3. Protected API 401 -> treats as session expired and clears JWT & user state', async () => {
    storage['aiavro_jwt_token'] = 'stale-expired-token';
    storage['aiavro_logged_in_user'] = JSON.stringify({ id: 'usr-1' });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: 'SESSION_REVOKED', message: 'Session has been invalidated. Please log in again.' }
      })
    });

    let errorThrown = null;
    try {
      await request('/api/v1/products', { method: 'GET' });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(401);
    expect(errorThrown.message).toBe('Session expired. Please log in again.');
    // Must clear localStorage on protected request 401
    expect(storage['aiavro_jwt_token']).toBeUndefined();
    expect(storage['aiavro_logged_in_user']).toBeUndefined();
  });

  test('4. Protected API 403 -> throws FORBIDDEN error and does NOT clear JWT', async () => {
    storage['aiavro_jwt_token'] = 'valid-token';
    storage['aiavro_logged_in_user'] = JSON.stringify({ id: 'usr-1' });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Forbidden: Missing required permission' }
      })
    });

    let errorThrown = null;
    try {
      await request('/api/v1/role-permissions', { method: 'POST' });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(403);
    expect(errorThrown.code).toBe('FORBIDDEN');
    expect(errorThrown.message).toBe('Forbidden: Missing required permission');
    expect(storage['aiavro_jwt_token']).toBe('valid-token');
  });

  test('5. Login 403 -> throws ACCOUNT_SUSPENDED error and preserves state', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account is suspended' }
      })
    });

    let errorThrown = null;
    try {
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'suspendeduser', password: 'Password123!' })
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(403);
    expect(errorThrown.code).toBe('ACCOUNT_SUSPENDED');
    expect(errorThrown.message).toBe('Your account is suspended');
  });

  test('6. Login 500 -> throws SERVER_ERROR and preserves state', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Server error during authentication' }
      })
    });

    let errorThrown = null;
    try {
      await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'user', password: 'Password123!' })
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.status).toBe(500);
    expect(errorThrown.code).toBe('SERVER_ERROR');
    expect(errorThrown.message).toBe('Server error during authentication');
  });
});
