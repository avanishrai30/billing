import { z } from 'zod';

export const DashboardMetricsSchema = z.object({
  totalSales: z.number().default(0),
  netProfit: z.number().default(0),
  totalPurchases: z.number().default(0),
  franchiseEarnings: z.number().default(0),
  stockAssetValuationCost: z.number().default(0),
  stockAssetValuationRetail: z.number().default(0),
  totalProducts: z.number().default(0),
  ownProducts: z.number().default(0),
  externalProducts: z.number().default(0),
  lowStockCount: z.number().default(0),
  outOfStockCount: z.number().default(0),
  categoriesCount: z.number().default(0),
  brandsCount: z.number().default(1),
  suppliersCount: z.number().default(0),
  expiryWarningsCount: z.number().default(0),
  invoiceCount: z.number().default(0),
  purchaseCount: z.number().default(0)
});

export const LowStockItemSchema = z.object({
  id: z.string().optional().default(''),
  name: z.string().default('Unnamed SKU'),
  category: z.string().default('General'),
  sku: z.string().default(''),
  stock: z.number().default(0),
  reorder: z.number().default(10),
  cost: z.number().default(0),
  price: z.number().default(0),
  unit: z.string().default('unit'),
  image: z.string().nullable().optional()
});

export const RecentInvoiceSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoicenumber: z.string().optional(),
  grandTotal: z.number().optional(),
  grandtotal: z.number().optional(),
  status: z.string().optional().default('completed'),
  customerName: z.string().optional(),
  paymentMethod: z.string().optional(),
  createdAt: z.string().default(() => new Date().toISOString())
});

export const RecentPurchaseSchema = z.object({
  _id: z.string().optional(),
  id: z.string().optional(),
  purchaseNumber: z.string().optional(),
  purchasenumber: z.string().optional(),
  supplierName: z.string().optional().default('Standard Supplier'),
  grandTotal: z.number().optional(),
  grandtotal: z.number().optional(),
  total: z.number().optional(),
  status: z.string().optional().default('RECEIVED'),
  createdAt: z.string().default(() => new Date().toISOString())
});

export const DashboardMetricsResponseSchema = z.object({
  success: z.boolean().default(true),
  metrics: DashboardMetricsSchema,
  lowStockWatchlist: z.array(LowStockItemSchema).default([]),
  recentInvoices: z.array(RecentInvoiceSchema).default([]),
  recentPurchases: z.array(RecentPurchaseSchema).default([]),
  activeStoreId: z.string().default('all')
});
