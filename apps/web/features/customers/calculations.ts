import type { CustomerDoc, CustomerSummaryMetrics } from './types';

/**
 * Pure Domain Calculations & Formatters for Customers / CRM
 */

export function calculateCustomerMetrics(customers: CustomerDoc[]): CustomerSummaryMetrics {
  let withGstinCount = 0;
  let withEmailCount = 0;

  for (const c of customers) {
    if (c.gstin && c.gstin.trim()) {
      withGstinCount += 1;
    }
    if (c.email && c.email.trim()) {
      withEmailCount += 1;
    }
  }

  return {
    totalCustomers: customers.length,
    withGstinCount,
    withEmailCount
  };
}

export function formatCustomerPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function formatCustomerGst(gstin?: string): string {
  if (!gstin || !gstin.trim()) return 'Unregistered';
  return gstin.trim().toUpperCase();
}
