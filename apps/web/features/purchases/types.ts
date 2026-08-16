/**
 * Authoritative Purchase & Procurement Types
 * Backend Source: modules/purchases.js
 */

export interface PurchaseItem {
  id?: string;
  productId?: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsn?: string;
  quantity: number;
  unit: string;
  cost: number; // Purchase rate / unit cost
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number; // e.g. 0, 5, 12, 18, 28
  taxableValue: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseTransport {
  enabled: boolean;
  transporter?: string;
  mode?: 'ROAD' | 'RAIL' | 'AIR' | 'SHIP' | 'COURIER' | string;
  docketNumber?: string;
  transportDate?: string;
  charge: number;
  taxRate: number; // GST rate on freight
  taxAmount: number;
  paymentStatus?: 'PAID' | 'TO_PAY' | 'PENDING' | string;
  notes?: string;
}

export interface PurchaseTotals {
  goodsSubtotal: number;
  itemDiscountTotal: number;
  goodsTaxable: number;
  goodsGstTotal: number;
  freightCharge: number;
  freightGst: number;
  otherCharges: number;
  grandTotal: number;
}

export interface PurchaseDoc {
  _id?: string;
  id: string;
  purchaseId?: string;
  transactionId?: string;
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string; // Supplier Bill / Invoice number
  purchaseDate: string;
  locationId: string;
  storeId?: string;
  storeName?: string;
  reference?: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  notes?: string;
  items: PurchaseItem[];
  transport?: PurchaseTransport;
  subtotal: number;
  taxAmount: number;
  shipping?: number;
  otherCharges?: number;
  grandTotal: number;
  status: 'RECEIVED' | 'PENDING' | 'ORDERED' | 'VOIDED';
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  voidedAt?: string;
}

export interface PurchasePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PurchasesListResponse {
  success: boolean;
  purchases: PurchaseDoc[];
  pagination: PurchasePagination;
  requestId?: string;
}

export interface PurchaseFilterParams {
  [key: string]: string | number | boolean | null | undefined;
  page?: number;
  limit?: number;
  skip?: number;
  supplierId?: string;
  status?: string;
  locationId?: string;
  storeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
