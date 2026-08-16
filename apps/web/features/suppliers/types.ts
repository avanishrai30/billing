/**
 * Authoritative Supplier Domain Types
 * Based on verified backend contracts: modules/suppliers.js
 */

export interface SupplierDoc {
  _id?: string;
  id: string;
  name: string;
  contact: string;
  email?: string;
  gst?: string;
  gstin?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierFormPayload {
  id?: string;
  name: string;
  contact: string;
  email?: string;
  gst?: string;
  address?: string;
}

export interface SupplierSummaryMetrics {
  totalSuppliers: number;
  withGstCount: number;
  withEmailCount: number;
}
