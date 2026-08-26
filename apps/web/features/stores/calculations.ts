import type { StoreDoc, StoreSummaryMetrics } from './types';

/**
 * Pure Domain Calculations & Formatters for Stores
 */

export function calculateStoreMetrics(stores: StoreDoc[]): StoreSummaryMetrics {
  let activeStoresCount = 0;
  let inactiveStoresCount = 0;
  let hubStoresCount = 0;

  for (const s of stores) {
    if (s.status === 'active') {
      activeStoresCount += 1;
      if (s.isHub) {
        hubStoresCount += 1;
      }
    } else {
      inactiveStoresCount += 1;
    }
  }

  return {
    totalStores: stores.length,
    activeStoresCount,
    inactiveStoresCount,
    hubStoresCount
  };
}

export function formatStoreCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}
