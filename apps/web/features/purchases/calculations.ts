import type { PurchaseItem, PurchaseTransport, PurchaseTotals } from './types';

/**
 * Pure function: Deterministically calculates individual item line amounts
 */
export function calculatePurchaseLine(
  item: Partial<PurchaseItem>
): {
  taxableValue: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
} {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const cost = Math.max(0, Number(item.cost) || 0);
  const discountPercent = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
  const gstRate = Math.max(0, Number(item.gstRate) || 0);

  const rawSubtotal = quantity * cost;
  const discountAmount = Math.round((rawSubtotal * (discountPercent / 100)) * 100) / 100;
  const taxableValue = Math.max(0, Math.round((rawSubtotal - discountAmount) * 100) / 100);
  const taxAmount = Math.round((taxableValue * (gstRate / 100)) * 100) / 100;
  const lineTotal = Math.round((taxableValue + taxAmount) * 100) / 100;

  return {
    taxableValue,
    discountAmount,
    taxAmount,
    lineTotal
  };
}

/**
 * Pure function: Deterministically calculates grand totals across items and freight
 */
export function calculatePurchaseTotals(
  items: Partial<PurchaseItem>[],
  transport?: Partial<PurchaseTransport>,
  otherChargesInput: number = 0
): PurchaseTotals {
  let goodsSubtotal = 0;
  let itemDiscountTotal = 0;
  let goodsTaxable = 0;
  let goodsGstTotal = 0;

  items.forEach((item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.cost) || 0);
    const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
    const gst = Math.max(0, Number(item.gstRate) || 0);

    const raw = qty * rate;
    const disc = Math.round((raw * (discPct / 100)) * 100) / 100;
    const taxable = Math.max(0, Math.round((raw - disc) * 100) / 100);
    const tax = Math.round((taxable * (gst / 100)) * 100) / 100;

    goodsSubtotal += raw;
    itemDiscountTotal += disc;
    goodsTaxable += taxable;
    goodsGstTotal += tax;
  });

  let freightCharge = 0;
  let freightGst = 0;

  if (transport && transport.enabled) {
    freightCharge = Math.max(0, Number(transport.charge) || 0);
    const freightGstRate = Math.max(0, Number(transport.taxRate) || 0);
    freightGst = Math.round((freightCharge * (freightGstRate / 100)) * 100) / 100;
  }

  const otherCharges = Math.max(0, Number(otherChargesInput) || 0);

  const grandTotal = Math.round(
    (goodsTaxable + goodsGstTotal + freightCharge + freightGst + otherCharges) * 100
  ) / 100;

  return {
    goodsSubtotal: Math.round(goodsSubtotal * 100) / 100,
    itemDiscountTotal: Math.round(itemDiscountTotal * 100) / 100,
    goodsTaxable: Math.round(goodsTaxable * 100) / 100,
    goodsGstTotal: Math.round(goodsGstTotal * 100) / 100,
    freightCharge: Math.round(freightCharge * 100) / 100,
    freightGst: Math.round(freightGst * 100) / 100,
    otherCharges: Math.round(otherCharges * 100) / 100,
    grandTotal
  };
}
