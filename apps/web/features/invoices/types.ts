/**
 * Authoritative Invoice & Sales Ledger Domain Models
 * Source: modules/billing.js & services/billingService.js
 */

export type InvoicePaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK';

export type InvoiceStatus = 'COMPLETED' | 'PAID' | 'PENDING' | 'VOIDED';

export interface InvoiceReceiptTemplate {
  id: string;
  name: string;
  paperWidthMm: 58 | 80;
  header?: Record<string, boolean>;
  transaction?: Record<string, unknown>;
  footer?: { text?: string };
  style?: Record<string, unknown>;
  behavior?: Record<string, boolean>;
}

export interface InvoiceLineItem {
  productId: string;
  name: string;
  sku?: string;
  unit?: string;
  quantity: number;
  price: number;
  sellingPrice?: number;
  cost?: number;
  tax?: number;
  gst?: number;
  discount?: number;
  discountPercent?: number;
  lineTotal: number;
}

export interface Invoice {
  _id?: string;
  id: string;
  invoiceNumber: string;
  transactionId?: string;
  locationId: string;
  storeId?: string;
  businessId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGst?: string;

  items: InvoiceLineItem[];

  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  grandtotal?: number; // legacy alias

  paymentMode?: InvoicePaymentMode;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  status: InvoiceStatus;

  cashier?: string;
  cashierName?: string;
  receiptTemplateId?: string;
  receiptTemplate?: InvoiceReceiptTemplate;
  receiptSnapshot?: {
    businessName?: string;
    storeId?: string;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeGstin?: string;
    cashierName?: string;
    cashierUsername?: string;
    capturedAt?: string;
  };
  notes?: string;
  isArchived?: boolean;
  voidedAt?: string;
  createdAt: string;
  updatedAt?: string;
  date?: string;
}

export interface InvoicesResponse {
  success: boolean;
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  requestId?: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  locationId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface InvoiceSummaryMetrics {
  totalInvoices: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  averageTicket: number;
}
