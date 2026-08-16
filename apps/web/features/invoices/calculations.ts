import type { Invoice, InvoiceSummaryMetrics, InvoiceStatus } from './types';

/**
 * Pure Calculation Helpers for Invoices & Sales Ledger
 */

export function calculateInvoiceSummary(invoices: Invoice[]): InvoiceSummaryMetrics {
  let totalRevenue = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let activeCount = 0;

  for (const inv of invoices) {
    if (inv.status !== 'VOIDED' && !inv.isArchived) {
      const gt = Number(inv.grandTotal ?? inv.grandtotal ?? 0);
      const tx = Number(inv.tax ?? 0);
      const disc = Number(inv.discount ?? 0);

      totalRevenue += gt;
      totalTax += tx;
      totalDiscount += disc;
      activeCount += 1;
    }
  }

  const averageTicket = activeCount > 0 ? totalRevenue / activeCount : 0;

  return {
    totalInvoices: activeCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    averageTicket: Math.round(averageTicket * 100) / 100
  };
}

export function formatInvoiceNumber(inv: Invoice): string {
  return inv.invoiceNumber || inv.id || 'INV-UNKNOWN';
}

export function getPaymentModeBadgeConfig(mode?: string): {
  label: string;
  variant: 'neutral' | 'success' | 'warning' | 'info' | 'danger';
} {
  const clean = (mode || 'CASH').toUpperCase();
  switch (clean) {
    case 'UPI':
      return { label: 'UPI / QR', variant: 'info' };
    case 'CARD':
      return { label: 'Card Swipe', variant: 'warning' };
    case 'BANK':
      return { label: 'Bank Transfer', variant: 'neutral' };
    case 'CASH':
    default:
      return { label: 'Cash Tender', variant: 'success' };
  }
}

export function getInvoiceStatusConfig(status?: string): {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'neutral';
} {
  const clean = (status || 'COMPLETED').toUpperCase();
  switch (clean) {
    case 'VOIDED':
      return { label: 'Voided', variant: 'danger' };
    case 'PENDING':
      return { label: 'Pending', variant: 'warning' };
    case 'PAID':
    case 'COMPLETED':
    default:
      return { label: 'Paid / Completed', variant: 'success' };
  }
}
