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
  | 'DAMAGE';

export type StockStatus = 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';

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

  // Joined product metadata for drawer
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
  quantity: number; // Target absolute quantity
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
  };
}
