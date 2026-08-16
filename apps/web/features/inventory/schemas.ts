import { z } from 'zod';

export const inventorySummarySchema = z.object({
  totalProducts: z.number().nonnegative(),
  totalTrackedItems: z.number().nonnegative(),
  totalUnits: z.number().nonnegative(),
  lowStockCount: z.number().nonnegative(),
  outOfStockCount: z.number().nonnegative(),
  inventoryValue: z.number().nonnegative(),
  locationId: z.string()
});

export const inventoryBalanceSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  quantity: z.number(),
  reservedQuantity: z.number().default(0),
  reorderLevel: z.number().default(10),
  locationType: z.string().optional(),
  version: z.number().optional(),
  updatedAt: z.string().optional()
});

export const inventoryLedgerLogSchema = z.object({
  movementId: z.string(),
  productId: z.string(),
  locationId: z.string(),
  type: z.enum([
    'SALE',
    'PURCHASE',
    'MANUAL_ADJUSTMENT',
    'TRANSFER_IN',
    'TRANSFER_OUT',
    'VOID',
    'DAMAGE'
  ]),
  quantity: z.number(),
  beforeQuantity: z.number(),
  afterQuantity: z.number(),
  unitCost: z.number(),
  totalValue: z.number(),
  referenceId: z.string(),
  performedBy: z.string(),
  notes: z.string().optional(),
  createdAt: z.string()
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product selection is required'),
  locationId: z.string().min(1, 'Store location is required'),
  quantity: z.coerce.number().min(0, 'Target quantity must be non-negative'),
  type: z.string().default('MANUAL_ADJUSTMENT'),
  referenceId: z.string().optional(),
  notes: z.string().min(3, 'Audit reason / note must be at least 3 characters'),
  cost: z.coerce.number().nonnegative().optional()
});

export const stockTransferSchema = z
  .object({
    productId: z.string().min(1, 'Product selection is required'),
    fromLocationId: z.string().min(1, 'Source outlet is required'),
    toLocationId: z.string().min(1, 'Destination outlet is required'),
    quantity: z.coerce.number().positive('Transfer quantity must be greater than 0'),
    transferId: z.string().optional(),
    notes: z.string().optional()
  })
  .refine((data) => data.fromLocationId !== data.toLocationId, {
    message: 'Source and Destination outlets must be different',
    path: ['toLocationId']
  });

export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>;
export type StockTransferFormValues = z.infer<typeof stockTransferSchema>;
