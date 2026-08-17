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
import { AccessDeniedState } from '../../../components/ui';

export default function StoresPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('stores.view');

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

  // Derived Metrics
  const storeMetrics = useMemo(() => {
    return calculateStoreMetrics(stores);
  }, [stores]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Outlets Management Restricted"
        message="Your role permissions do not authorize management of physical store outlets or business entity profiles."
        requiredPermission="stores.view"
      />
    );
  }

  // Handlers
  const handleOpenAddStore = () => {
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
    <div className="space-y-8 pb-12">
      {/* SECTION 1: Business Identity & Legal Entity Profile */}
      <section className="space-y-4">
        <BusinessHeader
          canEdit={canEditBusiness}
          onOpenEdit={() => setIsBusinessModalOpen(true)}
        />
        <BusinessProfileCard
          business={primaryBusiness}
          isLoading={isLoadingBusinesses}
        />
      </section>

      {/* SECTION 2: Multi-Store Outlets Registry */}
      <section className="space-y-6 pt-4 border-t border-white/10">
        <StoreHeader
          canCreate={canCreateStore}
          onOpenCreate={handleOpenAddStore}
        />

        <StoreSummaryCards metrics={storeMetrics} isLoading={isLoadingStores} />

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
          isFiltered={searchQuery.trim() !== ''}
          onClearFilters={() => setSearchQuery('')}
        />
      </section>

      {/* Modals & Dialogs */}
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        store={activeModalStore}
      />

      <StoreDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        store={activeDeleteStore}
      />

      <BusinessModal
        isOpen={isBusinessModalOpen}
        onClose={() => setIsBusinessModalOpen(false)}
        business={primaryBusiness}
      />
    </div>
  );
}
