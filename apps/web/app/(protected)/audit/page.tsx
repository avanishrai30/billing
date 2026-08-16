'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useStoreScope } from '../../../providers/StoreScopeProvider';
import { useStoresQuery } from '../../../features/stores/hooks';
import {
  useAuditLogsQuery,
  AuditHeader,
  AuditSummary,
  AuditFilters,
  AuditTable,
  AuditDetailDrawer,
  calculateAuditSummary,
  type AuditLogDoc,
  type AuditQueryParams
} from '../../../features/audit';
import { Button } from '../../../components/ui';

const PAGE_SIZE = 100;

export default function AuditPage() {
  const { user: currentUser } = useAuth();
  const { activeStoreId, isRestricted } = useStoreScope();
  const { data: stores = [] } = useStoresQuery();

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination State
  const [skip, setSkip] = useState<number>(0);

  // Drawer Inspection State
  const [activeLog, setActiveLog] = useState<AuditLogDoc | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync store filter with active store scope if user selected a store
  const effectiveStoreId = isRestricted
    ? currentUser?.assignedStoreId || 'all'
    : storeFilter !== 'all'
    ? storeFilter
    : activeStoreId !== 'all'
    ? activeStoreId
    : undefined;

  // Query Params
  const queryParams: AuditQueryParams = useMemo(() => {
    return {
      limit: PAGE_SIZE,
      skip,
      entity: entityFilter !== 'ALL' ? entityFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      storeId: effectiveStoreId
    };
  }, [skip, entityFilter, startDate, endDate, effectiveStoreId]);

  // Query
  const { data: logs = [], isLoading, refetch } = useAuditLogsQuery(queryParams);

  // Client-Side Search & Action Filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by Action
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // Filter by Search text
      if (!search.trim()) return true;
      const query = search.toLowerCase().trim();
      return (
        log.details?.toLowerCase().includes(query) ||
        log.user?.toLowerCase().includes(query) ||
        log.performedBy?.toLowerCase().includes(query) ||
        log.entityId?.toLowerCase().includes(query) ||
        log.eventType?.toLowerCase().includes(query) ||
        log.requestId?.toLowerCase().includes(query) ||
        log.businessName?.toLowerCase().includes(query)
      );
    });
  }, [logs, actionFilter, search]);

  // Summary Metrics
  const metrics = useMemo(() => {
    return calculateAuditSummary(filteredLogs);
  }, [filteredLogs]);

  // Handlers
  const handleOpenDetail = (log: AuditLogDoc) => {
    setActiveLog(log);
    setIsDrawerOpen(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setStoreFilter('all');
    setStartDate('');
    setEndDate('');
    setSkip(0);
  };

  const handleNextPage = () => {
    setSkip((prev) => prev + PAGE_SIZE);
  };

  const handlePrevPage = () => {
    setSkip((prev) => Math.max(0, prev - PAGE_SIZE));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <AuditHeader
        totalLoaded={filteredLogs.length}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      {/* KPI Summary Cards */}
      <AuditSummary metrics={metrics} isLoading={isLoading} />

      {/* Search & Filters */}
      <AuditFilters
        search={search}
        onSearchChange={setSearch}
        action={actionFilter}
        onActionChange={setActionFilter}
        entity={entityFilter}
        onEntityChange={setEntityFilter}
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

      {/* Audit Data Table */}
      <AuditTable
        logs={filteredLogs}
        isLoading={isLoading}
        onViewLog={handleOpenDetail}
        onClearFilters={handleResetFilters}
        isFiltered={
          search !== '' ||
          actionFilter !== 'ALL' ||
          entityFilter !== 'ALL' ||
          storeFilter !== 'all' ||
          startDate !== '' ||
          endDate !== ''
        }
      />

      {/* Pagination Controls */}
      <div className="flex items-center justify-between bg-[#021b47] p-3.5 rounded-xl border border-white/10 text-xs text-slate-300">
        <div>
          Showing events <span className="font-mono text-white font-bold">{skip + 1}</span> to{' '}
          <span className="font-mono text-white font-bold">{skip + logs.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={skip === 0 || isLoading}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={logs.length < PAGE_SIZE || isLoading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Detail Slide-Over Drawer */}
      <AuditDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        log={activeLog}
      />
    </div>
  );
}
