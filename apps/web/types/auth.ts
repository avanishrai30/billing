/**
 * Authoritative Auth & User Types
 * Source: docs/AUTH_RBAC_CONTRACT.md
 */

export type UserRoleCategory = 'super admin' | 'owner' | 'admin' | 'employee' | 'auditor';

export type AuthLifecycle =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'logging-out'
  | 'session-expired';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  category: UserRoleCategory;
  assignedStoreId: string;
  assignedStores?: string[];
  permissions?: string[];
  permissionGrants?: string[];
  permissionDenies?: string[];
  avatar?: string | null;
  status: 'active' | 'suspended' | 'inactive';
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export interface JwtTokenPayload {
  id: string;
  username: string;
  role: string;
  category: UserRoleCategory;
  assignedStoreId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}
