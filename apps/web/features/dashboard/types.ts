/**
 * Authoritative Dashboard Data Types
 * Backend Source: modules/dashboard.js (GET /api/v1/dashboard/metrics)
 */

export interface DashboardMetrics {
  totalSales: number;
  netProfit: number;
  totalPurchases: number;
  franchiseEarnings: number;
  stockAssetValuationCost: number;
  stockAssetValuationRetail: number;
  totalProducts: number;
  ownProducts: number;
  externalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoriesCount: number;
  brandsCount: number;
  suppliersCount: number;
  expiryWarningsCount: number;
  invoiceCount: number;
  purchaseCount: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  reorder: number;
  cost: number;
  price: number;
  unit: string;
  image: string | null;
}

export interface RecentInvoice {
  _id?: string;
  id?: string;
  invoiceNumber?: string;
  invoicenumber?: string;
  grandTotal?: number;
  grandtotal?: number;
  status?: string;
  customerName?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface RecentPurchase {
  _id?: string;
  id?: string;
  purchaseNumber?: string;
  purchasenumber?: string;
  supplierName?: string;
  grandTotal?: number;
  grandtotal?: number;
  total?: number;
  status?: string;
  createdAt: string;
}

export interface DashboardMetricsResponse {
  success: boolean;
  metrics: DashboardMetrics;
  lowStockWatchlist: LowStockItem[];
  recentInvoices: RecentInvoice[];
  recentPurchases: RecentPurchase[];
  activeStoreId: string;
}
