import {
  PurchaseItemSchema,
  PurchaseTransportSchema,
  PurchaseFormSchema,
  PurchasesListResponseSchema
} from '../../features/purchases/schemas';

describe('Purchase Zod Runtime Schema Validation', () => {
  it('1. Validates and parses a valid purchase line item', () => {
    const item = {
      name: 'Organic Buffalo Milk 500ml',
      sku: 'AIA-BUF-500',
      quantity: 50,
      unit: 'packet',
      cost: 32,
      discountPercent: 0,
      gstRate: 0,
      taxableValue: 1600,
      taxAmount: 0,
      lineTotal: 1600
    };

    const parsed = PurchaseItemSchema.parse(item);
    expect(parsed.name).toBe('Organic Buffalo Milk 500ml');
    expect(parsed.quantity).toBe(50);
    expect(parsed.cost).toBe(32);
  });

  it('2. Fails when item quantity is 0 or negative', () => {
    const item = {
      name: 'Milk',
      quantity: 0,
      cost: 10
    };

    expect(() => PurchaseItemSchema.parse(item)).toThrow();
  });

  it('3. Validates transport schema with defaults', () => {
    const transport = {
      enabled: true,
      transporter: 'Navata Road Transport',
      charge: 1200
    };

    const parsed = PurchaseTransportSchema.parse(transport);
    expect(parsed.enabled).toBe(true);
    expect(parsed.mode).toBe('ROAD');
    expect(parsed.charge).toBe(1200);
  });

  it('4. Parses complete PurchasesListResponseSchema', () => {
    const response = {
      success: true,
      purchases: [
        {
          id: 'pur-101',
          purchaseId: 'PO-2026-001',
          supplierName: 'Amul Dairy',
          locationId: 'store-1',
          grandTotal: 45000,
          status: 'RECEIVED',
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    const parsed = PurchasesListResponseSchema.parse(response);
    expect(parsed.purchases.length).toBe(1);
    expect(parsed.purchases[0].id).toBe('pur-101');
    expect(parsed.pagination.total).toBe(1);
  });
});
