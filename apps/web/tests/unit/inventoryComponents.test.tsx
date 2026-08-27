import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  InventoryHeader,
  InventorySummaryCards,
  InventoryFilters,
  InventoryTable,
  InventoryDetailDrawer,
  StockTransferModal
} from '../../features/inventory/components';
import { AppProviders } from '../../providers/AppProviders';
import type {
  NetworkInventoryItem,
  CommandCenterSummary,
  CommandCenterStore
} from '../../features/inventory/types';

describe('Phase 33 Multi-Store Inventory Command Center Component Suite', () => {
  const sampleStores: CommandCenterStore[] = [
    { id: 'central-warehouse', name: 'Central Warehouse', code: 'WH-01', type: 'WAREHOUSE', locationType: 'WAREHOUSE', isHub: true, status: 'active', isWarehouse: true },
    { id: 'store-1', name: 'Store 1 — Indiranagar', code: 'ST-IND', type: 'STORE', locationType: 'STORE', isHub: false, status: 'active', isWarehouse: false },
    { id: 'store-2', name: 'Store 2 — Koramangala', code: 'ST-KOR', type: 'STORE', locationType: 'STORE', isHub: false, status: 'active', isWarehouse: false },
    { id: 'store-3', name: 'Store 3 — Whitefield', code: 'ST-WHI', type: 'STORE', locationType: 'STORE', isHub: false, status: 'active', isWarehouse: false }
  ];

  const sampleSummary: CommandCenterSummary = {
    totalProducts: 10,
    catalogProducts: 10,
    stockedProducts: 3,
    networkStock: 135,
    centralStock: 100,
    storeStock: 35,
    lowStockCount: 1,
    outOfStockCount: 0,
    expiringSoonCount: 1,
    totalValuation: 60750
  };

  const sampleItems: NetworkInventoryItem[] = [
    {
      productId: 'prod-ghee-1',
      productName: 'A2 Cow Ghee 1L',
      sku: 'AIA000002',
      barcode: 'AIA000002',
      category: 'Dairy',
      brand: 'VC Organics',
      unit: '1 litre jar',
      cost: 450,
      price: 650,
      reorderLevel: 25,
      isOrphan: false,
      networkQuantity: 135,
      networkReserved: 0,
      networkAvailable: 135,
      locationBreakdown: [
        { locationId: 'central-warehouse', locationName: 'Central Warehouse', isWarehouse: true, quantity: 100, reservedQuantity: 0, available: 100 },
        { locationId: 'store-1', locationName: 'Store 1', isWarehouse: false, quantity: 20, reservedQuantity: 0, available: 20 },
        { locationId: 'store-2', locationName: 'Store 2', isWarehouse: false, quantity: 10, reservedQuantity: 0, available: 10 },
        { locationId: 'store-3', locationName: 'Store 3', isWarehouse: false, quantity: 5, reservedQuantity: 0, available: 5 }
      ],
      batches: [
        {
          id: 'batch-001',
          lotNumber: 'LOT-2026-001',
          expiryDate: '2027-08-25T00:00:00.000Z',
          remainingQuantity: 100,
          locationId: 'central-warehouse'
        }
      ]
    },
    {
      productId: 'prod-orphan-99',
      productName: 'Orphan Item (prod-orphan-99)',
      sku: '',
      barcode: '',
      category: 'Missing Master',
      unit: 'units',
      cost: 0,
      price: 0,
      reorderLevel: 10,
      isOrphan: true,
      networkQuantity: 15,
      networkReserved: 0,
      networkAvailable: 15,
      locationBreakdown: [
        { locationId: 'store-1', locationName: 'Store 1', isWarehouse: false, quantity: 15, reservedQuantity: 0, available: 15 }
      ],
      batches: []
    }
  ];

  it('1. InventoryHeader renders location tabs for Network, Central Warehouse, and Stores with action triggers', () => {
    const handleAdjust = jest.fn();
    const handleTransfer = jest.fn();
    const handleSelectLocation = jest.fn();

    render(
      <InventoryHeader
        selectedLocation="network"
        stores={sampleStores}
        onSelectLocation={handleSelectLocation}
        canAdjust={true}
        canTransfer={true}
        onOpenAdjustment={handleAdjust}
        onOpenTransfer={handleTransfer}
        isSuperAdmin={true}
      />
    );

    expect(screen.getByText('Inventory Command Center')).toBeInTheDocument();
    expect(screen.getByText('Network Consolidated')).toBeInTheDocument();
    expect(screen.getByText('Central Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Store 1 — Indiranagar')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Central Warehouse'));
    expect(handleSelectLocation).toHaveBeenCalledWith('central-warehouse');

    fireEvent.click(screen.getByRole('button', { name: /transfer stock/i }));
    expect(handleTransfer).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /stock adjustment/i }));
    expect(handleAdjust).toHaveBeenCalledTimes(1);
  });

  it('2. InventorySummaryCards renders catalog, stocked, network, central, store, low, and expiring metrics', () => {
    render(<InventorySummaryCards summary={sampleSummary} isLoading={false} />);

    expect(screen.getByText('Catalog Products')).toBeInTheDocument();
    expect(screen.getByText('3 currently stocked')).toBeInTheDocument();
    expect(screen.getByText('Network Stock')).toBeInTheDocument();
    expect(screen.getByText('135')).toBeInTheDocument();
    expect(screen.getByText('Central Stock')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Store Stock')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
  });

  it('3. InventoryFilters triggers search, status pill selection including Expiring Soon, and reset', () => {
    const handleSearch = jest.fn();
    const handleStatus = jest.fn();
    const handleCategory = jest.fn();
    const handleClear = jest.fn();

    render(
      <InventoryFilters
        searchQuery="Ghee"
        onSearchChange={handleSearch}
        statusFilter="ALL"
        onStatusFilterChange={handleStatus}
        categoryFilter="Dairy"
        onCategoryFilterChange={handleCategory}
        categories={['Dairy', 'Grains']}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByDisplayValue('Ghee')).toBeInTheDocument();

    const expiringSoonPill = screen.getByRole('button', { name: 'Expiring Soon' });
    fireEvent.click(expiringSoonPill);
    expect(handleStatus).toHaveBeenCalledWith('EXPIRING_SOON');

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('4. InventoryTable renders Network view with Location Breakdown badges and Orphan Warning', () => {
    const handleInspect = jest.fn();
    const handleTransfer = jest.fn();
    const handleAdjust = jest.fn();

    render(
      <InventoryTable
        items={sampleItems}
        selectedLocation="network"
        stores={sampleStores}
        isLoading={false}
        canAdjust={true}
        canTransfer={true}
        onInspectItem={handleInspect}
        onAdjustItem={handleAdjust}
        onTransferItem={handleTransfer}
      />
    );

    expect(screen.getByText('A2 Cow Ghee 1L')).toBeInTheDocument();
    expect(screen.getByText('ORPHAN INVENTORY')).toBeInTheDocument();
    expect(screen.getByText('1 litre jar')).toBeInTheDocument();
    expect(screen.getByText('LOT-2026-001')).toBeInTheDocument();

    // Click row to inspect
    fireEvent.click(screen.getByText('A2 Cow Ghee 1L'));
    expect(handleInspect).toHaveBeenCalledWith(sampleItems[0]);
  });

  it('5. InventoryDetailDrawer renders stock by location breakdown and active batches', () => {
    render(
      <AppProviders>
        <InventoryDetailDrawer
          isOpen={true}
          onClose={jest.fn()}
          item={sampleItems[0]}
          canAdjust={true}
          canTransfer={true}
          onAdjustStock={jest.fn()}
          onTransferStock={jest.fn()}
        />
      </AppProviders>
    );

    expect(screen.getByText('Stock by Location Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Central Warehouse')).toBeInTheDocument();
    expect(screen.getByText('Active Product Batches & Expiry')).toBeInTheDocument();
    expect(screen.getByText('LOT: LOT-2026-001')).toBeInTheDocument();
  });

  it('6. StockTransferModal renders Live Simulation Preview with constant network total', () => {
    const handleClose = jest.fn();

    render(
      <AppProviders>
        <StockTransferModal
          isOpen={true}
          onClose={handleClose}
          selectedItem={sampleItems[0]}
          items={sampleItems}
          stores={sampleStores}
          defaultLocationId="central-warehouse"
        />
      </AppProviders>
    );

    expect(screen.getByText(/inter-store stock transfer/i)).toBeInTheDocument();
    expect(screen.getByText(/live transfer simulation preview/i)).toBeInTheDocument();
    expect(screen.getByText('Network Total')).toBeInTheDocument();
  });
});
