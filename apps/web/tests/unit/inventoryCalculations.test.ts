import {
  calculateAvailableStock,
  deriveStockStatus,
  calculateStockValuation,
  getMovementTypeBadgeConfig
} from '../../features/inventory/calculations';

describe('Inventory Pure Domain Calculations', () => {
  it('1. Calculates available stock deducting reserved units', () => {
    expect(calculateAvailableStock(50, 10)).toBe(40);
    expect(calculateAvailableStock(20, 0)).toBe(20);
    expect(calculateAvailableStock(5, 10)).toBe(0); // Clamps to zero
  });

  it('2. Correctly categorizes stock status against reorder threshold', () => {
    // Out of stock
    expect(deriveStockStatus(0, 10)).toBe('OUT_OF_STOCK');
    expect(deriveStockStatus(-2, 10)).toBe('OUT_OF_STOCK');

    // Low stock
    expect(deriveStockStatus(5, 10)).toBe('LOW_STOCK');
    expect(deriveStockStatus(10, 10)).toBe('LOW_STOCK');

    // Healthy in stock
    expect(deriveStockStatus(11, 10)).toBe('HEALTHY');
    expect(deriveStockStatus(100, 10)).toBe('HEALTHY');
  });

  it('3. Computes inventory asset valuation based on cost', () => {
    expect(calculateStockValuation(50, 120)).toBe(6000);
    expect(calculateStockValuation(12.5, 40)).toBe(500);
    expect(calculateStockValuation(0, 500)).toBe(0);
  });

  it('4. Provides accurate movement badge configurations', () => {
    const sale = getMovementTypeBadgeConfig('SALE');
    expect(sale.label).toBe('POS Sale');
    expect(sale.isNegative).toBe(true);

    const purchase = getMovementTypeBadgeConfig('PURCHASE');
    expect(purchase.label).toBe('Purchase In');
    expect(purchase.isNegative).toBe(false);

    const transferIn = getMovementTypeBadgeConfig('TRANSFER_IN');
    expect(transferIn.label).toBe('Transfer In');

    const damage = getMovementTypeBadgeConfig('DAMAGE');
    expect(damage.label).toBe('Damage / Loss');
    expect(damage.variant).toBe('danger');
  });
});
