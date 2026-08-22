import { userApi } from '../../features/users/api';
import {
  patchUserEffectivePermissionsCache,
  patchUserListCache,
  shouldApplyUserPatch,
  userQueryKeys
} from '../../features/users/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client');

describe('User API & Query Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. userQueryKeys generates deterministic cache keys', () => {
    expect(userQueryKeys.list()).toEqual(['users', 'list']);
    expect(userQueryKeys.presences()).toEqual(['users', 'presences']);
    expect(userQueryKeys.detail('usr-101')).toEqual(['users', 'detail', 'usr-101']);
  });

  it('2. userApi.getUsers calls GET /api/v1/users', async () => {
    const mockList = [{ id: 'usr-1', name: 'Admin', username: 'admin' }];
    (apiClient.get as jest.Mock).mockResolvedValue(mockList);

    const result = await userApi.getUsers();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users');
    expect(result).toEqual(mockList);
  });

  it('3. userApi.saveUser calls POST /api/v1/users', async () => {
    const payload = {
      name: 'Ramesh Patil',
      username: 'ramesh',
      role: 'Cashier',
      category: 'employee' as const
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, user: { ...payload, id: 'usr-2' } });

    const result = await userApi.saveUser(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users', payload);
    expect(result.success).toBe(true);
  });

  it('4. userApi.deactivateUser calls POST /api/v1/users/:id/deactivate', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, message: 'Deactivated' });

    const result = await userApi.deactivateUser('usr-2');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users/usr-2/deactivate', {});
    expect(result.success).toBe(true);
  });

  it('5. applies authoritative saved user into the list cache immediately', () => {
    const current = [
      {
        id: 'usr-2',
        name: 'Ramesh Patil',
        username: 'ramesh',
        role: 'Admin',
        category: 'employee' as const,
        status: 'active' as const,
        createdAt: '2026-08-22T20:00:00.000Z',
        updatedAt: '2026-08-22T20:00:00.000Z'
      }
    ];

    const patched = patchUserListCache(current, {
      ...current[0],
      category: 'admin',
      updatedAt: '2026-08-22T20:01:00.000Z'
    });

    expect(patched?.[0].category).toBe('admin');
    expect(patched?.[0].role).toBe('Admin');
  });

  it('6. rejects older realtime user payloads by updatedAt', () => {
    expect(
      shouldApplyUserPatch(
        { updatedAt: '2026-08-22T20:05:00.000Z', createdAt: '2026-08-22T20:00:00.000Z' },
        { updatedAt: '2026-08-22T20:04:00.000Z', createdAt: '2026-08-22T20:00:00.000Z' }
      )
    ).toBe(false);

    expect(
      shouldApplyUserPatch(
        { updatedAt: '2026-08-22T20:05:00.000Z', createdAt: '2026-08-22T20:00:00.000Z' },
        { updatedAt: '2026-08-22T20:06:00.000Z', createdAt: '2026-08-22T20:00:00.000Z' }
      )
    ).toBe(true);
  });

  it('7. patches effective-permissions category while refetch catches the full template', () => {
    const patched = patchUserEffectivePermissionsCache(
      {
        success: true,
        userId: 'usr-2',
        category: 'employee',
        rolePermissions: ['dashboard.view'],
        permissionGrants: [],
        permissionDenies: [],
        effectivePermissions: ['dashboard.view']
      },
      {
        id: 'usr-2',
        name: 'Ramesh Patil',
        username: 'ramesh',
        role: 'Admin',
        category: 'admin',
        permissionGrants: ['users.view'],
        permissionDenies: [],
        status: 'active',
        createdAt: '2026-08-22T20:00:00.000Z',
        updatedAt: '2026-08-22T20:01:00.000Z'
      }
    );

    expect(patched?.category).toBe('admin');
    expect(patched?.permissionGrants).toContain('users.view');
  });
});
