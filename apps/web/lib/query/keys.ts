/**
 * Centralized TanStack Query Key Factory
 * Source: docs/00_MASTER_PLAN.md & docs/02_FRONTEND_ARCHITECTURE.md
 */

export const queryKeys = {
  // Public & Health
  health: () => ['health'] as const,
  publicSettings: () => ['public-settings'] as const,

  // Auth & Profile
  authUser: () => ['auth', 'user'] as const,
  users: (filters?: Record<string, any>) => ['users', filters] as const,
  user: (id: string) => ['users', id] as const,

  // Products
  products: (filters?: Record<string, any>) => ['products', filters] as const,
  product: (id: string) => ['products', id] as const,
  productBySku: (sku: string) => ['products', 'sku', sku] as const,
  productByBarcode: (barcode: string) => ['products', 'barcode', barcode] as const,

  // Inventory
  inventory: (locationId?: string, productId?: string) => ['inventory', locationId, productId] as const,
  inventorySummary: (locationId?: string) => ['inventory-summary', locationId] as const,
  inventoryLogs: (params?: Record<string, any>) => ['inventory-logs', params] as const,

  // Invoices & POS
  invoices: (filters?: Record<string, any>) => ['invoices', filters] as const,
  invoice: (id: string) => ['invoices', id] as const,

  // Purchases
  purchases: (filters?: Record<string, any>) => ['purchases', filters] as const,
  purchase: (id: string) => ['purchases', id] as const,

  // Dashboard & Analytics
  dashboardMetrics: (storeId?: string) => ['dashboard-metrics', storeId] as const,

  // Master Data
  stores: () => ['stores'] as const,
  store: (id: string) => ['stores', id] as const,
  businesses: () => ['businesses'] as const,
  customers: (filters?: Record<string, any>) => ['customers', filters] as const,
  suppliers: (filters?: Record<string, any>) => ['suppliers', filters] as const,
  franchises: () => ['franchises'] as const,
  rolePermissions: () => ['role-permissions'] as const,
  auditLogs: (filters?: Record<string, any>) => ['audit-logs', filters] as const
};
