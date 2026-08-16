import {
  calculatePOSLine,
  calculatePOSTotals
} from '../../features/pos/calculations';
import type { POSCartItem } from '../../features/pos/types';

describe('POS Terminal Financial Calculations', () => {
  it('1. Computes line taxable base and GST tax without discount', () => {
    const res = calculatePOSLine({
      price: 500,
      quantity: 2,
      gst: 18
    });

    expect(res.taxableValue).toBe(1000);
    expect(res.taxAmount).toBe(180);
    expect(res.discountTotal).toBe(0);
    expect(res.lineTotal).toBe(1180);
  });

  it('2. Computes percentage item discount correctly', () => {
    const res = calculatePOSLine({
      price: 200,
      quantity: 1,
      gst: 5,
      discountPercent: 10 // 10% off of 200 = 20
    });

    expect(res.discountTotal).toBe(20);
    expect(res.taxableValue).toBe(180);
    expect(res.taxAmount).toBe(9);
    expect(res.lineTotal).toBe(189);
  });

  it('3. Computes explicit fixed amount discount correctly', () => {
    const res = calculatePOSLine({
      price: 150,
      quantity: 2, // gross = 300
      gst: 12,
      discountAmount: 50
    });

    expect(res.discountTotal).toBe(50);
    expect(res.taxableValue).toBe(250);
    expect(res.taxAmount).toBe(30);
    expect(res.lineTotal).toBe(280);
  });

  it('4. Handles zero quantity and negative inputs gracefully', () => {
    const res = calculatePOSLine({
      price: -100,
      quantity: 0,
      gst: -5
    });

    expect(res.taxableValue).toBe(0);
    expect(res.taxAmount).toBe(0);
    expect(res.lineTotal).toBe(0);
  });

  it('5. Computes multi-item cart aggregate totals and global discount', () => {
    const items: POSCartItem[] = [
      {
        productId: 'p-1',
        name: 'Item A',
        unit: 'unit',
        price: 100,
        cost: 60,
        gst: 10,
        quantity: 2,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 200,
        taxAmount: 20,
        lineTotal: 220
      },
      {
        productId: 'p-2',
        name: 'Item B',
        unit: 'kg',
        price: 300,
        cost: 200,
        gst: 5,
        quantity: 1,
        discountPercent: 10, // 30 discount
        discountAmount: 0,
        taxableValue: 270,
        taxAmount: 13.5,
        lineTotal: 283.5
      }
    ];

    const totals = calculatePOSTotals(items, 50); // 50 cart discount

    expect(totals.subtotal).toBe(500); // 200 + 300
    expect(totals.itemDiscountTotal).toBe(30);
    expect(totals.cartDiscount).toBe(50);
    expect(totals.taxTotal).toBe(33.5); // 20 + 13.5
    expect(totals.taxableTotal).toBe(420); // 500 - 30 - 50
    expect(totals.grandTotal).toBe(453.5); // 420 + 33.5
  });

  it('6. Returns all zeroes for empty cart', () => {
    const totals = calculatePOSTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.taxTotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });
});
