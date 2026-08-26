import type { Page, Route } from '@playwright/test';

export const architectureUser = {
  id: 'usr-superadmin',
  name: 'Super Admin',
  username: 'superadmin',
  role: 'SUPER ADMIN',
  category: 'super admin',
  assignedStoreId: 'all',
  assignedStores: ['all'],
  permissions: ['*'],
  status: 'active'
};

export const architectureStores = [
  { id: 'central-warehouse', name: 'Central Warehouse', code: 'WH-01', locationType: 'WAREHOUSE', isHub: true, isWarehouse: true, status: 'active' },
  { id: 'store-1', name: 'Store 1', code: 'ST-01', locationType: 'STORE', isHub: false, isWarehouse: false, status: 'active' },
  { id: 'store-2', name: 'Store 2', code: 'ST-02', locationType: 'STORE', isHub: false, isWarehouse: false, status: 'active' }
];

export const architectureCommandCenterData = {
  success: true,
  stores: architectureStores,
  networkBalances: [
    {
      productId: 'prod-a2-ghee',
      productName: 'A2 Cow Ghee',
      sku: 'AIA000002',
      barcode: 'AIA000002',
      brand: 'VC Organics',
      category: 'Dairy',
      unit: 'jar',
      cost: 450,
      price: 650,
      reorderLevel: 15,
      isOrphan: false,
      networkQuantity: 112,
      networkReserved: 0,
      networkAvailable: 112,
      locationBreakdown: [
        { locationId: 'central-warehouse', locationName: 'Central Warehouse', locationType: 'WAREHOUSE', isWarehouse: true, isHub: true, quantity: 100, reservedQuantity: 0, available: 100, reorderLevel: 15, targetStock: 40, suggestedTransfer: 0 },
        { locationId: 'store-1', locationName: 'Store 1', locationType: 'STORE', isWarehouse: false, isHub: false, quantity: 8, reservedQuantity: 0, available: 8, reorderLevel: 15, targetStock: 40, suggestedTransfer: 32 },
        { locationId: 'store-2', locationName: 'Store 2', locationType: 'STORE', isWarehouse: false, isHub: false, quantity: 4, reservedQuantity: 0, available: 4, reorderLevel: 15, targetStock: 40, suggestedTransfer: 36 }
      ],
      batches: [
        { id: 'batch-a2-lot1', lotNumber: 'LOT-A2-001', expiryDate: '2027-08-25T00:00:00.000Z', remainingQuantity: 100, locationId: 'central-warehouse' }
      ],
      replenishmentRequired: true,
      replenishmentSuggestions: [
        { productId: 'prod-a2-ghee', locationId: 'store-1', locationName: 'Store 1', currentStock: 8, reorderLevel: 15, targetStock: 40, suggestedTransfer: 32 },
        { productId: 'prod-a2-ghee', locationId: 'store-2', locationName: 'Store 2', currentStock: 4, reorderLevel: 15, targetStock: 40, suggestedTransfer: 36 }
      ]
    }
  ],
  summary: {
    totalProducts: 1,
    catalogProducts: 1,
    stockedProducts: 1,
    networkStock: 112,
    centralStock: 100,
    storeStock: 12,
    lowStockCount: 1,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    replenishmentRequiredCount: 1,
    totalValuation: 50400
  }
};

export async function installArchitectureRoutes(page: Page, user = architectureUser) {
  await page.addInitScript((userData) => {
    localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
    localStorage.setItem('aiavro_logged_in_user', JSON.stringify(userData));
    localStorage.setItem('aiavro_selected_store_id', userData.assignedStoreId === 'all' ? 'all' : userData.assignedStoreId);
  }, user);

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/verify') || url.includes('/auth/me') || url.includes('/users/me')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user }) });
    }
    if (url.includes('/rbac/me/permissions')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, effectivePermissions: ['*'] }) });
    }
    if (url.includes('/public/settings') || url.includes('/settings/public')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, title: 'VC Organic Billing', settings: {} }) });
    }
    if (url.includes('/stores')) {
      const stores = user.assignedStoreId === 'all'
        ? architectureStores
        : architectureStores.filter(store => (user.assignedStores || []).includes(store.id));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stores) });
    }
    if (url.includes('/inventory/command-center')) {
      const body = user.assignedStoreId === 'all'
        ? architectureCommandCenterData
        : {
          ...architectureCommandCenterData,
          stores: architectureStores.filter(store => (user.assignedStores || []).includes(store.id)),
          networkBalances: architectureCommandCenterData.networkBalances.map(item => ({
            ...item,
            networkQuantity: 8,
            locationBreakdown: item.locationBreakdown.filter(location => (user.assignedStores || []).includes(location.locationId))
          }))
        };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    if (url.includes('/inventory/transfer') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Stock transfer completed successfully',
          referenceId: 'tf-e2e-1',
          stockTransfer: { id: 'trf-e2e-1', status: 'COMPLETED', fromLocationId: 'central-warehouse', toLocationId: 'store-1' }
        })
      });
    }
    if (url.includes('/inventory/logs')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [], pagination: { limit: 50, nextCursor: null } }) });
    }
    if (url.includes('/inventory')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, inventory: [] }) });
    }
    if (url.includes('/dashboard/metrics')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, metrics: {}, lowStockWatchlist: [], recentInvoices: [], recentPurchases: [] }) });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}
