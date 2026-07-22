// Shared types for AIavro Billing System v2

export type UserRole = 'admin' | 'employee' | 'auditor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Business {
  id: string;
  name: string;
  subtitle?: string;
  owner?: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  accountNo?: string;
  ifsc?: string;
  upiId?: string;
  terms?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  unit: string; // e.g. "kg", "pcs", "litre"
  type: 'own' | 'external';
  costPrice: number;
  salePrice: number;
  stockQty: number;
  minStockAlert: number;
  supplierId?: string;
  expiryDate?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  gstRate: number;
  taxAmount: number;
  discount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  customerId?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'split';
  status: 'paid' | 'pending' | 'void';
  cashierId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  email?: string;
  contact?: string;
  gst?: string;
}

export interface PurchaseItem {
  productId: string;
  costPrice: number;
  quantity: number;
  gstRate: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  businessId: string;
  items: PurchaseItem[];
  grandTotal: number;
  purchaseDate: string;
  createdAt: string;
}
