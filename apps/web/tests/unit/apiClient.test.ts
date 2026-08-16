import { apiClient, registerSessionExpiredCallback } from '../../lib/api/client';
import { ApiError } from '../../lib/errors/types';
import { sessionManager } from '../../lib/auth/session';

describe('Shared API Client & Error Normalization', () => {
  beforeEach(() => {
    sessionManager.clearSession();
    jest.clearAllMocks();
  });

  it('1. Successfully performs GET request and returns typed payload', async () => {
    const mockData = { title: 'AIAVRO OS', logo: 'logo.png' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockData
    });

    const result = await apiClient.get('/api/v1/public/settings');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/public/settings'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Accept': 'application/json',
          'X-Request-ID': expect.stringMatching(/^req-\d+/)
        })
      })
    );
  });

  it('2. Attaches Authorization header when session token exists', async () => {
    sessionManager.setToken('test-jwt-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true })
    });

    await apiClient.get('/api/v1/users');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-jwt-token'
        })
      })
    );
  });

  it('3. Normalizes 403 Forbidden into structured ApiError with code and message', async () => {
    const errorPayload = {
      success: false,
      error: {
        code: 'STORE_ACCESS_DENIED',
        message: "Forbidden: You are not authorized for store 'st-2'"
      },
      requestId: 'req-test-999'
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorPayload
    });

    try {
      await apiClient.post('/api/v1/invoices', { storeId: 'st-2' });
      fail('Expected apiClient to throw an ApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.code).toBe('STORE_ACCESS_DENIED');
      expect(apiErr.message).toBe("Forbidden: You are not authorized for store 'st-2'");
      expect(apiErr.requestId).toBe('req-test-999');
    }
  });

  it('4. Handles 401 Unauthorized by clearing session and triggering expiration callback', async () => {
    sessionManager.setToken('expired-token');
    const expiredCallback = jest.fn();
    registerSessionExpiredCallback(expiredCallback);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: false,
        error: { code: 'SESSION_REVOKED', message: 'Session has been invalidated' }
      })
    });

    await expect(apiClient.get('/api/v1/products')).rejects.toThrow(ApiError);
    expect(sessionManager.getToken()).toBeNull();
    expect(expiredCallback).toHaveBeenCalled();
  });
});
