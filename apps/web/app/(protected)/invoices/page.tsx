'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useInvoicesQuery } from '../../../features/invoices/hooks';
import { usePOSStoresQuery } from '../../../features/pos/hooks';
import {
  InvoiceHeader,
  InvoiceSummary,
  InvoiceFilters,
  InvoiceTable,
  InvoiceDetailDrawer,
  InvoiceVoidDialog
} from '../../../features/invoices/components';
import { calculateInvoiceSummary } from '../../../features/invoices/calculations';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { AccessDeniedState } from '../../../components/ui';
import type { Invoice } from '../../../features/invoices/types';

export default function InvoicesPage() {
  const { user, hasPermission } = useAuth();
  const canView = hasPermission('invoices.view');
  const { activeStoreId } = useStoreScope();

  const assignedStoreId =
    user?.assignedStoreId && user.assignedStoreId !== 'all'
      ? user.assignedStoreId
      : (activeStoreId || 'all');

  const [selectedLocation, setSelectedLocation] = useState<string>(assignedStoreId);

  // Sync with global store switch
  React.useEffect(() => {
    if (activeStoreId) {
      setSelectedLocation(activeStoreId);
    }
  }, [activeStoreId]);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');

  // Drawer / Dialog state
  const [activeDetailInvoice, setActiveDetailInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeVoidInvoice, setActiveVoidInvoice] = useState<Invoice | null>(null);
  const [isVoidOpen, setIsVoidOpen] = useState(false);

  // Queries
  const { data: stores = [] } = usePOSStoresQuery();
  const { data: response, isLoading } = useInvoicesQuery({
    page,
    limit: 50,
    locationId: selectedLocation,
    status: statusFilter,
    search: searchQuery.trim() || undefined
  });

  if (!canView) {
    return (
      <AccessDeniedState
        title="Sales Invoices Restricted"
        message="Your role permissions do not authorize browsing historical customer invoices, sales ledgers, or issuing void reversals."
        requiredPermission="invoices.view"
      />
    );
  }

  const invoices = response?.invoices || [];
  const pagination = response?.pagination || {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  };

  // Permissions
  const canVoid = hasPermission('invoices.void');
  const canCreatePOS = hasPermission('invoices.create') || hasPermission('pos.access');

  // Store options
  const storeOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Store Outlets' }];
    for (const s of stores) {
      opts.push({ value: s.id, label: s.name });
    }
    return opts;
  }, [stores]);

  // Client-side payment mode filter and text search refinement
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Payment mode filter
      if (paymentModeFilter !== 'ALL') {
        const mode = (inv.paymentMode || inv.paymentMethod || 'CASH').toUpperCase();
        if (mode !== paymentModeFilter) return false;
      }

      // Local search refinement if needed
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (inv.invoiceNumber || inv.id || '').toLowerCase();
        const cust = (inv.customerName || '').toLowerCase();
        const phone = (inv.customerPhone || '').toLowerCase();
        return num.includes(q) || cust.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [invoices, paymentModeFilter, searchQuery]);

  // Ledger summary calculations
  const summaryMetrics = useMemo(() => {
    return calculateInvoiceSummary(filteredInvoices);
  }, [filteredInvoices]);

  const isFiltered =
    searchQuery !== '' || statusFilter !== 'ALL' || paymentModeFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPaymentModeFilter('ALL');
    setPage(1);
  };

  const handleViewDetail = (invoice: Invoice) => {
    setActiveDetailInvoice(invoice);
    setIsDetailOpen(true);
  };

  const handleOpenVoid = (invoice: Invoice) => {
    setActiveVoidInvoice(invoice);
    setIsVoidOpen(true);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <InvoiceHeader
        selectedLocation={selectedLocation}
        storeOptions={storeOptions}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          setPage(1);
        }}
        canCreatePOS={canCreatePOS}
      />

      {/* Summary KPI Cards */}
      <InvoiceSummary metrics={summaryMetrics} isLoading={isLoading} />

      {/* Filter Controls */}
      <InvoiceFilters
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(st) => {
          setStatusFilter(st);
          setPage(1);
        }}
        paymentModeFilter={paymentModeFilter}
        onPaymentModeFilterChange={(pm) => {
          setPaymentModeFilter(pm);
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
      />

      {/* Main Invoices Table */}
      <InvoiceTable
        invoices={filteredInvoices}
        isLoading={isLoading}
        canVoid={canVoid}
        onViewDetail={handleViewDetail}
        onVoidInvoice={handleOpenVoid}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
        pagination={pagination}
        onPageChange={(p) => setPage(p)}
      />

      {/* Detail Drawer */}
      <InvoiceDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        invoice={activeDetailInvoice}
        canVoid={canVoid}
        onOpenVoid={handleOpenVoid}
      />

      {/* Void Dialog */}
      <InvoiceVoidDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        invoice={activeVoidInvoice}
      />
    </div>
  );
}
