import type { Invoice } from '../invoices/types';
import type { PurchaseDoc } from '../purchases/types';
import type { FranchiseSupplyOrderDoc } from '../franchises/types';
import type { CustomerDoc } from '../customers/types';
import type { GSTSlabMetrics, TaxSummaryMetrics, B2BInvoiceEntry, B2CInvoiceEntry } from './types';

export const GST_SLAB_LABELS: Record<string, string> = {
  '0': 'Exempt Goods',
  '5': 'Essential Foods',
  '12': 'Dairy & Oils Standard',
  '18': 'Enterprise Standard'
};

export const GST_SLAB_COLORS: Record<string, string> = {
  '0': '#64748b', // Slate Gray
  '5': '#3b82f6', // Bright Sky Blue
  '12': '#f59e0b', // Amber Orange
  '18': '#8b5cf6'  // Royal Purple
};

/**
 * Validates if a GSTIN string is present and valid (non-empty alphanumeric >= 10 chars)
 */
export function isValidGSTIN(gstin?: string | null): boolean {
  if (!gstin) return false;
  const trimmed = gstin.trim();
  return trimmed.length >= 10 && trimmed.toLowerCase() !== 'unregistered' && trimmed.toLowerCase() !== 'none';
}

/**
 * Classifies an invoice into B2B or B2C based on customer's GSTIN
 */
export function classifyB2BOrB2C(
  invoice: Invoice,
  customersMap: Map<string, CustomerDoc>
): { isB2B: boolean; gstin: string } {
  const custId = invoice.customerId || (invoice as any).customer_id || (invoice as any).customer;
  const customer = custId ? customersMap.get(custId) : undefined;
  const customerGstin =
    customer?.gstin ||
    customer?.gst ||
    invoice.customerGst ||
    (invoice as any).customerGstin ||
    (invoice as any).gstin ||
    '';

  if (isValidGSTIN(customerGstin)) {
    return { isB2B: true, gstin: customerGstin.trim() };
  }
  return { isB2B: false, gstin: '' };
}

/**
 * Groups invoice line items into verified GST slabs with 50/50 CGST & SGST splitting
 */
export function groupByTaxRate(invoices: Invoice[]): GSTSlabMetrics[] {
  const validInvoices = invoices.filter((i) => i.status !== 'VOIDED');

  const slabMap = new Map<number, { taxableValue: number; taxAmount: number; count: number }>();

  // Pre-seed standard 4 verified slabs
  slabMap.set(0, { taxableValue: 0, taxAmount: 0, count: 0 });
  slabMap.set(5, { taxableValue: 0, taxAmount: 0, count: 0 });
  slabMap.set(12, { taxableValue: 0, taxAmount: 0, count: 0 });
  slabMap.set(18, { taxableValue: 0, taxAmount: 0, count: 0 });

  for (const inv of validInvoices) {
    const items = inv.items || [];
    for (const item of items) {
      const rate = Number(item.gst !== undefined ? item.gst : 5);
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || item.sellingPrice || 0);
      const lineTax = Number(item.tax !== undefined ? item.tax : (qty * price * rate) / 100);
      const lineTaxable = qty * price;

      const current = slabMap.get(rate) || { taxableValue: 0, taxAmount: 0, count: 0 };
      current.taxableValue += lineTaxable;
      current.taxAmount += lineTax;
      current.count += 1;
      slabMap.set(rate, current);
    }
  }

  // Calculate total tax for share percent calculation
  let totalTaxSum = 0;
  for (const val of slabMap.values()) {
    totalTaxSum += val.taxAmount;
  }

  const slabs: GSTSlabMetrics[] = [];
  for (const [rate, data] of slabMap.entries()) {
    const taxAmt = Math.round(data.taxAmount * 100) / 100;
    const cgst = Math.round((taxAmt / 2) * 100) / 100;
    const sgst = Math.round((taxAmt / 2) * 100) / 100;
    const sharePercent = totalTaxSum > 0 ? (data.taxAmount / totalTaxSum) * 100 : 0;

    slabs.push({
      rate,
      label: GST_SLAB_LABELS[String(rate)] || `${rate}% Standard Goods`,
      taxableValue: Math.round(data.taxableValue * 100) / 100,
      taxAmount: taxAmt,
      cgst,
      sgst,
      sharePercent: Math.round(sharePercent * 10) / 10,
      itemsCount: data.count
    });
  }

  return slabs.sort((a, b) => a.rate - b.rate);
}

/**
 * Computes high-level Tax & GST summary metrics from transactional records
 */
export function calculateTaxSummaryMetrics(
  invoices: Invoice[],
  purchases: PurchaseDoc[],
  franchiseOrders: FranchiseSupplyOrderDoc[],
  customersMap: Map<string, CustomerDoc>
): TaxSummaryMetrics {
  const validInvoices = invoices.filter((i) => i.status !== 'VOIDED');
  const validPurchases = purchases.filter((p) => p.status !== 'VOIDED');

  let grossSales = 0;
  let taxableSales = 0;
  let outwardGst = 0;
  let b2bSalesTotal = 0;
  let b2bInvoicesCount = 0;
  let b2cSalesTotal = 0;
  let b2cInvoicesCount = 0;

  for (const inv of validInvoices) {
    const invGrandTotal = Number(inv.grandTotal || 0);
    const invSubtotal = Number(inv.subtotal || 0);
    const invTax = Number(inv.tax || 0);

    grossSales += invGrandTotal;
    taxableSales += invSubtotal;
    outwardGst += invTax;

    const { isB2B } = classifyB2BOrB2C(inv, customersMap);
    if (isB2B) {
      b2bInvoicesCount++;
      b2bSalesTotal += invGrandTotal;
    } else {
      b2cInvoicesCount++;
      b2cSalesTotal += invGrandTotal;
    }
  }

  let purchaseTaxable = 0;
  let inwardGst = 0;
  let freightCharges = 0;

  for (const p of validPurchases) {
    purchaseTaxable += Number(p.subtotal || 0);
    inwardGst += Number(p.taxAmount || 0);
    freightCharges += Number(p.shipping || 0);
  }

  let franchiseTaxable = 0;
  let franchiseGst = 0;

  for (const fo of franchiseOrders) {
    franchiseTaxable += Number(fo.subtotal || 0);
    franchiseGst += Number(fo.tax || 0);
  }

  const roundedOutwardGst = Math.round(outwardGst * 100) / 100;
  const halfGst = Math.round((roundedOutwardGst / 2) * 100) / 100;

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    taxableSales: Math.round(taxableSales * 100) / 100,
    outwardGst: roundedOutwardGst,
    cgstShare: halfGst,
    sgstShare: halfGst,
    purchaseTaxable: Math.round(purchaseTaxable * 100) / 100,
    inwardGst: Math.round(inwardGst * 100) / 100,
    freightCharges: Math.round(freightCharges * 100) / 100,
    franchiseTaxable: Math.round(franchiseTaxable * 100) / 100,
    franchiseGst: Math.round(franchiseGst * 100) / 100,
    b2bSalesTotal: Math.round(b2bSalesTotal * 100) / 100,
    b2bInvoicesCount,
    b2cSalesTotal: Math.round(b2cSalesTotal * 100) / 100,
    b2cInvoicesCount
  };
}

/**
 * Builds separate B2B and B2C tables from invoices
 */
export function buildB2BSegmentationLists(
  invoices: Invoice[],
  customersMap: Map<string, CustomerDoc>,
  storesMap: Map<string, string>
): { b2b: B2BInvoiceEntry[]; b2c: B2CInvoiceEntry[] } {
  const validInvoices = invoices.filter((i) => i.status !== 'VOIDED');

  const b2b: B2BInvoiceEntry[] = [];
  const b2c: B2CInvoiceEntry[] = [];

  for (const inv of validInvoices) {
    const { isB2B, gstin } = classifyB2BOrB2C(inv, customersMap);
    const storeName = storesMap.get(inv.storeId || inv.locationId || '') || 'Main Store';
    const subtotal = Number(inv.subtotal || 0);
    const tax = Number(inv.tax || 0);
    const grandTotal = Number(inv.grandTotal || 0);
    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax / 2) * 100) / 100;

    const customer = inv.customerId ? customersMap.get(inv.customerId) : undefined;

    if (isB2B) {
      b2b.push({
        invoiceId: inv.invoiceNumber || inv.id,
        date: inv.createdAt,
        customerName: inv.customerName || customer?.name || 'B2B Client',
        gstin,
        subtotal,
        tax,
        cgst,
        sgst,
        grandTotal,
        storeName
      });
    } else {
      b2c.push({
        invoiceId: inv.invoiceNumber || inv.id,
        date: inv.createdAt,
        customerName: inv.customerName || customer?.name || 'Retail Consumer',
        subtotal,
        tax,
        grandTotal,
        storeName
      });
    }
  }

  return { b2b, b2c };
}
