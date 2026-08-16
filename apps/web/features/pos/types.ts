/**
 * Authoritative POS Terminal Data Models & Contracts
 * Backend Sources: modules/billing.js, modules/products.js, modules/customers.js
 */

export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK';

export interface POSProduct {
  _id?: string;
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  sellingPrice?: number;
  cost?: number;
  purchasePrice?: number;
  category?: string;
  brand?: string;
  unit?: string;
  gst?: number;
  tax?: number;
  taxRate?: number;
  image?: string;
  imageUrl?: string;
  status?: string;
  sellingMode?: string;
  stock?: number;
  inventory?: number;
  isArchived?: boolean;
}

export interface POSCartItem {
  productId: string;
  name: string;
  sku?: string;
  unit: string;
  price: number;
  cost: number;
  gst: number;
  quantity: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  taxAmount: number;
  lineTotal: number;
  stockAvailable?: number;
}

export interface POSTotals {
  subtotal: number;
  itemDiscountTotal: number;
  cartDiscount: number;
  taxableTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export interface POSCustomer {
  _id?: string;
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints?: number;
  outstandingBalance?: number;
}

export interface POSCheckoutItem {
  productId: string;
  variantId?: string | null;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  sellingPrice: number;
  cost: number;
  tax: number;
  gst: number;
  lineTotal: number;
}

export interface POSCheckoutPayload {
  transactionId?: string;
  invoiceNumber?: string;
  locationId: string;
  storeId?: string;
  businessId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  paymentMethod?: PaymentMode;
  items: POSCheckoutItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  notes?: string;
}

export interface POSInvoiceDoc {
  _id?: string;
  id: string;
  invoiceNumber: string;
  transactionId?: string;
  locationId: string;
  storeId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  items: POSCheckoutItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: 'COMPLETED' | 'PENDING' | 'VOIDED';
  createdAt: string;
  updatedAt?: string;
}

export interface POSInvoiceResponse {
  success: boolean;
  invoice: POSInvoiceDoc;
  duplicate?: boolean;
  message?: string;
  requestId?: string;
}
