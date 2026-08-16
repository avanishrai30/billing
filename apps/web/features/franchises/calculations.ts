import type {
  FranchiseDoc,
  FranchiseSupplyOrderDoc,
  FranchiseSupplyOrderItem,
  FranchiseSummaryMetrics
} from './types';

export function calculateSupplyOrderTotals(items: FranchiseSupplyOrderItem[]): {
  subtotal: number;
  tax: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const lineTotal = (item.supplyPrice || 0) * (item.qty || 0);
    subtotal += lineTotal;
    const gstRate = item.gst || 0;
    tax += (lineTotal * gstRate) / 100;
  }

  const grandTotal = Math.round((subtotal + tax) * 100) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    grandTotal
  };
}

export function calculateFranchiseMetrics(
  franchises: FranchiseDoc[],
  orders: FranchiseSupplyOrderDoc[]
): FranchiseSummaryMetrics {
  const totalFranchises = franchises.length;
  const activeFranchises = franchises.filter((f) => f.status === 'active').length;
  const totalSupplyOrders = orders.length;

  let totalEarnings = 0;
  let pendingReceivables = 0;

  for (const o of orders) {
    const amount = Number(o.grandTotal ?? 0);
    if (o.paymentStatus === 'paid') {
      totalEarnings += amount;
    } else {
      pendingReceivables += amount;
    }
  }

  return {
    totalFranchises,
    activeFranchises,
    totalSupplyOrders,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    pendingReceivables: Math.round(pendingReceivables * 100) / 100
  };
}
