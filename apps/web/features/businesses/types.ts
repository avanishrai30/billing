/**
 * Authoritative Business & Tenant Domain Types
 * Based on verified backend contracts: modules/businesses.js
 */

export interface BusinessDoc {
  _id?: string;
  id: string;
  name: string;
  subtitle?: string;
  owner?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  terms?: string;
  logo?: string;
  status: 'active' | 'inactive' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessFormPayload {
  id?: string;
  name: string;
  subtitle?: string;
  owner?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  terms?: string;
  logo?: string;
  status?: 'active' | 'inactive' | string;
}
