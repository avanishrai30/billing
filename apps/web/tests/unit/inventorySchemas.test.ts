import {
  inventorySummarySchema,
  inventoryBalanceSchema,
  inventoryLedgerLogSchema,
  stockAdjustmentSchema,
  stockTransferSchema
} from '../../features/inventory/schemas';

describe('Inventory Zod Validation Schemas', () => {
  it('1. Validates complete inventory summary schema', () => {
    const valid = {
      totalProducts: 15,
      totalTrackedItems: 12,
      totalUnits: 1450.5,
      lowStockCount: 2,
      outOfStockCount: 1,
      inventoryValue: 75400,
      locationId: 'store-1'
    };

    const res = inventorySummarySchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('2. Rejects negative units in summary', () => {
    const invalid = {
      totalProducts: 10,
      totalTrackedItems: 8,
      totalUnits: -5,
      lowStockCount: 0,
      outOfStockCount: 0,
      inventoryValue: 1000,
      locationId: 'store-1'
    };

    const res = inventorySummarySchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('3. Validates inventory balance record', () => {
    const validBalance = {
      productId: 'prod-101',
      locationId: 'store-1',
      quantity: 50,
      reservedQuantity: 5,
      reorderLevel: 10
    };

    const res = inventoryBalanceSchema.safeParse(validBalance);
    expect(res.success).toBe(true);
  });

  it('4. Validates stock adjustment payload', () => {
    const validAdjustment = {
      productId: 'prod-101',
      locationId: 'store-1',
      quantity: 45,
      type: 'MANUAL_ADJUSTMENT',
      notes: 'Physical count discrepancy reconciliation'
    };

    const res = stockAdjustmentSchema.safeParse(validAdjustment);
    expect(res.success).toBe(true);
  });

  it('5. Rejects stock adjustment with note shorter than 3 characters', () => {
    const shortNote = {
      productId: 'prod-101',
      locationId: 'store-1',
      quantity: 45,
      notes: 'ok'
    };

    const res = stockAdjustmentSchema.safeParse(shortNote);
    expect(res.success).toBe(false);
  });

  it('6. Validates stock transfer payload and enforces distinct source/destination', () => {
    const validTransfer = {
      productId: 'prod-101',
      fromLocationId: 'store-1',
      toLocationId: 'store-2',
      quantity: 10,
      notes: 'Outlet stock rebalancing'
    };

    const res = stockTransferSchema.safeParse(validTransfer);
    expect(res.success).toBe(true);
  });

  it('7. Rejects stock transfer where source and destination are identical', () => {
    const sameStoreTransfer = {
      productId: 'prod-101',
      fromLocationId: 'store-1',
      toLocationId: 'store-1',
      quantity: 10
    };

    const res = stockTransferSchema.safeParse(sameStoreTransfer);
    expect(res.success).toBe(false);
  });

  it('8. Validates ledger log schema', () => {
    const validLog = {
      movementId: 'mov-12345',
      productId: 'prod-101',
      locationId: 'store-1',
      type: 'SALE',
      quantity: -2,
      beforeQuantity: 50,
      afterQuantity: 48,
      unitCost: 100,
      totalValue: 200,
      referenceId: 'INV-2026-001',
      performedBy: 'cashier1',
      createdAt: new Date().toISOString()
    };

    const res = inventoryLedgerLogSchema.safeParse(validLog);
    expect(res.success).toBe(true);
  });
});
