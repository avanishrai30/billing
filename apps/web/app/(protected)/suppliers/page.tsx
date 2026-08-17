'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useSuppliersQuery } from '../../../features/suppliers/hooks';
import {
  SupplierHeader,
  SupplierSummaryCards,
  SupplierFilters,
  SupplierTable,
  SupplierModal,
  SupplierDetailDrawer,
  SupplierDeleteDialog
} from '../../../features/suppliers/components';
import { calculateSupplierMetrics } from '../../../features/suppliers/calculations';
import { AccessDeniedState } from '../../../components/ui';
import type { SupplierDoc } from '../../../features/suppliers/types';

export default function SuppliersPage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('suppliers.view');

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawer State
  const [activeDetailSupplier, setActiveDetailSupplier] = useState<SupplierDoc | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [activeModalSupplier, setActiveModalSupplier] = useState<SupplierDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeDeleteSupplier, setActiveDeleteSupplier] = useState<SupplierDoc | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries
  const { data: suppliers = [], isLoading } = useSuppliersQuery();

  // Permissions
  const canCreate = hasPermission('suppliers.create');
  const canEdit = hasPermission('suppliers.update');
  const canDelete = hasPermission('suppliers.delete');

  if (!canView) {
    return (
      <AccessDeniedState
        title="Supplier Directory Restricted"
        message="Your role permissions do not authorize browsing vendor supplier profiles or procurement ledgers."
        requiredPermission="suppliers.view"
      />
    );
  }

  // Filtered Suppliers (memoized search)
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter((s) => {
      const matchName = (s.name || '').toLowerCase().includes(q);
      const matchContact = (s.contact || '').includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchGst = (s.gst || s.gstin || '').toLowerCase().includes(q);
      return matchName || matchContact || matchEmail || matchGst;
    });
  }, [suppliers, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateSupplierMetrics(suppliers);
  }, [suppliers]);

  const isFiltered = searchQuery.trim() !== '';

  const handleOpenCreate = () => {
    setActiveModalSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: SupplierDoc) => {
    setActiveModalSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleViewDetail = (supplier: SupplierDoc) => {
    setActiveDetailSupplier(supplier);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (supplier: SupplierDoc) => {
    setActiveDeleteSupplier(supplier);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <SupplierHeader
        canCreate={canCreate}
        onOpenCreate={handleOpenCreate}
      />

      {/* Summary KPI Cards */}
      <SupplierSummaryCards
        metrics={metrics}
        isLoading={isLoading}
      />

      {/* Search Filter */}
      <SupplierFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearFilters={() => setSearchQuery('')}
      />

      {/* Supplier Directory Table */}
      <SupplierTable
        suppliers={filteredSuppliers}
        isLoading={isLoading}
        canEdit={canEdit}
        canDelete={canDelete}
        onViewDetail={handleViewDetail}
        onEditSupplier={handleOpenEdit}
        onDeleteSupplier={handleOpenDelete}
        onClearFilters={() => setSearchQuery('')}
        isFiltered={isFiltered}
      />

      {/* Create / Edit Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={activeModalSupplier}
      />

      {/* Detail & History Drawer */}
      <SupplierDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        supplier={activeDetailSupplier}
        canEdit={canEdit}
        onOpenEdit={handleOpenEdit}
      />

      {/* Delete Confirmation Dialog */}
      <SupplierDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        supplier={activeDeleteSupplier}
      />
    </div>
  );
}
