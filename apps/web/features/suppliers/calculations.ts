import type { SupplierDoc, SupplierSummaryMetrics } from './types';

/**
 * Pure Domain Calculations & Formatters for Suppliers
 */

export function calculateSupplierMetrics(suppliers: SupplierDoc[]): SupplierSummaryMetrics {
  let withGstCount = 0;
  let withEmailCount = 0;

  for (const s of suppliers) {
    if ((s.gst && s.gst.trim()) || (s.gstin && s.gstin.trim())) {
      withGstCount += 1;
    }
    if (s.email && s.email.trim()) {
      withEmailCount += 1;
    }
  }

  return {
    totalSuppliers: suppliers.length,
    withGstCount,
    withEmailCount
  };
}

export function formatSupplierContact(contact: string): string {
  if (!contact) return '';
  const cleaned = contact.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return contact;
}

export function formatSupplierGst(gst?: string): string {
  if (!gst || !gst.trim()) return 'Unregistered';
  return gst.trim().toUpperCase();
}
