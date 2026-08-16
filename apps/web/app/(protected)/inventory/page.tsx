'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useInventorySummaryQuery,
  useInventoryBalancesQuery
} from '../../../features/inventory/hooks';
import { usePOSProductsQuery, usePOSStoresQuery } from '../../../features/pos/hooks';
import {
  InventoryHeader,
  InventorySummaryCards,
  InventoryFilters,
  InventoryTable,
  StockAdjustmentModal,
  StockTransferModal,
  InventoryLedgerDrawer
} from '../../../features/inventory/components';
import { deriveStockStatus } from '../../../features/inventory/calculations';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import type { InventoryBalance, StockStatus } from '../../../features/inventory/types';

export default function InventoryPage() {
  const { user, hasPermission } = useAuth();
  const { activeStoreId } = useStoreScope();

  const isSuperAdmin = user?.role === 'SUPER ADMIN' || user?.category === 'super admin';
  const assignedStoreId = user?.assignedStoreId && user.assignedStoreId !== 'all'
    ? user.assignedStoreId
    : (activeStoreId || 'all');

  const [selectedLocation, setSelectedLocation] = useState<string>(assignedStoreId);

  // Sync with global store switch
  React.useEffect(() => {
    if (activeStoreId) {
      setSelectedLocation(activeStoreId);
    }
  }, [activeStoreId]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal / Drawer state
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<InventoryBalance | null>(null);

  // Queries
  const { data: summary, isLoading: isLoadingSummary } = useInventorySummaryQuery(selectedLocation);
  const { data: rawBalances = [], isLoading: isLoadingBalances } = useInventoryBalancesQuery(selectedLocation);
  const { data: products = [], isLoading: isLoadingProducts } = usePOSProductsQuery();
  const { data: stores = [] } = usePOSStoresQuery();

  // Permissions
  const canAdjust = hasPermission('inventory.adjust');
  const canTransfer = hasPermission('inventory.transfer');

  // Store options
  const storeOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Store Outlets' }];
    for (const s of stores) {
      opts.push({ value: s.id, label: s.name });
    }
    return opts;
  }, [stores]);

  // Product Map for metadata joining
  const productMap = useMemo(() => {
    const map = new Map<string, (typeof products)[0]>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Joined Balances with Catalog Metadata
  const joinedBalances: InventoryBalance[] = useMemo(() => {
    return rawBalances.map((b) => {
      const prod = productMap.get(b.productId);
      return {
        ...b,
        productName: prod?.name || (b as any).productName || (b as any).name || b.productId,
        sku: prod?.sku || '',
        barcode: prod?.barcode || '',
        unit: prod?.unit || 'units',
        category: prod?.category || 'General',
        brand: prod?.brand || '',
        cost: Number(prod?.purchasePrice ?? prod?.cost ?? 0),
        price: Number(prod?.sellingPrice ?? prod?.price ?? 0),
        reorderLevel: b.reorderLevel || prod?.reorderLevel || 10
      };
    });
  }, [rawBalances, productMap]);

  // Category List
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    }
    return Array.from(set).sort();
  }, [products]);

  // Filtered Balances
  const filteredBalances = useMemo(() => {
    return joinedBalances.filter((item) => {
      // Status Filter
      if (statusFilter !== 'ALL') {
        const itemStatus = deriveStockStatus(item.quantity, item.reorderLevel);
        if (itemStatus !== statusFilter) return false;
      }

      // Category Filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.productName || '').toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchBarcode = (item.barcode || '').toLowerCase().includes(q);
        return matchName || matchSku || matchBarcode;
      }

      return true;
    });
  }, [joinedBalances, statusFilter, categoryFilter, searchQuery]);

  const isFiltered = searchQuery !== '' || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  const handleOpenAdjustment = (item?: InventoryBalance) => {
    setActiveItem(item || null);
    setIsAdjustmentOpen(true);
  };

  const handleOpenTransfer = (item?: InventoryBalance) => {
    setActiveItem(item || null);
    setIsTransferOpen(true);
  };

  const handleViewLedger = (item: InventoryBalance) => {
    setActiveItem(item);
    setIsLedgerOpen(true);
  };

  const productSelectorList = useMemo(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      cost: Number(p.purchasePrice ?? p.cost ?? 0)
    }));
  }, [products]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <InventoryHeader
        selectedLocation={selectedLocation}
        storeOptions={storeOptions}
        onSelectLocation={setSelectedLocation}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        onOpenAdjustment={() => handleOpenAdjustment()}
        onOpenTransfer={() => handleOpenTransfer()}
      />

      {/* Summary Metric Cards */}
      <InventorySummaryCards
        summary={summary}
        isLoading={isLoadingSummary}
      />

      {/* Filter Controls */}
      <InventoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={availableCategories}
        onClearFilters={handleClearFilters}
      />

      {/* Main Inventory Table */}
      <InventoryTable
        balances={filteredBalances}
        isLoading={isLoadingBalances || isLoadingProducts}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        onViewLedger={handleViewLedger}
        onAdjustStock={handleOpenAdjustment}
        onTransferStock={handleOpenTransfer}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        selectedItem={activeItem}
        products={productSelectorList}
        storeOptions={storeOptions.filter((s) => s.value !== 'all')}
        defaultLocationId={selectedLocation === 'all' ? (stores[0]?.id || 'store-1') : selectedLocation}
      />

      {/* Inter-Store Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        selectedItem={activeItem}
        products={productSelectorList}
        storeOptions={storeOptions}
        defaultLocationId={selectedLocation === 'all' ? (stores[0]?.id || 'store-1') : selectedLocation}
      />

      {/* Immutable Ledger Drawer */}
      <InventoryLedgerDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        item={activeItem}
      />
    </div>
  );
}
