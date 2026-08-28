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

/**
 * Normalizes Indian and international phone numbers into a canonical 10-digit format for lookups.
 * Handles formats like:
 * "+91 98220 11223" -> "9822011223"
 * "919822011223"   -> "9822011223"
 * "09822011223"    -> "9822011223"
 * "98220-11223"    -> "9822011223"
 */
export function normalizeCustomerPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Formats a 10-digit phone for human readable presentation.
 */
export function formatPhoneDisplay(phone?: string | null): string {
  const norm = normalizeCustomerPhone(phone);
  if (!norm) return '';
  if (norm.length === 10) {
    return `+91 ${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return phone || norm;
}

/**
 * Computes returnable item quantities given an original invoice and prior return transactions.
 */
export function calculateReturnableQuantities(
  invoice: any,
  priorReturns: any[] = []
): any[] {
  if (!invoice || !Array.isArray(invoice.items)) return [];

  const returnedQtyMap: Record<string, number> = {};
  for (const ret of priorReturns) {
    for (const item of ret.returnedItems || []) {
      const pid = item.productId || item.id;
      returnedQtyMap[pid] = (returnedQtyMap[pid] || 0) + (Number(item.quantity) || 0);
    }
  }

  return invoice.items.map((it: any) => {
    const pid = it.productId || it.id;
    const soldQty = Number(it.quantity) || 0;
    const returnedQty = returnedQtyMap[pid] || 0;
    const returnableQty = Math.max(0, soldQty - returnedQty);

    return {
      ...it,
      productId: pid,
      soldQuantity: soldQty,
      alreadyReturnedQuantity: returnedQty,
      returnableQuantity: returnableQty
    };
  });
}

/**
 * Computes exchange financial totals: return credit vs replacement cost and net difference.
 */
export function calculateExchangeTotals(
  returnItems: Array<{ price: number; quantity: number; gst?: number }>,
  replacementItems: Array<{ price: number; quantity: number; gst?: number }>,
  discount: number = 0
): {
  returnCredit: number;
  replacementSubtotal: number;
  replacementTax: number;
  replacementGrandTotal: number;
  netDifference: number;
  netPayable: number;
  refundDue: number;
} {
  let returnCredit = 0;
  for (const it of returnItems) {
    const p = Math.max(0, Number(it.price) || 0);
    const q = Math.max(0, Number(it.quantity) || 0);
    const g = Math.max(0, Number(it.gst) || 0);
    const gross = p * q;
    const tax = (gross * g) / 100;
    returnCredit += gross + tax;
  }
  returnCredit = Math.round(returnCredit * 100) / 100;

  let replacementSubtotal = 0;
  let replacementTax = 0;
  for (const it of replacementItems) {
    const p = Math.max(0, Number(it.price) || 0);
    const q = Math.max(0, Number(it.quantity) || 0);
    const g = Math.max(0, Number(it.gst) || 0);
    const gross = p * q;
    const tax = (gross * g) / 100;
    replacementSubtotal += gross;
    replacementTax += tax;
  }

  const d = Math.max(0, Number(discount) || 0);
  const replacementGrandTotal = Math.max(0, Math.round((replacementSubtotal + replacementTax - d) * 100) / 100);
  const netDifference = Math.round((replacementGrandTotal - returnCredit) * 100) / 100;

  return {
    returnCredit,
    replacementSubtotal: Math.round(replacementSubtotal * 100) / 100,
    replacementTax: Math.round(replacementTax * 100) / 100,
    replacementGrandTotal,
    netDifference,
    netPayable: netDifference > 0 ? netDifference : 0,
    refundDue: netDifference < 0 ? Math.abs(netDifference) : 0
  };
}
