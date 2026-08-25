/**
 * Authoritative Inventory Domain Types
 * Based on frozen backend contracts: modules/inventory.js & services/inventoryService.js
 */

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'MANUAL_ADJUSTMENT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'VOID'
  | 'DAMAGE'
  | 'CLEANUP_RESET';

export type StockStatus = 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_SOON' | 'ORPHAN';

export interface LocationStockBreakdown {
  locationId: string;
  locationName: string;
  isWarehouse: boolean;
  quantity: number;
  reservedQuantity: number;
  available: number;
}

export interface ProductBatchSummary {
  id: string;
  lotNumber: string;
  expiryDate?: string;
  manufactureDate?: string;
  remainingQuantity: number;
  locationId?: string;
}

export interface NetworkInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  brand?: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  reorderLevel: number;
  isOrphan: boolean;
  defaultExpiryDate?: string | null;
  networkQuantity: number;
  networkReserved: number;
  networkAvailable: number;
  locationBreakdown: LocationStockBreakdown[];
  batches: ProductBatchSummary[];
}

export interface CommandCenterSummary {
  totalProducts: number;
  catalogProducts?: number;
  stockedProducts?: number;
  networkStock: number;
  centralStock: number;
  storeStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  totalValuation: number;
}

export interface CommandCenterStore {
  id: string;
  name: string;
  code: string;
  isWarehouse: boolean;
}

export interface CommandCenterData {
  success: boolean;
  stores: CommandCenterStore[];
  networkBalances: NetworkInventoryItem[];
  summary: CommandCenterSummary;
}

export interface InventoryBalance {
  _id?: string;
  productId: string;
  locationId: string;
  storeId?: string;
  locationType?: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  version?: number;
  updatedAt?: string;

  // Joined catalog metadata for display
  productName?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  category?: string;
  brand?: string;
  cost?: number;
  price?: number;
  isOrphan?: boolean;
  batches?: ProductBatchSummary[];
}

export interface InventorySummary {
  totalProducts: number;
  totalTrackedItems: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
  locationId: string;
}

export interface InventoryLedgerLog {
  _id: string;
  movementId: string;
  id?: string;
  productId: string;
  locationId: string;
  storeId?: string;
  locationType?: string;
  type: MovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  unitCost: number;
  totalValue: number;
  referenceType?: string;
  referenceId: string;
  performedBy: string;
  notes?: string;
  createdAt: string;

  productName?: string;
  sku?: string;
  unit?: string;
}

export interface InventoryLogsResponse {
  success: boolean;
  data: InventoryLedgerLog[];
  pagination: {
    limit: number;
    nextCursor: string | null;
  };
}

export interface StockAvailabilityItem {
  productId: string;
  requested: number;
  available: number;
  unit?: string;
  name?: string;
}

export interface StockAvailabilityResponse {
  available: boolean;
  errors?: Array<{
    productId: string;
    name: string;
    requested: number;
    available: number;
  }>;
  items: StockAvailabilityItem[];
}

export interface StockAdjustmentPayload {
  productId: string;
  locationId: string;
  quantity: number;
  type?: string;
  referenceId?: string;
  notes?: string;
  cost?: number;
}

export interface StockTransferPayload {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  transferId?: string;
  transactionId?: string;
  batchId?: string;
  notes?: string;
}

export interface StockTransferResponse {
  success: boolean;
  message: string;
  referenceId?: string;
  duplicate?: boolean;
  transfer?: {
    success: boolean;
    referenceId: string;
    fromBefore: number;
    fromAfter: number;
    toBefore: number;
    toAfter: number;
    batchLotNumber?: string | null;
  };
}
