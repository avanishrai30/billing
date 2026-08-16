export type TaxReportingTab =
  | 'overview'
  | 'outward'
  | 'inward'
  | 'franchise'
  | 'slabs'
  | 'b2b_b2c';

export interface TaxFilterValues {
  storeId: string;
  startDate: string;
  endDate: string;
  tab: TaxReportingTab;
}

export interface TaxSummaryMetrics {
  grossSales: number;
  taxableSales: number;
  outwardGst: number;
  cgstShare: number;
  sgstShare: number;
  purchaseTaxable: number;
  inwardGst: number;
  freightCharges: number;
  franchiseTaxable: number;
  franchiseGst: number;
  b2bSalesTotal: number;
  b2bInvoicesCount: number;
  b2cSalesTotal: number;
  b2cInvoicesCount: number;
}

export interface GSTSlabMetrics {
  rate: number;
  label: string;
  taxableValue: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  sharePercent: number;
  itemsCount: number;
}

export interface B2BInvoiceEntry {
  invoiceId: string;
  date: string;
  customerName: string;
  gstin: string;
  subtotal: number;
  tax: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  storeName: string;
}

export interface B2CInvoiceEntry {
  invoiceId: string;
  date: string;
  customerName: string;
  subtotal: number;
  tax: number;
  grandTotal: number;
  storeName: string;
}
