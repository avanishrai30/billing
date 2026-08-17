'use client';

import React, { useState, useMemo } from 'react';
import { Store, Package, Layers } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
  useFranchisesQuery,
  useSupplyOrdersQuery,
  useSaveFranchiseMutation,
  useDeleteFranchiseMutation,
  useCreateSupplyOrderMutation,
  calculateFranchiseMetrics,
  FranchiseHeader,
  FranchiseSummaryCards,
  FranchiseFilters,
  FranchiseTable,
  FranchiseModal,
  FranchiseDetailDrawer,
  FranchiseDeleteDialog,
  SupplyOrderForm,
  SupplyOrderTable,
  type FranchiseDoc,
  type FranchiseStatus,
  type FranchiseFormValues,
  type SupplyOrderFormValues
} from '../../../features/franchises';
import { Tabs, TabsList, TabsTrigger, AccessDeniedState } from '../../../components/ui';

export default function FranchisesPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('franchise.view');
  const canManage = hasPermission('franchise.manage');

  // Active Tab: 'directory' vs 'orders'
  const [activeTab, setActiveTab] = useState<'directory' | 'orders'>('directory');

  // Queries
  const {
    data: franchises = [],
    isLoading: isLoadingFranchises,
    isError: isErrorFranchises
  } = useFranchisesQuery();

  const {
    data: supplyOrders = [],
    isLoading: isLoadingOrders,
    isError: isErrorOrders
  } = useSupplyOrdersQuery();

  // Mutations
  const saveMutation = useSaveFranchiseMutation();
  const deleteMutation = useDeleteFranchiseMutation();
  const createOrderMutation = useCreateSupplyOrderMutation();

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FranchiseStatus>('ALL');

  // Modal / Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseDoc | null>(null);

  // Derived Metrics
  const metrics = useMemo(() => {
    return calculateFranchiseMetrics(franchises, supplyOrders);
  }, [franchises, supplyOrders]);

  // Filtered Directory
  const filteredFranchises = useMemo(() => {
    return franchises.filter((f) => {
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      if (!matchStatus) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchName = (f.name || '').toLowerCase().includes(q);
      const matchLocation = (f.location || '').toLowerCase().includes(q);
      const matchOwner = (f.owner || '').toLowerCase().includes(q);
      const matchPhone = (f.phone || '').toLowerCase().includes(q);
      const matchGstin = (f.gstin || '').toLowerCase().includes(q);
      return matchName || matchLocation || matchOwner || matchPhone || matchGstin;
    });
  }, [franchises, search, statusFilter]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Franchise Network Restricted"
        message="Your role permissions do not authorize access to partner franchise records or supply dispatch ledgers."
        requiredPermission="franchise.view"
      />
    );
  }

  // Handlers
  const handleOpenAdd = () => {
    setSelectedFranchise(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (franchise: FranchiseDoc) => {
    setSelectedFranchise(franchise);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (franchise: FranchiseDoc) => {
    setSelectedFranchise(franchise);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (franchise: FranchiseDoc) => {
    setSelectedFranchise(franchise);
    setIsDeleteOpen(true);
  };

  const handleOpenSupplyOrder = (franchise?: FranchiseDoc) => {
    if (franchise) setSelectedFranchise(franchise);
    setIsSupplyModalOpen(true);
  };

  const handleSaveFranchise = async (values: FranchiseFormValues) => {
    await saveMutation.mutateAsync(values);
  };

  const handleConfirmDelete = async () => {
    if (selectedFranchise) {
      await deleteMutation.mutateAsync(selectedFranchise.id);
      setIsDeleteOpen(false);
      setSelectedFranchise(null);
    }
  };

  const handleCreateSupplyOrder = async (values: SupplyOrderFormValues) => {
    await createOrderMutation.mutateAsync(values);
    setIsSupplyModalOpen(false);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <FranchiseHeader
        totalFranchises={metrics.totalFranchises}
        activeFranchises={metrics.activeFranchises}
        canManage={canManage}
        onRegisterFranchise={handleOpenAdd}
        onCreateSupplyOrder={() => handleOpenSupplyOrder()}
      />

      {/* KPI Cards */}
      <FranchiseSummaryCards metrics={metrics} isLoading={isLoadingFranchises} />

      {/* Module Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <Tabs defaultValue="directory" value={activeTab} onValueChange={(v) => setActiveTab(v as 'directory' | 'orders')}>
          <TabsList>
            <TabsTrigger value="directory" icon={<Store className="w-3.5 h-3.5" />}>
              Franchise Directory ({franchises.length})
            </TabsTrigger>
            <TabsTrigger value="orders" icon={<Package className="w-3.5 h-3.5" />}>
              Supply Chain Orders ({supplyOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* TAB 1: FRANCHISE PARTNER DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <FranchiseFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            onReset={handleClearFilters}
          />

          <FranchiseTable
            franchises={filteredFranchises}
            isLoading={isLoadingFranchises}
            canManage={canManage}
            onViewDetail={handleOpenDetail}
            onRecordSupply={handleOpenSupplyOrder}
            onEditFranchise={handleOpenEdit}
            onDeleteFranchise={handleOpenDelete}
            onClearFilters={handleClearFilters}
            isFiltered={search !== '' || statusFilter !== 'ALL'}
          />
        </div>
      )}

      {/* TAB 2: SUPPLY ORDERS & DISPATCH LEDGER */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <SupplyOrderTable
            orders={supplyOrders}
            franchises={franchises}
            isLoading={isLoadingOrders}
          />
        </div>
      )}

      {/* Modals & Drawers */}
      <FranchiseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        franchise={selectedFranchise}
        onSubmit={handleSaveFranchise}
        isLoading={saveMutation.isPending}
      />

      <SupplyOrderForm
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        franchises={franchises.filter((f) => f.status === 'active')}
        selectedFranchiseId={selectedFranchise?.id}
        onSubmit={handleCreateSupplyOrder}
        isLoading={createOrderMutation.isPending}
      />

      <FranchiseDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        franchise={selectedFranchise}
        orders={supplyOrders}
        canManage={canManage}
        onRecordSupply={(f: FranchiseDoc) => {
          setIsDetailOpen(false);
          handleOpenSupplyOrder(f);
        }}
      />

      <FranchiseDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        franchise={selectedFranchise}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
