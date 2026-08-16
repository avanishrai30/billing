import { queryKeys } from '../../lib/query/keys';
import { inventoryQueryKeys } from '../../features/inventory/hooks';
import { invoiceQueryKeys } from '../../features/invoices/hooks';
import { customerQueryKeys } from '../../features/customers/hooks';
import { supplierQueryKeys } from '../../features/suppliers/hooks';
import { businessQueryKeys } from '../../features/businesses/hooks';
import { storeQueryKeys } from '../../features/stores/hooks';

describe('Store Scope Query Key Isolation & Anti-Collision Suite', () => {
  it('1. Store-sensitive query keys produce distinct cache identities per store scope', () => {
    // Dashboard
    const dashKeyAll = queryKeys.dashboardMetrics('all');
    const dashKeyStore1 = queryKeys.dashboardMetrics('store-1');
    const dashKeyStore2 = queryKeys.dashboardMetrics('store-2');

    expect(dashKeyStore1).not.toEqual(dashKeyStore2);
    expect(dashKeyStore1).not.toEqual(dashKeyAll);
    expect(dashKeyStore1).toEqual(['dashboard-metrics', 'store-1']);

    // Inventory Balances
    const invKeyAll = inventoryQueryKeys.balances('all');
    const invKeyStore1 = inventoryQueryKeys.balances('store-1');
    const invKeyStore2 = inventoryQueryKeys.balances('store-2');

    expect(invKeyStore1).not.toEqual(invKeyStore2);
    expect(invKeyStore1).not.toEqual(invKeyAll);
    expect(invKeyStore1).toEqual(['inventory', 'balances', 'store-1']);

    // Inventory Summary
    const invSummaryStore1 = inventoryQueryKeys.summary('store-1');
    const invSummaryStore2 = inventoryQueryKeys.summary('store-2');
    expect(invSummaryStore1).not.toEqual(invSummaryStore2);

    // Invoices List
    const invListStore1 = invoiceQueryKeys.list({ locationId: 'store-1', page: 1, limit: 50 });
    const invListStore2 = invoiceQueryKeys.list({ locationId: 'store-2', page: 1, limit: 50 });
    expect(invListStore1).not.toEqual(invListStore2);

    // Purchases List
    const purListStore1 = queryKeys.purchases({ locationId: 'store-1', page: 1, limit: 50 });
    const purListStore2 = queryKeys.purchases({ locationId: 'store-2', page: 1, limit: 50 });
    expect(purListStore1).not.toEqual(purListStore2);
  });

  it('2. Tenant-wide / Global query keys remain unpolluted by store scope', () => {
    // Customers remain global
    const custKey = customerQueryKeys.list();
    expect(custKey).toEqual(['customers', 'list']);

    // Suppliers remain global
    const supKey = supplierQueryKeys.list();
    expect(supKey).toEqual(['suppliers', 'list']);

    // Businesses remain global
    const bizKey = businessQueryKeys.list();
    expect(bizKey).toEqual(['businesses', 'list']);

    // Stores Directory remains global
    const storeListKey = storeQueryKeys.list();
    expect(storeListKey).toEqual(['stores', 'list']);
  });
});
