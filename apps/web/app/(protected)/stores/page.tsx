'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoresQuery } from '../../../features/stores/hooks';
import { useBusinessesQuery } from '../../../features/businesses/hooks';
import {
  StoreHeader,
  StoreSummaryCards,
  StoreFilters,
  StoreTable,
  StoreModal,
  StoreDeleteDialog
} from '../../../features/stores/components';
import {
  BusinessHeader,
  BusinessProfileCard,
  BusinessModal
} from '../../../features/businesses/components';
import { calculateStoreMetrics } from '../../../features/stores/calculations';
import type { StoreDoc } from '../../../features/stores/types';
import type { BusinessDoc } from '../../../features/businesses/types';

export default function StoresPage() {
  const { hasPermission } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Store Modals State
  const [activeModalStore, setActiveModalStore] = useState<StoreDoc | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  const [activeDeleteStore, setActiveDeleteStore] = useState<StoreDoc | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Business Modal State
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);

  // Queries
  const { data: stores = [], isLoading: isLoadingStores } = useStoresQuery();
  const { data: businesses = [], isLoading: isLoadingBusinesses } = useBusinessesQuery();

  const primaryBusiness = businesses[0] || null;

  // Permissions
  const canCreateStore = hasPermission('stores.create');
  const canEditStore = hasPermission('stores.update');
  const canDeleteStore = hasPermission('stores.delete');

  const canEditBusiness = hasPermission('businesses.update') || hasPermission('businesses.create');

  // Filtered Stores (memoized search)
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase().trim();
    return stores.filter((s) => {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchCode = (s.code || '').toLowerCase().includes(q);
      const matchAddress = (s.address || '').toLowerCase().includes(q);
      const matchPhone = (s.phone || '').includes(q);
      return matchName || matchCode || matchAddress || matchPhone;
    });
  }, [stores, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateStoreMetrics(stores);
  }, [stores]);

  const isFiltered = searchQuery.trim() !== '';

  const handleOpenCreateStore = () => {
    setActiveModalStore(null);
    setIsStoreModalOpen(true);
  };

  const handleOpenEditStore = (store: StoreDoc) => {
    setActiveModalStore(store);
    setIsStoreModalOpen(true);
  };

  const handleOpenDeleteStore = (store: StoreDoc) => {
    setActiveDeleteStore(store);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Legal Business Entity Section */}
      <section className="space-y-3">
        <BusinessHeader
          canEdit={canEditBusiness}
          onOpenEdit={() => setIsBusinessModalOpen(true)}
        />
        <BusinessProfileCard
          business={primaryBusiness}
          isLoading={isLoadingBusinesses}
        />
      </section>

      {/* 2. Store Outlets Section */}
      <section className="space-y-3 pt-2">
        <StoreHeader
          canCreate={canCreateStore}
          onOpenCreate={handleOpenCreateStore}
        />

        <StoreSummaryCards
          metrics={metrics}
          isLoading={isLoadingStores}
        />

        <StoreFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearFilters={() => setSearchQuery('')}
        />

        <StoreTable
          stores={filteredStores}
          isLoading={isLoadingStores}
          canEdit={canEditStore}
          canDelete={canDeleteStore}
          onEditStore={handleOpenEditStore}
          onDeleteStore={handleOpenDeleteStore}
          onClearFilters={() => setSearchQuery('')}
          isFiltered={isFiltered}
        />
      </section>

      {/* Store Create/Edit Modal */}
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        store={activeModalStore}
      />

      {/* Store Delete Confirmation Dialog */}
      <StoreDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        store={activeDeleteStore}
      />

      {/* Business Edit Modal */}
      <BusinessModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        business={primaryBusiness}
      />
    </div>
  );
}
