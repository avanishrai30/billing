import { permissionsApi } from '../../features/permissions/api';
import { permissionQueryKeys } from '../../features/permissions/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client');

describe('RBAC Permissions API & Query Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. permissionQueryKeys generates deterministic cache keys', () => {
    expect(permissionQueryKeys.all).toEqual(['role-permissions']);
    expect(permissionQueryKeys.matrix()).toEqual(['role-permissions', 'matrix']);
  });

  it('2. permissionsApi.getRolePermissions calls GET /api/v1/role-permissions', async () => {
    const mockMatrix = {
      admin: ['dashboard.view'],
      employee: ['invoices.create'],
      auditor: ['audit.view']
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockMatrix);

    const result = await permissionsApi.getRolePermissions();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/role-permissions');
    expect(result).toEqual(mockMatrix);
  });

  it('3. permissionsApi.saveRolePermissions calls POST /api/v1/role-permissions', async () => {
    const payload = {
      admin: ['dashboard.view', 'products.view'],
      employee: ['invoices.create'],
      auditor: ['audit.view']
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, message: 'Saved' });

    const result = await permissionsApi.saveRolePermissions(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/role-permissions', { permissions: payload });
    expect(result.success).toBe(true);
  });
});
