'use client';

import React, { useState, useMemo } from 'react';
import { useAuthorization } from '../../../../hooks/useAuthorization';
import { AccessDeniedState, ErrorState, useToast } from '../../../../components/ui';
import {
  CleanupHeader,
  CleanupFilterBar,
  CleanupDataTable,
  CleanupPreviewModal,
  CleanupOperationsDrawer
} from '../../../../features/adminCleanup/components';
import {
  useCleanupSummaryQuery,
  useCleanupRecordsQuery,
  useCleanupPreviewMutation,
  useCleanupExecuteMutation,
  useCleanupOperationsQuery,
  useCleanupRollbackMutation
} from '../../../../features/adminCleanup/hooks';
import type {
  CleanupDomain,
  CleanupAction,
  CleanupFilterState,
  CleanupPreviewResult,
  CleanupExecutionResult
} from '../../../../features/adminCleanup/types';

export default function AdminCleanupPage() {
  const { user, isSuperAdmin: isUserSuperAdmin } = useAuthorization();
  const { success, error: toastError, info } = useToast();

  // Selected Domain & Active Tab
  const [selectedDomain, setSelectedDomain] = useState<CleanupDomain>('invoices');

  // Filter State
  const [filters, setFilters] = useState<CleanupFilterState>({
    search: '',
    datePreset: 'all',
    status: 'all',
    stockStatus: 'all'
  });

  // Table Selection & Pagination State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const limit = 25;

  // Modals & Drawers State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activePreview, setActivePreview] = useState<CleanupPreviewResult | null>(null);
  const [activeAction, setActiveAction] = useState<CleanupAction | null>(null);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [lastOperationSummary, setLastOperationSummary] = useState<CleanupExecutionResult | null>(null);

  // Queries
  const { data: summary, refetch: refetchSummary } = useCleanupSummaryQuery();
  const {
    data: queryResult,
    isLoading: isLoadingRecords,
    isError,
    error,
    refetch: refetchRecords
  } = useCleanupRecordsQuery(selectedDomain, filters, { page, limit });

  const { data: operationsData, isLoading: isLoadingOperations, refetch: refetchOperations } =
    useCleanupOperationsQuery(20, 0);

  // Mutations
  const previewMutation = useCleanupPreviewMutation();
  const executeMutation = useCleanupExecuteMutation();
  const rollbackMutation = useCleanupRollbackMutation();

  // Reset page & selection when domain or filter changes
  const handleDomainChange = (domain: CleanupDomain) => {
    setSelectedDomain(domain);
    setSelectedIds([]);
    setPage(1);
    setFilters({
      search: '',
      datePreset: 'all',
      status: 'all',
      stockStatus: 'all'
    });
  };

  const handleFilterChange = (newFilters: Partial<CleanupFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setSelectedIds([]);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      datePreset: 'all',
      status: 'all',
      stockStatus: 'all'
    });
    setSelectedIds([]);
    setPage(1);
  };

  // Selection handlers
  const records = queryResult?.records || [];
  const totalPages = queryResult?.pagination?.totalPages || 1;
  const totalRecords = queryResult?.pagination?.total || 0;

  const isAllSelected = useMemo(() => {
    if (records.length === 0) return false;
    return records.every((r) => selectedIds.includes(r.id));
  }, [records, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      const pageIds = records.map((r) => r.id);
      setSelectedIds(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  // Trigger dry-run preview before execution
  const handleTriggerAction = async (action: CleanupAction, singleId?: string) => {
    const targetIds = singleId ? [singleId] : selectedIds;
    if (targetIds.length === 0) {
      toastError('No Records Selected', 'Please select at least one record to proceed.');
      return;
    }

    setActiveAction(action);
    try {
      const preview = await previewMutation.mutateAsync({
        domain: selectedDomain,
        action,
        targetIds,
        filters
      });
      setActivePreview(preview);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toastError('Preview Failed', err?.message || 'Failed to simulate cleanup impact.');
    }
  };

  // Execute confirmed cleanup
  const handleConfirmExecute = async (confirmCode: string, password: string) => {
    if (!activePreview || !activeAction) return;

    try {
      const res = await executeMutation.mutateAsync({
        domain: selectedDomain,
        action: activeAction,
        targetIds: selectedIds,
        previewToken: activePreview.previewToken,
        confirmCode,
        filters,
        password
      });

      setIsPreviewOpen(false);
      setSelectedIds([]);
      setLastOperationSummary(res.result);
      success(
        'Maintenance Executed',
        `Cleaned ${res.result?.cleanedCount ?? res.result?.processedCount ?? activePreview.eligibleCount}; protected ${res.result?.skippedCount ?? activePreview.blockedCount}.`
      );
      refetchSummary();
      refetchRecords();
      refetchOperations();
    } catch (err: any) {
      toastError('Execution Blocked', err?.message || 'Failed to execute maintenance operation.');
    }
  };

  // Rollback operation
  const handleRollback = async (operationId: string) => {
    try {
      await rollbackMutation.mutateAsync(operationId);
      success('Operation Rolled Back', `Restored records from operation ${operationId}.`);
      refetchSummary();
      refetchRecords();
      refetchOperations();
    } catch (err: any) {
      toastError('Rollback Failed', err?.message || 'Failed to revert cleanup operation.');
    }
  };

  // Security Access Guard
  if (!isUserSuperAdmin) {
    return (
      <AccessDeniedState
        title="Super Admin Authorization Required"
        message="The Data Cleanup & Maintenance Center is strictly restricted to canonical Super Admin users."
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <CleanupHeader
        summary={summary}
        selectedDomain={selectedDomain}
        onSelectDomain={handleDomainChange}
        onOpenHistory={() => setIsOperationsOpen(true)}
      />

      <CleanupFilterBar
        domain={selectedDomain}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {lastOperationSummary && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-bold">Cleanup Operation Completed</div>
              <div className="mt-1 text-xs text-emerald-800">
                Cleaned: <strong>{lastOperationSummary.cleanedCount ?? lastOperationSummary.processedCount}</strong>
                {' - '}Skipped / blocked: <strong>{lastOperationSummary.skippedCount ?? lastOperationSummary.blockedCount ?? 0}</strong>
                {' - '}Failed: <strong>{lastOperationSummary.failedCount ?? 0}</strong>
                {' - '}Operation ID: <span className="font-mono">{lastOperationSummary.operationId}</span>
              </div>
            </div>
            <button
              type="button"
              className="self-start rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:self-auto"
              onClick={() => setIsOperationsOpen(true)}
            >
              View Operation History
            </button>
          </div>
        </div>
      )}

      {isError ? (
        <ErrorState
          title="Failed to Load Maintenance Data"
          message={error instanceof Error ? error.message : 'Database error querying records.'}
          onRetry={() => refetchRecords()}
        />
      ) : (
        <CleanupDataTable
          domain={selectedDomain}
          records={records}
          isLoading={isLoadingRecords}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={isAllSelected}
          page={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={(p) => setPage(p)}
          onTriggerAction={handleTriggerAction}
        />
      )}

      <CleanupPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        preview={activePreview}
        isLoading={previewMutation.isPending}
        onConfirmExecute={handleConfirmExecute}
        isExecuting={executeMutation.isPending}
      />

      <CleanupOperationsDrawer
        isOpen={isOperationsOpen}
        onClose={() => setIsOperationsOpen(false)}
        operations={operationsData?.operations || []}
        isLoading={isLoadingOperations}
        onRollback={handleRollback}
        isRollingBack={rollbackMutation.isPending}
      />
    </div>
  );
}
