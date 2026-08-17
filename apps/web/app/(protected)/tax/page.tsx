'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useStoresQuery } from '../../../features/stores/hooks';
import {
  useTaxSourceDataQuery,
  TaxHeader,
  TaxSummaryCards,
  GSTBreakdown,
  GSTSlabBreakdown,
  OutwardGSTTable,
  InwardGSTTable,
  B2BSalesTable,
  B2CSalesTable,
  TaxFilters,
  calculateTaxSummaryMetrics,
  groupByTaxRate,
  buildB2BSegmentationLists,
  type TaxReportingTab
} from '../../../features/tax';
import type { CustomerDoc } from '../../../features/customers/types';
import { AccessDeniedState } from '../../../components/ui';

export default function TaxPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('invoices.view');
  const { activeStoreId, isRestricted } = useStoreScope();
  const { data: stores = [] } = useStoresQuery();

  // Filter States
  const [activeTab, setActiveTab] = useState<TaxReportingTab>('overview');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Effective store ID
  const effectiveStoreId = isRestricted
    ? currentUser?.assignedStoreId || 'all'
    : storeFilter !== 'all'
    ? storeFilter
    : activeStoreId !== 'all'
    ? activeStoreId
    : undefined;

  // Query source data
  const { data, isLoading, refetch } = useTaxSourceDataQuery({
    storeId: effectiveStoreId,
    startDate: startDate || undefined,
    endDate: endDate || undefined
  });

  if (!canView) {
    return (
      <AccessDeniedState
        title="Tax & GST Ledger Restricted"
        message="Your role permissions do not authorize access to tax computations, B2B ITC returns, or GST filing ledgers."
        requiredPermission="invoices.view"
      />
    );
  }

  const invoices = data?.invoices || [];
  const purchases = data?.purchases || [];
  const franchiseOrders = data?.franchiseOrders || [];
  const customers = data?.customers || [];

  // Mappings
  const customersMap = useMemo(() => {
    const map = new Map<string, CustomerDoc>();
    for (const c of customers) {
      if (c.id) map.set(c.id, c);
      if (c._id) map.set(String(c._id), c);
    }
    return map;
  }, [customers]);

  const storesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stores) {
      if (s.id) map.set(s.id, s.name);
    }
    return map;
  }, [stores]);

  // Derived Calculations
  const metrics = useMemo(() => {
    return calculateTaxSummaryMetrics(invoices, purchases, franchiseOrders, customersMap);
  }, [invoices, purchases, franchiseOrders, customersMap]);

  const slabs = useMemo(() => {
    return groupByTaxRate(invoices);
  }, [invoices]);

  const { b2b: b2bEntries, b2c: b2cEntries } = useMemo(() => {
    return buildB2BSegmentationLists(invoices, customersMap, storesMap);
  }, [invoices, customersMap, storesMap]);

  const activeStoreName = useMemo(() => {
    if (effectiveStoreId && effectiveStoreId !== 'all') {
      return storesMap.get(effectiveStoreId) || effectiveStoreId;
    }
    return 'All Outlets';
  }, [effectiveStoreId, storesMap]);

  const handleResetFilters = () => {
    setStoreFilter('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <TaxHeader
        isLoading={isLoading}
        onRefresh={() => refetch()}
        activeStoreName={activeStoreName}
      />

      {/* KPI Summary Cards */}
      <TaxSummaryCards metrics={metrics} isLoading={isLoading} />

      {/* Filters & Segmented Navigation */}
      <TaxFilters
        activeTab={activeTab}
        onTabChange={setActiveTab}
        storeId={storeFilter}
        onStoreIdChange={setStoreFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        stores={stores}
        isStoreScoped={isRestricted}
        onReset={handleResetFilters}
      />

      {/* Active Tab Views */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <GSTBreakdown metrics={metrics} />
          <GSTSlabBreakdown slabs={slabs} />
          <OutwardGSTTable invoices={invoices} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'slabs' && (
        <div className="space-y-6">
          <GSTSlabBreakdown slabs={slabs} />
        </div>
      )}

      {activeTab === 'b2b_b2c' && (
        <div className="space-y-6">
          <GSTBreakdown metrics={metrics} />
          <B2BSalesTable entries={b2bEntries} isLoading={isLoading} />
          <B2CSalesTable entries={b2cEntries} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'outward' && (
        <div className="space-y-6">
          <OutwardGSTTable invoices={invoices} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'inward' && (
        <div className="space-y-6">
          <InwardGSTTable purchases={purchases} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
