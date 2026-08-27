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
import { Button, AccessDeniedState } from '../../../components/ui';

const PAGE_SIZE = 100;

export default function AuditPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const canView = hasPermission('audit.view');
  const { isRestricted } = useStoreScope();
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

  // Global audit defaults to the enterprise stream. A concrete storeId is sent
  // only for an explicit filter or a truly store-restricted user.
  const effectiveStoreId = isRestricted
    ? currentUser?.assignedStoreId && currentUser.assignedStoreId !== 'all'
      ? currentUser.assignedStoreId
      : undefined
    : storeFilter !== 'all'
    ? storeFilter
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
  const {
    data = [],
    isLoading: isLoadingLogs,
    isRefetching,
    error: auditError,
    refetch
  } = useAuditLogsQuery(queryParams);

  const logs: AuditLogDoc[] = Array.isArray(data) ? data : [];
  const totalLogs = logs.length;

  // Filter logs locally by search and action
  const filteredLogs = useMemo(() => {
    return logs.filter((log: AuditLogDoc) => {
      // Action filter
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }

      // Search query (username, details, IP, entityId)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchUser = (log.user || log.performedBy || '').toLowerCase().includes(q);
        const matchAction = (log.action || '').toLowerCase().includes(q);
        const matchEventType = (log.eventType || '').toLowerCase().includes(q);
        const matchEntity = (log.entity || '').toLowerCase().includes(q);
        const matchEntityId = (log.entityId || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchIp = (log.ip || '').toLowerCase().includes(q);
        const matchRequest = (log.requestId || '').toLowerCase().includes(q);
        const matchScope = `${log.businessId || ''} ${log.businessName || ''}`.toLowerCase().includes(q);

        if (!matchUser && !matchAction && !matchEventType && !matchEntity && !matchEntityId && !matchDetails && !matchIp && !matchRequest && !matchScope) {
          return false;
        }
      }

      return true;
    });
  }, [logs, actionFilter, search]);

  // Summary Metrics
  const summary = useMemo(() => {
    return calculateAuditSummary(logs);
  }, [logs]);

  if (!canView) {
    return (
      <AccessDeniedState
        title="Audit Trail Restricted"
        message="Your role permissions do not authorize inspection of immutable compliance and forensic audit logs."
        requiredPermission="audit.view"
      />
    );
  }

  // Handlers
  const handleInspectLog = (log: AuditLogDoc) => {
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <AuditHeader
        totalLoaded={totalLogs}
        isLoading={isRefetching}
        onRefresh={() => refetch()}
      />

      {/* Summary KPI Cards */}
      <AuditSummary metrics={summary} isLoading={isLoadingLogs} />

      {/* Filter Bar */}
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

      {auditError && !isLoadingLogs && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Audit logs could not be loaded: {(auditError as Error).message || 'Request failed'}
        </div>
      )}

      {/* Audit Log Table */}
      <AuditTable
        logs={auditError ? [] : filteredLogs}
        isLoading={isLoadingLogs}
        onViewLog={handleInspectLog}
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
      {totalLogs >= PAGE_SIZE && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{skip + 1}</strong> to{' '}
            <strong className="text-slate-900">{skip + totalLogs}</strong> audit entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={skip === 0 || isLoadingLogs}
              onClick={() => setSkip((prev) => Math.max(0, prev - PAGE_SIZE))}
            >
              Previous Page
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={totalLogs < PAGE_SIZE || isLoadingLogs}
              onClick={() => setSkip((prev) => prev + PAGE_SIZE)}
            >
              Next Page
            </Button>
          </div>
        </div>
      )}

      {/* Forensic Detail Drawer */}
      <AuditDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        log={activeLog}
      />
    </div>
  );
}
