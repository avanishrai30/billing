'use client';

import React, { useState, useMemo } from 'react';
import { useAuthorization } from '../../../hooks/useAuthorization';
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

  // Queries
  const { data: commandCenterData, isLoading: isLoadingCommandCenter } = useInventoryCommandCenterQuery();

  const stores: CommandCenterStore[] = useMemo(() => {
    return commandCenterData?.stores || [];
  }, [commandCenterData]);

  const networkBalances: NetworkInventoryItem[] = useMemo(() => {
    return commandCenterData?.networkBalances || [];
  }, [commandCenterData]);

  const summary = commandCenterData?.summary;

  // Selected Location: 'network' (for super admin) or specific store ID
  const defaultLocation = useMemo(() => {
    if (!isSuperAdmin && user?.assignedStoreId && user.assignedStoreId !== 'all') {
      return user.assignedStoreId;
    }
    return 'network';
  }, [isSuperAdmin, user]);

  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocation);

  // Sync selected location once stores load
  React.useEffect(() => {
    if (!isSuperAdmin && user?.assignedStoreId && user.assignedStoreId !== 'all') {
      setSelectedLocation(user.assignedStoreId);
    }
  }, [isSuperAdmin, user]);

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

  // Filtered Items based on active tab and search/filter criteria
  const filteredItems = useMemo(() => {
    const thirtyDaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return networkBalances.filter((item) => {
      // 1. If single location selected, only show items with presence or allow zero items
      let onHand = item.networkQuantity;
      if (selectedLocation !== 'network') {
        const loc = item.locationBreakdown.find((l) => l.locationId === selectedLocation);
        onHand = loc ? loc.quantity : 0;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ORPHAN') {
          if (!item.isOrphan) return false;
        } else if (item.isOrphan) {
          return false;
        }

        const baseStatus = deriveStockStatus(onHand, item.reorderLevel);
        const hasExpiringBatch = item.batches.some(
          (b) => b.expiryDate && b.expiryDate <= thirtyDaysIso && b.remainingQuantity > 0
        );

        if (statusFilter === 'ORPHAN') {
          return true;
        } else if (statusFilter === 'EXPIRING_SOON') {
          if (!hasExpiringBatch) return false;
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
        defaultLocationId={selectedLocation === 'network' ? (stores[0]?.id || 'store-1') : selectedLocation}
      />
    </div>
  );
}
