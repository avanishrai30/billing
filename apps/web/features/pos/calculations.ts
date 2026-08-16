import type { POSCartItem, POSTotals } from './types';

/**
 * Pure calculation functions for POS Terminal.
 * Zero DOM, zero network dependencies, 100% pure and deterministic.
 */

export interface LineCalculationInput {
  price: number;
  quantity: number;
  gst?: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface LineCalculationResult {
  taxableValue: number;
  taxAmount: number;
  discountTotal: number;
  lineTotal: number;
}

/**
 * Computes taxable base, GST tax amount, item discount, and gross line total.
 */
export function calculatePOSLine(input: LineCalculationInput): LineCalculationResult {
  const price = Math.max(0, Number(input.price) || 0);
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const gstRate = Math.max(0, Number(input.gst) || 0);
  const discountPercent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
  const explicitDiscount = Math.max(0, Number(input.discountAmount) || 0);

  const gross = Math.round(price * quantity * 100) / 100;

  let discountTotal = 0;
  if (explicitDiscount > 0) {
    discountTotal = Math.min(gross, explicitDiscount);
  } else if (discountPercent > 0) {
    discountTotal = Math.round((gross * (discountPercent / 100)) * 100) / 100;
  }

  const taxableValue = Math.max(0, Math.round((gross - discountTotal) * 100) / 100);
  const taxAmount = Math.round((taxableValue * (gstRate / 100)) * 100) / 100;
  const lineTotal = Math.round((taxableValue + taxAmount) * 100) / 100;

  return {
    taxableValue,
    taxAmount,
    discountTotal,
    lineTotal
  };
}

/**
 * Computes aggregate totals across all cart items plus any cart-level discount.
 */
export function calculatePOSTotals(
  cartItems: POSCartItem[],
  globalDiscount: number = 0
): POSTotals {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      subtotal: 0,
      itemDiscountTotal: 0,
      cartDiscount: 0,
      taxableTotal: 0,
      taxTotal: 0,
      grandTotal: 0
    };
  }

  let subtotal = 0;
  let itemDiscountTotal = 0;
  let taxTotal = 0;

  for (const item of cartItems) {
    const calc = calculatePOSLine({
      price: item.price,
      quantity: item.quantity,
      gst: item.gst,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount
    });

    subtotal += item.price * item.quantity;
    itemDiscountTotal += calc.discountTotal;
    taxTotal += calc.taxAmount;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  itemDiscountTotal = Math.round(itemDiscountTotal * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;

  const cartDiscount = Math.max(0, Math.round(Number(globalDiscount || 0) * 100) / 100);
  const taxableTotal = Math.max(0, Math.round((subtotal - itemDiscountTotal - cartDiscount) * 100) / 100);
  const grandTotal = Math.max(0, Math.round((taxableTotal + taxTotal) * 100) / 100);

  return {
    subtotal,
    itemDiscountTotal,
    cartDiscount,
    taxableTotal,
    taxTotal,
    grandTotal
  };
}
