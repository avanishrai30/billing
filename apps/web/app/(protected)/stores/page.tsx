'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoresQuery, useSetStoreHubStatusMutation } from '../../../features/stores/hooks';
import { useBusinessesQuery } from '../../../features/businesses/hooks';
import {
  StoreHeader,
  StoreSummaryCards,
  StoreFilters,
  StoreTable,
  StoreModal,
  StoreDeleteDialog
} from '../../../features/stores/components';
import { StoreTeamDrawer } from '../../../features/stores/components/StoreTeamDrawer';
import {
  BusinessHeader,
  BusinessProfileCard,
  BusinessModal
} from '../../../features/businesses/components';
import { calculateStoreMetrics } from '../../../features/stores/calculations';
import type { StoreDoc } from '../../../features/stores/types';
import { AccessDeniedState, useToast } from '../../../components/ui';

export default function StoresPage() {
  const { user, hasPermission } = useAuth();
  const { success, error } = useToast();
  const canView = hasPermission('stores.view');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Store Modals & Drawers State
  const [activeModalStore, setActiveModalStore] = useState<StoreDoc | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  const [activeDeleteStore, setActiveDeleteStore] = useState<StoreDoc | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [teamDrawerStore, setTeamDrawerStore] = useState<StoreDoc | null>(null);
  const [isTeamDrawerOpen, setIsTeamDrawerOpen] = useState(false);

  // Business Modal State
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);

  // Queries & Mutations
  const { data: stores = [], isLoading: isLoadingStores } = useStoresQuery();
  const { data: businesses = [], isLoading: isLoadingBusinesses } = useBusinessesQuery();
  const setHubMutation = useSetStoreHubStatusMutation();

  const primaryBusiness = businesses[0] || null;

  // Permissions & Roles
  const userCategory = (user?.category || '').toLowerCase();
  const userRole = (user?.role || '').toLowerCase();
  const isSuperAdmin =
    userCategory === 'super admin' ||
    userCategory === 'superadmin' ||
    userCategory === 'owner' ||
    userRole === 'super admin' ||
    userRole === 'superadmin' ||
    userRole === 'owner';
  const canCreateStore = hasPermission('stores.create');
  const canEditStore = hasPermission('stores.update');
  const canDeleteStore = hasPermission('stores.delete');
  const canManageTeam = hasPermission('users.update') || isSuperAdmin;
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

  const handleOpenTeamDrawer = (store: StoreDoc) => {
    setTeamDrawerStore(store);
    setIsTeamDrawerOpen(true);
  };

  const handleToggleHubStatus = async (store: StoreDoc) => {
    const nextHubState = !store.isHub;
    try {
      await setHubMutation.mutateAsync({
        storeId: store.id,
        isHub: nextHubState,
        hubPriority: nextHubState ? 5 : 1
      });
      success(
        nextHubState ? 'Hub Promoted' : 'Hub Demoted',
        `${store.name} has been ${nextHubState ? 'designated as a Distribution Hub' : 'reverted to a standard store'}.`
      );
    } catch (err: any) {
      error('Hub Status Error', err?.message || 'Failed to update store Hub status.');
    }
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
      <section className="space-y-6 pt-4 border-t border-slate-200">
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
          isSuperAdmin={isSuperAdmin}
          onEditStore={handleOpenEditStore}
          onDeleteStore={handleOpenDeleteStore}
          onManageEmployees={handleOpenTeamDrawer}
          onToggleHubStatus={handleToggleHubStatus}
          isFiltered={searchQuery.trim() !== ''}
          onClearFilters={() => setSearchQuery('')}
        />
      </section>

      {/* Modals & Drawers */}
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        store={activeModalStore}
      />

      <StoreTeamDrawer
        isOpen={isTeamDrawerOpen}
        onClose={() => {
          setIsTeamDrawerOpen(false);
          setTeamDrawerStore(null);
        }}
        store={teamDrawerStore}
        canManage={canManageTeam}
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
