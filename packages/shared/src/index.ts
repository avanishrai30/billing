// Shared utility logic and constants

export const GST_SLABS = [0, 5, 12, 18, 28] as const;

export function calculateGSTInclusive(price: number, gstRate: number): { basePrice: number; taxAmount: number } {
  if (gstRate <= 0) {
    return { basePrice: price, taxAmount: 0 };
  }
  const basePrice = price / (1 + gstRate / 100);
  const taxAmount = price - basePrice;
  return {
    basePrice: Number(basePrice.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2))
  };
}

export function calculateGSTExclusive(price: number, gstRate: number): { basePrice: number; taxAmount: number; totalPrice: number } {
  const taxAmount = price * (gstRate / 100);
  const totalPrice = price + taxAmount;
  return {
    basePrice: Number(price.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2))
  };
}
