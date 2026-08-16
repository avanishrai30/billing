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
  status: 'active' | 'inactive' | string;
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
}

export interface StoreSummaryMetrics {
  totalStores: number;
  activeStoresCount: number;
  inactiveStoresCount: number;
}
