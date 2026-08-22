export type UserCategory = 'super admin' | 'admin' | 'employee' | 'auditor';
export type UserStatus = 'active' | 'suspended' | 'inactive';

export interface UserDoc {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  category: UserCategory;
  assignedStoreId?: string;
  assignedStores?: string[];
  permissions?: string[];
  permissionGrants?: string[];
  permissionDenies?: string[];
  status: UserStatus;
  tokenVersion?: number;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserFormPayload {
  id?: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  password?: string;
  role: string;
  category?: UserCategory;
  assignedStoreId?: string;
  assignedStores?: string[];
  permissions?: string[];
  permissionGrants?: string[];
  permissionDenies?: string[];
  status?: UserStatus;
}

export interface UserEffectivePermissions {
  success: boolean;
  userId: string;
  category: UserCategory;
  rolePermissions: string[];
  permissionGrants: string[];
  permissionDenies: string[];
  effectivePermissions: string[];
}

export interface UserPresenceDoc {
  userId: string;
  username: string;
  role?: string;
  assignedStoreId?: string;
  status?: string;
  connectedAt?: string;
  lastSeen?: string;
}

export interface UserSummaryMetrics {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdmins: number;
  admins: number;
  employees: number;
  auditors: number;
}
