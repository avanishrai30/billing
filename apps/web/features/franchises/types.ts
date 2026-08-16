export type FranchiseStatus = 'active' | 'inactive' | 'suspended';
export type SupplyOrderPaymentStatus = 'paid' | 'pending' | 'credit' | 'unpaid';

export interface FranchiseSupplyListItem {
  productId: string;
  name: string;
  supplyPrice: number;
  retailPrice: number;
  isCustom?: boolean;
}

export interface FranchiseDoc {
  id: string;
  name: string;
  location: string;
  owner: string;
  phone?: string;
  email?: string;
  gstin?: string;
  status: FranchiseStatus;
  supplyList?: FranchiseSupplyListItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface FranchiseFormPayload {
  id?: string;
  name: string;
  location: string;
  owner: string;
  phone?: string;
  email?: string;
  gstin?: string;
  status?: FranchiseStatus;
  supplyList?: FranchiseSupplyListItem[];
}

export interface FranchiseSupplyOrderItem {
  productId: string;
  name: string;
  qty: number;
  supplyPrice: number;
  gst: number;
  isCustom?: boolean;
}

export interface FranchiseSupplyOrderDoc {
  id: string;
  franchiseId: string;
  date?: string;
  items: FranchiseSupplyOrderItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  paymentStatus: SupplyOrderPaymentStatus;
  notes?: string;
  createdAt: string;
}

export interface SupplyOrderFormPayload {
  franchiseId: string;
  date?: string;
  items: FranchiseSupplyOrderItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  paymentStatus: SupplyOrderPaymentStatus;
  notes?: string;
}

export interface FranchiseSummaryMetrics {
  totalFranchises: number;
  activeFranchises: number;
  totalSupplyOrders: number;
  totalEarnings: number;
  pendingReceivables: number;
}
