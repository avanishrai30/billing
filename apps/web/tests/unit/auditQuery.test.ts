import { auditApi } from '../../features/audit/api';
import { auditQueryKeys } from '../../features/audit/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client');

describe('Audit API & Query Keys Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. auditQueryKeys generates deterministic cache keys', () => {
    expect(auditQueryKeys.all).toEqual(['audit-logs']);
    expect(auditQueryKeys.list({ limit: 100, storeId: 'store-1' })).toEqual([
      'audit-logs',
      'list',
      { limit: 100, storeId: 'store-1' }
    ]);
  });

  it('2. auditApi.getAuditLogs calls GET /api/v1/audit-logs with query parameters', async () => {
    const mockLogs = [
      {
        _id: 'audit-1',
        eventType: 'LOGIN_SUCCESS',
        entity: 'auth',
        entityId: 'usr-1',
        performedBy: 'admin',
        action: 'auth',
        view: 'login',
        details: 'User session authenticated successfully',
        businessId: 'all',
        timestamp: new Date().toISOString()
      }
    ];

    (apiClient.get as jest.Mock).mockResolvedValue(mockLogs);

    const result = await auditApi.getAuditLogs({
      limit: 50,
      skip: 10,
      eventType: 'LOGIN_SUCCESS',
      storeId: 'store-1'
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/audit-logs?limit=50&skip=10&eventType=LOGIN_SUCCESS&storeId=store-1'
    );
    expect(result).toEqual(mockLogs);
  });
});
