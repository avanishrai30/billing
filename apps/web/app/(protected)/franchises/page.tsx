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
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui';

export default function FranchisesPage() {
  const { hasPermission } = useAuth();
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
  const [activeFranchise, setActiveFranchise] = useState<FranchiseDoc | null>(null);

  // Summary Metrics
  const metrics = useMemo(() => {
    return calculateFranchiseMetrics(franchises, supplyOrders);
  }, [franchises, supplyOrders]);

  // Filtered Franchises
  const filteredFranchises = useMemo(() => {
    return franchises.filter((f) => {
      const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
      if (!matchesStatus) return false;

      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      return (
        f.name?.toLowerCase().includes(query) ||
        f.owner?.toLowerCase().includes(query) ||
        f.location?.toLowerCase().includes(query) ||
        f.phone?.toLowerCase().includes(query) ||
        f.email?.toLowerCase().includes(query) ||
        f.gstin?.toLowerCase().includes(query)
      );
    });
  }, [franchises, search, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setActiveFranchise(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (franchise: FranchiseDoc) => {
    setActiveFranchise(franchise);
    setIsModalOpen(true);
  };

  const handleOpenRecordSupply = (franchise?: FranchiseDoc) => {
    setActiveFranchise(franchise || null);
    setIsSupplyModalOpen(true);
  };

  const handleOpenDetail = (franchise: FranchiseDoc) => {
    setActiveFranchise(franchise);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (franchise: FranchiseDoc) => {
    setActiveFranchise(franchise);
    setIsDeleteOpen(true);
  };

  const handleSaveFranchise = async (values: FranchiseFormValues) => {
    await saveMutation.mutateAsync(values);
  };

  const handleDeleteFranchise = async () => {
    if (activeFranchise?.id) {
      await deleteMutation.mutateAsync(activeFranchise.id);
      setIsDeleteOpen(false);
      setActiveFranchise(null);
    }
  };

  const handleCreateSupplyOrder = async (values: SupplyOrderFormValues) => {
    await createOrderMutation.mutateAsync(values);
  };

  const handleResetFilters = () => {
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
        onRegisterFranchise={handleOpenCreateModal}
        onCreateSupplyOrder={() => handleOpenRecordSupply()}
      />

      {/* Summary KPI Cards */}
      <FranchiseSummaryCards
        metrics={metrics}
        isLoading={isLoadingFranchises || isLoadingOrders}
      />

      {/* Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <Tabs defaultValue="directory" value={activeTab} onValueChange={(val) => setActiveTab(val as 'directory' | 'orders')}>
          <TabsList className="bg-black/30 p-1 border border-white/10">
            <TabsTrigger value="directory" className="text-xs flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Franchise Directory ({franchises.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Supply Orders ({supplyOrders.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'directory' ? (
        <div className="space-y-4">
          {/* Filters */}
          <FranchiseFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            onReset={handleResetFilters}
          />

          {/* Directory Table */}
          <FranchiseTable
            franchises={filteredFranchises}
            isLoading={isLoadingFranchises}
            canManage={canManage}
            onViewDetail={handleOpenDetail}
            onRecordSupply={handleOpenRecordSupply}
            onEditFranchise={handleOpenEditModal}
            onDeleteFranchise={handleOpenDelete}
            onClearFilters={handleResetFilters}
            isFiltered={search !== '' || statusFilter !== 'ALL'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Supply Order Ledger Table */}
          <SupplyOrderTable
            orders={supplyOrders}
            franchises={franchises}
            isLoading={isLoadingOrders}
            onClearFilters={handleResetFilters}
          />
        </div>
      )}

      {/* Franchise Create/Edit Modal */}
      <FranchiseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        franchise={activeFranchise}
        onSubmit={handleSaveFranchise}
        isLoading={saveMutation.isPending}
      />

      {/* Record Supply Order Modal */}
      <SupplyOrderForm
        isOpen={isSupplyModalOpen}
        onClose={() => setIsSupplyModalOpen(false)}
        franchises={franchises}
        selectedFranchiseId={activeFranchise?.id}
        onSubmit={handleCreateSupplyOrder}
        isLoading={createOrderMutation.isPending}
      />

      {/* Partner Detail Drawer */}
      <FranchiseDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        franchise={activeFranchise}
        orders={supplyOrders}
        canManage={canManage}
        onRecordSupply={(fran) => {
          setIsDetailOpen(false);
          handleOpenRecordSupply(fran);
        }}
      />

      {/* Partner Delete Confirmation Dialog */}
      <FranchiseDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        franchise={activeFranchise}
        onConfirm={handleDeleteFranchise}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
