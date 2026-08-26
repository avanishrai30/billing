/**
 * Authoritative Store & Outlet Domain Types
 * Based on verified backend contracts: modules/stores.js
 */

export interface StoreDoc {
  _id?: string;
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  businessId?: string;
  locationType?: 'WAREHOUSE' | 'STORE' | string;
  status: 'active' | 'inactive' | string;
  isHub?: boolean;
  hubPriority?: number;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreFormPayload {
  id?: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  businessId?: string;
  status?: 'active' | 'inactive' | string;
  isHub?: boolean;
  hubPriority?: number;
}

export interface StoreSummaryMetrics {
  totalStores: number;
  activeStoresCount: number;
  inactiveStoresCount: number;
  hubStoresCount: number;
}

export interface StoreEmployeeDoc {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: string;
  category: string;
  assignedStoreId?: string;
  assignedStores: string[];
  status: string;
  avatar?: string | null;
  avatarUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
