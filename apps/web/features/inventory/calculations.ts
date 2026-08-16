import type { StockStatus, MovementType } from './types';

/**
 * Pure Domain Calculations for Inventory
 */

export function calculateAvailableStock(quantity: number, reservedQuantity = 0): number {
  const qty = Number(quantity) || 0;
  const reserved = Number(reservedQuantity) || 0;
  return Math.max(0, qty - reserved);
}

export function deriveStockStatus(quantity: number, reorderLevel = 10): StockStatus {
  const qty = Number(quantity) || 0;
  const threshold = Number(reorderLevel) || 10;

  if (qty <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (qty <= threshold) {
    return 'LOW_STOCK';
  }
  return 'HEALTHY';
}

export function calculateStockValuation(quantity: number, unitCost = 0): number {
  const qty = Number(quantity) || 0;
  const cost = Number(unitCost) || 0;
  return Math.round(qty * cost * 100) / 100;
}

export function getMovementTypeBadgeConfig(type: MovementType): {
  label: string;
  variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  isNegative: boolean;
} {
  switch (type) {
    case 'PURCHASE':
      return { label: 'Purchase In', variant: 'success', isNegative: false };
    case 'SALE':
      return { label: 'POS Sale', variant: 'info', isNegative: true };
    case 'TRANSFER_IN':
      return { label: 'Transfer In', variant: 'success', isNegative: false };
    case 'TRANSFER_OUT':
      return { label: 'Transfer Out', variant: 'warning', isNegative: true };
    case 'MANUAL_ADJUSTMENT':
      return { label: 'Manual Adj', variant: 'info', isNegative: false };
    case 'VOID':
      return { label: 'Void Reversal', variant: 'neutral', isNegative: false };
    case 'DAMAGE':
      return { label: 'Damage / Loss', variant: 'danger', isNegative: true };
    default:
      return { label: type, variant: 'neutral', isNegative: false };
  }
}
