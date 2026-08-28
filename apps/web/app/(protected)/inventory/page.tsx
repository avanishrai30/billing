'use client';

import React, { useState, useMemo } from 'react';
import { useAuthorization } from '../../../hooks/useAuthorization';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useInventoryCommandCenterQuery } from '../../../features/inventory/hooks';
import {
  InventoryHeader,
  InventorySummaryCards,
  InventoryFilters,
  InventoryTable,
  InventoryDetailDrawer,
  StockAdjustmentModal,
  StockTransferModal,
  InventoryLedgerDrawer
} from '../../../features/inventory/components';
import { deriveStockStatus } from '../../../features/inventory/calculations';
import type {
  NetworkInventoryItem,
  StockStatus,
  CommandCenterStore
} from '../../../features/inventory/types';
import { AccessDeniedState } from '../../../components/ui';

export default function InventoryPage() {
  const { user, hasPermission, isSuperAdmin } = useAuthorization();
  const { activeStoreId } = useStoreScope();

  // Selected Location: 'network' (for super admin) or specific store ID
  const defaultLocation = useMemo(() => {
    if (activeStoreId && activeStoreId !== 'all') {
      return activeStoreId;
    }
    if (!isSuperAdmin && user?.assignedStoreId && user.assignedStoreId !== 'all') {
      return user.assignedStoreId;
    }
    return 'network';
  }, [activeStoreId, isSuperAdmin, user]);

  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocation);

  // Queries (scoped by selectedLocation to guarantee store cache isolation)
  const { data: commandCenterData, isLoading: isLoadingCommandCenter } = useInventoryCommandCenterQuery(selectedLocation);

  const stores: CommandCenterStore[] = useMemo(() => {
    return commandCenterData?.stores || [];
  }, [commandCenterData]);

  const networkBalances: NetworkInventoryItem[] = useMemo(() => {
    return commandCenterData?.networkBalances || [];
  }, [commandCenterData]);

  // Sync selected location when topbar activeStoreId or user store changes.
  React.useEffect(() => {
    if (activeStoreId && activeStoreId !== 'all') {
      setSelectedLocation(activeStoreId);
    } else if (activeStoreId === 'all') {
      setSelectedLocation('network');
    }
  }, [activeStoreId]);

  // Ensure store-restricted users fallback to permitted stores if 'network' is not accessible
  React.useEffect(() => {
    if (!isSuperAdmin && selectedLocation === 'network' && stores.length > 0) {
      const fallbackStore = stores.find((s) => s.id === user?.assignedStoreId) || stores[0];
      if (fallbackStore) {
        setSelectedLocation(fallbackStore.id);
      }
    }
  }, [isSuperAdmin, selectedLocation, stores, user]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal / Drawer state
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<NetworkInventoryItem | null>(null);

  // Permissions
  const canView = hasPermission('inventory.view');
  const canAdjust = hasPermission('inventory.adjust');
  const canTransfer = hasPermission('inventory.transfer');

  // Dynamic Location/Network Summary
  const summary = useMemo(() => {
    if (!commandCenterData?.summary) return undefined;
    const base = commandCenterData.summary;
    if (selectedLocation === 'network') {
      return base;
    }

    const thirtyDaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let locationStock = 0;
    let stockedProducts = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiringSoonCount = 0;
    let locationValuation = 0;

    for (const item of networkBalances) {
      if (item.isOrphan) continue;
      const loc = item.locationBreakdown.find((l) => l.locationId === selectedLocation);
      const q = loc ? loc.quantity : 0;
      const avail = loc ? loc.available : 0;
      const batches = (item.batches || []).filter((b) => b.locationId === selectedLocation);

      locationStock += q;
      locationValuation += (q * (item.cost || 0));

      if (avail > 0) {
        stockedProducts++;
      }
      if (avail <= 0) {
        outOfStockCount++;
      } else if (avail <= (item.reorderLevel || 10)) {
        lowStockCount++;
      }

      if (batches.some((b) => b.expiryDate && b.expiryDate <= thirtyDaysIso && b.remainingQuantity > 0)) {
        expiringSoonCount++;
      }
    }

    return {
      ...base,
      catalogProducts: base.catalogProducts ?? base.totalProducts,
      stockedProducts,
      networkStock: base.networkStock,
      centralStock: base.centralStock,
      storeStock: base.storeStock,
      lowStockCount,
      outOfStockCount,
      expiringSoonCount,
      totalValuation: Math.round(locationValuation * 100) / 100
    };
  }, [commandCenterData, selectedLocation, networkBalances]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Inventory Ledger Restricted"
        message="Your role permissions do not authorize viewing stock inventory balances or executing warehouse transfers."
        requiredPermission="inventory.view"
      />
    );
  }

  // Extract distinct categories from catalog
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of networkBalances) {
      if (p.category && p.category.trim() && p.category !== 'Missing Master') {
        set.add(p.category.trim());
      }
    }
    return Array.from(set).sort();
  }, [networkBalances]);

  // Check if current view is strictly store-scoped (via topbar store selector or user assignment)
  const isStoreScopedMode = Boolean(
    (activeStoreId && activeStoreId !== 'all') ||
    (!isSuperAdmin && user?.assignedStoreId && user.assignedStoreId !== 'all')
  );

  // Filtered Items based on active tab and search/filter criteria
  // All active Product Master items remain visible for any selected location (LEFT JOIN overlay)
  const filteredItems = useMemo(() => {
    const thirtyDaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const isNetworkView = selectedLocation === 'network' || selectedLocation === 'all';
    const isWarehouseView = stores.some((s) => s.id === selectedLocation && s.isWarehouse);

    return networkBalances.filter((item) => {
      // 1. Determine location quantity and batches
      let onHand = item.networkQuantity;
      let available = item.networkAvailable;
      let locationBatches = item.batches || [];

      if (!isNetworkView) {
        const loc = item.locationBreakdown.find((l) => l.locationId === selectedLocation);
        onHand = loc ? loc.quantity : 0;
        available = loc ? loc.available : 0;
        locationBatches = (item.batches || []).filter((b) => b.locationId === selectedLocation);

        // Store-level isolation: When viewing a retail store (not Central Warehouse Hub and not Network Consolidated),
        // products that have zero stock here but are stocked in other stores
        // must not leak across store boundaries into this store's inventory view.
        if (!isWarehouseView && onHand <= 0) {
          const isStockedInOtherStores = item.locationBreakdown.some(
            (l) => l.locationId !== selectedLocation && l.quantity > 0
          );
          if (isStockedInOtherStores) {
            return false;
          }
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ORPHAN') {
          if (!item.isOrphan) return false;
        } else if (item.isOrphan) {
          return false;
        }

        const baseStatus = deriveStockStatus(available, item.reorderLevel);
        const hasExpiringBatch = locationBatches.some(
          (b) => b.expiryDate && b.expiryDate <= thirtyDaysIso && b.remainingQuantity > 0
        );

        if (statusFilter === 'ORPHAN') {
          return true;
        } else if (statusFilter === 'EXPIRING_SOON') {
          if (!hasExpiringBatch) return false;
        } else if (statusFilter === 'HEALTHY') {
          if (available <= 0) return false;
        } else if (statusFilter === 'OUT_OF_STOCK') {
          if (available > 0) return false;
        } else if (statusFilter === 'LOW_STOCK') {
          if (baseStatus !== 'LOW_STOCK') return false;
        } else if (baseStatus !== statusFilter) {
          return false;
        }
      }

      // 3. Category Filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // 4. Text Search (Product Name, SKU, Barcode)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.productName || '').toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchBarcode = (item.barcode || '').toLowerCase().includes(q);
        const matchOrphan = item.isOrphan && 'orphan inventory product master missing'.includes(q);
        return matchName || matchSku || matchBarcode || matchOrphan;
      }

      return true;
    });
  }, [networkBalances, selectedLocation, statusFilter, categoryFilter, searchQuery]);

  const isFiltered = searchQuery !== '' || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  const handleInspectItem = (item: NetworkInventoryItem) => {
    setActiveItem(item);
    setIsDetailOpen(true);
  };

  const handleOpenAdjustment = (item?: NetworkInventoryItem) => {
    setActiveItem(item || null);
    setIsAdjustmentOpen(true);
  };

  const handleOpenTransfer = (item?: NetworkInventoryItem) => {
    setActiveItem(item || null);
    setIsTransferOpen(true);
  };

  const productSelectorList = useMemo(() => {
    return networkBalances.map((p) => ({
      id: p.productId,
      name: p.productName,
      sku: p.sku,
      cost: p.cost
    }));
  }, [networkBalances]);

  const storeOptions = useMemo(() => {
    return stores.map((s) => ({
      value: s.id,
      label: `${s.name}${s.isWarehouse ? ' (Central Hub)' : ''}`
    }));
  }, [stores]);

  const centralWarehouseId = useMemo(() => {
    return stores.find((s) => s.isWarehouse)?.id;
  }, [stores]);

  return (
    <div className="space-y-4 pb-10">
      {/* Header & Location Navigation */}
      <InventoryHeader
        selectedLocation={selectedLocation}
        stores={stores}
        onSelectLocation={setSelectedLocation}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        onOpenAdjustment={() => handleOpenAdjustment()}
        onOpenTransfer={() => handleOpenTransfer()}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Summary KPI Cards */}
      <InventorySummaryCards
        summary={summary}
        isLoading={isLoadingCommandCenter}
      />

      {/* Filter Toolbar */}
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

      {/* Inventory Command Center Data Table */}
      <InventoryTable
        items={filteredItems}
        selectedLocation={selectedLocation}
        stores={stores}
        isLoading={isLoadingCommandCenter}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        onInspectItem={handleInspectItem}
        onAdjustItem={handleOpenAdjustment}
        onTransferItem={handleOpenTransfer}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
        catalogProducts={summary?.catalogProducts ?? summary?.totalProducts ?? 0}
        stockedProducts={summary?.stockedProducts ?? 0}
      />

      {/* Detail & Multi-Location Stock Drawer */}
      <InventoryDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={activeItem}
        canAdjust={canAdjust}
        canTransfer={canTransfer}
        onAdjustStock={handleOpenAdjustment}
        onTransferStock={handleOpenTransfer}
      />

      {/* Inter-Store & Batch-Aware Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        selectedItem={activeItem}
        items={networkBalances}
        stores={stores}
        defaultLocationId={selectedLocation === 'network' ? undefined : selectedLocation}
      />

      {/* Stock Level Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        selectedItem={activeItem}
        products={productSelectorList}
        storeOptions={storeOptions}
        defaultLocationId={selectedLocation === 'network' ? (centralWarehouseId || stores[0]?.id || 'store-1') : selectedLocation}
      />
    </div>
  );
}
