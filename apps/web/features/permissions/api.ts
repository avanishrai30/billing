import { apiClient } from '../../lib/api/client';
import type { RolePermissionsMatrix } from './types';

export const permissionsApi = {
  /**
   * Fetch current RBAC permissions matrix
   * GET /api/v1/role-permissions
   */
  async getRolePermissions(): Promise<RolePermissionsMatrix> {
    const res = await apiClient.get<RolePermissionsMatrix | { success: boolean; permissions: RolePermissionsMatrix }>(
      '/api/v1/role-permissions'
    );
    if (res && 'permissions' in res && typeof res.permissions === 'object') {
      return res.permissions;
    }
    return res as RolePermissionsMatrix;
  },

  /**
   * Save dynamic RBAC permissions matrix
   * POST /api/v1/role-permissions
   */
  async saveRolePermissions(matrix: RolePermissionsMatrix): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>('/api/v1/role-permissions', {
      permissions: matrix
    });
  }
};
