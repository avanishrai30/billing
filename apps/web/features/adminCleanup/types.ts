export type CleanupDomain = 'invoices' | 'inventory' | 'products' | 'purchases';

export type CleanupAction =
  | 'archive'
  | 'void'
  | 'purge'
  | 'restore'
  | 'reset_test_stock'
  | 'remove_orphans';

export interface CleanupFilterState {
  search: string;
  datePreset: 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'custom';
  startDate?: string;
  endDate?: string;
  storeId?: string;
  status?: string;
  customerId?: string;
  supplierId?: string;
  category?: string;
  brand?: string;
  paymentMode?: string;
  stockStatus?: 'all' | 'zero' | 'positive' | 'orphan';
  selectAllFiltered?: boolean;
}

export interface CleanupRecordSummary {
  id: string;
  label: string;
  action: string;
  details: string;
}

export interface CleanupBlockedRecord {
  id: string;
  label: string;
  reason: string;
}

export interface CleanupPreviewResult {
  domain: CleanupDomain;
  action: CleanupAction;
  totalSelected: number;
  eligibleCount: number;
  blockedCount: number;
  stockReversalUnits: number;
  financialImpact: number;
  orphanInventoryImpact?: {
    recordCount: number;
    totalQuantity: number;
    locations: Array<{ locationId: string; quantity: number }>;
    batchReferences: Array<{
      inventoryId: string;
      productId: string;
      batchId: string;
      lotNumber: string;
      remainingQuantity: number;
      locationId: string;
    }>;
    ledgerReferences: Array<{
      inventoryId: string;
      productId: string;
      movementId: string;
      referenceType: string;
      referenceId: string;
      quantity: number;
      locationId: string;
    }>;
  } | null;
  reversible: boolean;
  eligibleRecords: CleanupRecordSummary[];
  blockedRecords: CleanupBlockedRecord[];
  warnings: string[];
  previewToken: string | null;
}

export interface CleanupExecutionResult {
  operationId: string;
  domain: CleanupDomain;
  action: CleanupAction;
  processedCount: number;
  cleanedCount?: number;
  skippedCount?: number;
  blockedCount?: number;
  failedCount?: number;
  reversible: boolean;
  completedAt: string;
}

export interface CleanupOperationDoc {
  operationId: string;
  domain: CleanupDomain;
  action: CleanupAction;
  status: 'QUEUED' | 'EXECUTING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED';
  actorUserId: string;
  actorUsername: string;
  previewToken?: string;
  reversible: boolean;
  rolledBack: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string;
  totalTargeted: number;
  successCount: number;
  failureCount: number;
  stockReversalUnits: number;
  financialImpact: number;
  affectedRecordIds: string[];
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  selectedCount?: number;
  eligibleIds?: string[];
  blockedIds?: string[];
  skippedCount?: number;
  confirmedAt?: string;
}

export interface CleanupDomainSummary {
  invoices: {
    total: number;
    active: number;
    archived: number;
    voided: number;
    potentialCleanup: number;
  };
  purchases: {
    total: number;
    active: number;
    archived: number;
    voided: number;
    potentialCleanup: number;
  };
  products: {
    total: number;
    active: number;
    archived: number;
    potentialCleanup: number;
  };
  inventory: {
    totalRecords: number;
    zeroStock: number;
    orphanRecords?: number;
    orphanQuantity?: number;
    totalLedgerEntries: number;
    potentialCleanup: number;
  };
  lastOperation: CleanupOperationDoc | null;
}

export interface CleanupQueryResult<T = any> {
  records: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
