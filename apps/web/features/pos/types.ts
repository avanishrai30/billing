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
  reorderLevel?: number;
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
  sku?: string;
  barcode?: string;
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
  amountPaid?: number;
  changeDue?: number;
  receiptTemplateId?: string;
  receiptTemplate?: ReceiptTemplate;
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
  amountPaid?: number;
  changeDue?: number;
  receiptTemplateId?: string;
  receiptTemplate?: ReceiptTemplate;
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
  items: POSCheckoutItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  status: 'COMPLETED' | 'PENDING' | 'VOIDED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  returnStatus?: 'RETURNED' | 'PARTIALLY_RETURNED';
  returnsCount?: number;
  hasReturnableItems?: boolean;
  totalReturnableQty?: number;
  exchangeReference?: {
    originalInvoiceNumber: string;
    returnId: string;
    returnCredit: number;
    netDifference: number;
  };
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

export interface POSReturnItem {
  productId: string;
  variantId?: string | null;
  name: string;
  unit: string;
  quantity: number;
  soldQuantity?: number;
  alreadyReturnedQuantity?: number;
  returnableQuantity?: number;
  price: number;
  sellingPrice: number;
  cost?: number;
  tax?: number;
  gst?: number;
  lineTotal: number;
}

export interface POSReturnPayload {
  returnedItems: Array<{
    productId: string;
    quantity: number;
  }>;
  refundMethod?: PaymentMode | 'ORIGINAL_PAYMENT' | 'STORE_CREDIT';
  reason?: string;
  notes?: string;
}

export interface POSReturnDoc {
  returnId: string;
  id: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  exchangeInvoiceNumber?: string;
  isExchange?: boolean;
  storeId: string;
  locationId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  returnedItems: POSReturnItem[];
  refundAmount: number;
  refundMethod: string;
  reason?: string;
  notes?: string;
  cashier: string;
  createdBy: string;
  createdAt: string;
  timestamp?: string;
}

export interface POSReturnResponse {
  success: boolean;
  return: POSReturnDoc;
  message?: string;
}

export interface POSExchangePayload {
  returnedItems: Array<{
    productId: string;
    quantity: number;
  }>;
  replacementItems: Array<{
    productId: string;
    quantity: number;
    price: number;
    cost?: number;
    gst?: number;
    name?: string;
    unit?: string;
  }>;
  paymentMode?: PaymentMode;
  reason?: string;
  notes?: string;
}

export interface POSExchangeResponse {
  success: boolean;
  exchangeId: string;
  return: POSReturnDoc;
  replacementInvoice: POSInvoiceDoc;
  netDifference: number;
  message?: string;
}

export interface POSReceiptOptions {
  autoPrint?: boolean;
  paperWidthMm?: number; // 58 or 80
  showLogo?: boolean;
  showGstin?: boolean;
  showCustomer?: boolean;
  showTerms?: boolean;
}

export type ReceiptTemplatePreset = 'classic' | 'vc-organic-signature' | 'compact';
export type ReceiptBarcodeType = 'CODE128' | 'QR';
export type ReceiptAlignment = 'left' | 'center' | 'right';
export type ReceiptDensity = 'compact' | 'standard' | 'spacious';

export interface ReceiptTemplate {
  id: string;
  name: string;
  preset: ReceiptTemplatePreset;
  paperWidthMm: 58 | 80;
  header: {
    showLogo: boolean;
    showBusinessName: boolean;
    showStoreName: boolean;
    showAddress: boolean;
    showGstin: boolean;
    showContact: boolean;
    showCashier: boolean;
    showDateTime: boolean;
  };
  transaction: {
    showInvoiceNumber: boolean;
    showInvoiceBarcode: boolean;
    barcodeType: ReceiptBarcodeType;
    showItemSku: boolean;
    showQuantity: boolean;
    showRate: boolean;
    showDiscount: boolean;
    showTax: boolean;
  };
  footer: {
    text: string;
  };
  style: {
    alignment: ReceiptAlignment;
    density: ReceiptDensity;
    logoSize: 'sm' | 'md' | 'lg';
    businessNameBold: boolean;
    businessNameScale: number;
  };
  behavior: {
    autoPrintAfterSale: boolean;
  };
}

export interface POSReceiptData {
  businessName: string;
  businessLogo?: string | null;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeGstin?: string;
  receiptNumber: string;
  transactionId?: string;
  date: string;
  cashierName: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    taxAmount?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  amountPaid: number;
  changeDue: number;
  termsAndConditions?: string;
}
