import { apiClient } from '../../lib/api/client';
import type { UserDoc, UserEffectivePermissions, UserFormPayload, UserPresenceDoc } from './types';
import type { AuditLogDoc } from '../audit/types';

export const userApi = {
  /**
   * Fetch all user accounts
   * GET /api/v1/users
   */
  async getUsers(): Promise<UserDoc[]> {
    const res = await apiClient.get<UserDoc[] | { success: boolean; users: UserDoc[] }>('/api/v1/users');
    if (Array.isArray(res)) return res;
    if (res && 'users' in res && Array.isArray(res.users)) return res.users;
    return [];
  },

  /**
   * Fetch active presences
   * GET /api/v1/users/presences
   */
  async getPresences(): Promise<UserPresenceDoc[]> {
    const res = await apiClient.get<UserPresenceDoc[] | { success: boolean; presences: UserPresenceDoc[] }>(
      '/api/v1/users/presences'
    );
    if (Array.isArray(res)) return res;
    if (res && 'presences' in res && Array.isArray(res.presences)) return res.presences;
    return [];
  },

  /**
   * Fetch single user account by ID
   * GET /api/v1/users/:id
   */
  async getUserById(id: string): Promise<UserDoc> {
    return await apiClient.get<UserDoc>(`/api/v1/users/${encodeURIComponent(id)}`);
  },

  /**
   * Fetch computed user access including role permissions and user overrides
   * GET /api/v1/users/:id/effective-permissions
   */
  async getEffectivePermissions(id: string): Promise<UserEffectivePermissions> {
    return await apiClient.get<UserEffectivePermissions>(
      `/api/v1/users/${encodeURIComponent(id)}/effective-permissions`
    );
  },

  /**
   * Create or update user account (Admin / Super Admin)
   * POST /api/v1/users
   */
  async saveUser(payload: UserFormPayload): Promise<{ success: boolean; user: UserDoc }> {
    return await apiClient.post<{ success: boolean; user: UserDoc }>('/api/v1/users', payload);
  },

  /**
   * Save explicit per-user grant/deny permission overrides
   * POST /api/v1/users/:id/permissions
   */
  async savePermissionOverrides(
    id: string,
    payload: { permissionGrants: string[]; permissionDenies: string[] }
  ): Promise<{ success: boolean; user: UserDoc; permissions: UserEffectivePermissions }> {
    return await apiClient.post<{ success: boolean; user: UserDoc; permissions: UserEffectivePermissions }>(
      `/api/v1/users/${encodeURIComponent(id)}/permissions`,
      payload
    );
  },

  /**
   * Deactivate/suspend user account and revoke active sessions
   * POST /api/v1/users/:id/deactivate
   */
  async deactivateUser(id: string): Promise<{ success: boolean; message: string; user: UserDoc }> {
    return await apiClient.post<{ success: boolean; message: string; user: UserDoc }>(
      `/api/v1/users/${encodeURIComponent(id)}/deactivate`,
      {}
    );
  },

  /**
   * Update self profile details
   * POST /api/v1/users/profile
   */
  async updateProfile(payload: { name: string; email?: string; phone?: string }): Promise<{ success: boolean; user: UserDoc }> {
    return await apiClient.post<{ success: boolean; user: UserDoc }>('/api/v1/users/profile', payload);
  },

  /**
   * Update self avatar path (or null to remove avatar)
   * POST /api/v1/users/avatar
   */
  async updateAvatar(avatar: string | null): Promise<{ success: boolean; avatar: string | null; user?: UserDoc }> {
    return await apiClient.post<{ success: boolean; avatar: string | null; user?: UserDoc }>('/api/v1/users/avatar', { avatar });
  },

  /**
   * Upload profile avatar media through the shared upload pipeline
   * POST /api/v1/upload?type=users
   */
  async uploadAvatar(fileName: string, base64Data: string): Promise<{ success: boolean; imagePath: string; imageId: string }> {
    return await apiClient.post<{ success: boolean; imagePath: string; imageId: string }>('/api/v1/upload?type=users', {
      fileName,
      base64Data
    });
  },

  /**
   * Fetch current user's own activity without granting global audit access
   * GET /api/v1/users/me/activity
   */
  async getMyActivity(): Promise<AuditLogDoc[]> {
    const res = await apiClient.get<AuditLogDoc[] | { success: boolean; auditLogs: AuditLogDoc[] }>('/api/v1/users/me/activity?limit=25');
    if (Array.isArray(res)) return res;
    if (res && 'auditLogs' in res && Array.isArray(res.auditLogs)) return res.auditLogs;
    return [];
  },

  /**
   * Change own password
   * POST /api/v1/users/change-password
   */
  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>('/api/v1/users/change-password', payload);
  }
};
