/**
 * Authoritative Customer Domain Types
 * Based on verified backend contracts: modules/customers.js
 */

export interface CustomerDoc {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  gst?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerFormPayload {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
}

export interface CustomerSummaryMetrics {
  totalCustomers: number;
  withGstinCount: number;
  withEmailCount: number;
}
