import {
  calculatePurchaseLine,
  calculatePurchaseTotals
} from '../../features/purchases/calculations';
import type { PurchaseItem, PurchaseTransport } from '../../features/purchases/types';

describe('Purchase Financial Calculations (Pure Functions)', () => {
  describe('1. calculatePurchaseLine()', () => {
    it('calculates standard 5% GST item with zero discount', () => {
      const item: Partial<PurchaseItem> = {
        quantity: 10,
        cost: 50,
        discountPercent: 0,
        gstRate: 5
      };

      const result = calculatePurchaseLine(item);
      expect(result.discountAmount).toBe(0);
      expect(result.taxableValue).toBe(500); // 10 * 50
      expect(result.taxAmount).toBe(25); // 500 * 0.05
      expect(result.lineTotal).toBe(525); // 500 + 25
    });

    it('calculates 18% GST item with 10% discount and decimal rounding', () => {
      const item: Partial<PurchaseItem> = {
        quantity: 3,
        cost: 155.5,
        discountPercent: 10,
        gstRate: 18
      };

      // Raw subtotal = 466.50
      // Discount = 46.65
      // Taxable = 419.85
      // Tax = 419.85 * 0.18 = 75.573 -> 75.57
      // Total = 419.85 + 75.57 = 495.42
      const result = calculatePurchaseLine(item);
      expect(result.discountAmount).toBe(46.65);
      expect(result.taxableValue).toBe(419.85);
      expect(result.taxAmount).toBe(75.57);
      expect(result.lineTotal).toBe(495.42);
    });

    it('handles zero quantity or negative values safely', () => {
      const result = calculatePurchaseLine({ quantity: 0, cost: 100, gstRate: 12 });
      expect(result.taxableValue).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.lineTotal).toBe(0);
    });
  });

  describe('2. calculatePurchaseTotals()', () => {
    it('aggregates multi-item purchase without transport', () => {
      const items: Partial<PurchaseItem>[] = [
        { quantity: 10, cost: 100, discountPercent: 0, gstRate: 5 }, // Taxable: 1000, Tax: 50, Total: 1050
        { quantity: 2, cost: 500, discountPercent: 10, gstRate: 18 } // Raw: 1000, Disc: 100, Taxable: 900, Tax: 162, Total: 1062
      ];

      const totals = calculatePurchaseTotals(items, { enabled: false, charge: 0, taxRate: 0, taxAmount: 0 });

      expect(totals.goodsSubtotal).toBe(2000);
      expect(totals.itemDiscountTotal).toBe(100);
      expect(totals.goodsTaxable).toBe(1900);
      expect(totals.goodsGstTotal).toBe(212); // 50 + 162
      expect(totals.freightCharge).toBe(0);
      expect(totals.freightGst).toBe(0);
      expect(totals.grandTotal).toBe(2112); // 1900 + 212
    });

    it('aggregates purchase with freight and other charges', () => {
      const items: Partial<PurchaseItem>[] = [
        { quantity: 5, cost: 200, discountPercent: 0, gstRate: 12 } // Taxable: 1000, Tax: 120, Total: 1120
      ];

      const transport: PurchaseTransport = {
        enabled: true,
        charge: 500,
        taxRate: 5,
        taxAmount: 25,
        mode: 'ROAD'
      };

      const totals = calculatePurchaseTotals(items, transport, 50);

      // Goods Taxable = 1000
      // Goods GST = 120
      // Freight = 500
      // Freight GST = 25
      // Other Charges = 50
      // Grand Total = 1000 + 120 + 500 + 25 + 50 = 1695
      expect(totals.goodsTaxable).toBe(1000);
      expect(totals.goodsGstTotal).toBe(120);
      expect(totals.freightCharge).toBe(500);
      expect(totals.freightGst).toBe(25);
      expect(totals.otherCharges).toBe(50);
      expect(totals.grandTotal).toBe(1695);
    });
  });
});
