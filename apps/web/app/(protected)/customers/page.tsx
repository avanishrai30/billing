'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useCustomersQuery } from '../../../features/customers/hooks';
import {
  CustomerHeader,
  CustomerSummaryCards,
  CustomerFilters,
  CustomerTable,
  CustomerModal,
  CustomerDetailDrawer,
  CustomerDeleteDialog
} from '../../../features/customers/components';
import { calculateCustomerMetrics } from '../../../features/customers/calculations';
import type { CustomerDoc } from '../../../features/customers/types';

export default function CustomersPage() {
  const { hasPermission } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawer State
  const [activeDetailCustomer, setActiveDetailCustomer] = useState<CustomerDoc | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [activeModalCustomer, setActiveModalCustomer] = useState<CustomerDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeDeleteCustomer, setActiveDeleteCustomer] = useState<CustomerDoc | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries
  const { data: customers = [], isLoading } = useCustomersQuery();

  // Permissions
  const canCreate = hasPermission('customers.create');
  const canEdit = hasPermission('customers.update');
  const canDelete = hasPermission('customers.delete');

  // Filtered Customers (memoized search)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      const matchGst = (c.gstin || c.gst || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchGst;
    });
  }, [customers, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateCustomerMetrics(customers);
  }, [customers]);

  const isFiltered = searchQuery.trim() !== '';

  const handleOpenCreate = () => {
    setActiveModalCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerDoc) => {
    setActiveModalCustomer(customer);
    setIsModalOpen(true);
  };

  const handleViewDetail = (customer: CustomerDoc) => {
    setActiveDetailCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleOpenDelete = (customer: CustomerDoc) => {
    setActiveDeleteCustomer(customer);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <CustomerHeader
        canCreate={canCreate}
        onOpenCreate={handleOpenCreate}
      />

      {/* Summary KPI Cards */}
      <CustomerSummaryCards
        metrics={metrics}
        isLoading={isLoading}
      />

      {/* Search Filter */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearFilters={() => setSearchQuery('')}
      />

      {/* Customer Directory Table */}
      <CustomerTable
        customers={filteredCustomers}
        isLoading={isLoading}
        canEdit={canEdit}
        canDelete={canDelete}
        onViewDetail={handleViewDetail}
        onEditCustomer={handleOpenEdit}
        onDeleteCustomer={handleOpenDelete}
        onClearFilters={() => setSearchQuery('')}
        isFiltered={isFiltered}
      />

      {/* Create / Edit Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customer={activeModalCustomer}
      />

      {/* Detail & History Drawer */}
      <CustomerDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        customer={activeDetailCustomer}
        canEdit={canEdit}
        onOpenEdit={handleOpenEdit}
      />

      {/* Delete Confirmation Dialog */}
      <CustomerDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        customer={activeDeleteCustomer}
      />
    </div>
  );
}
