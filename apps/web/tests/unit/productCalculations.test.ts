import {
  calculateProductMargin,
  calculatePriceWithTax,
  calculateProductSummaryMetrics
} from '../../features/products/calculations';
import type { ProductDoc } from '../../features/products/types';

describe('Product Calculations Unit Suite', () => {
  it('1. Computes product gross margin percentage accurately', () => {
    // Selling 500, Cost 350 -> Margin = (150 / 500) * 100 = 30%
    expect(calculateProductMargin(500, 350)).toBe(30);

    // Selling 100, Cost 80 -> Margin = (20 / 100) * 100 = 20%
    expect(calculateProductMargin(100, 80)).toBe(20);

    // Zero or negative selling price handles gracefully
    expect(calculateProductMargin(0, 50)).toBe(0);
    expect(calculateProductMargin(-10, 50)).toBe(0);
  });

  it('2. Computes tax-inclusive selling price', () => {
    // Base 1000 with 18% GST -> 1180
    expect(calculatePriceWithTax(1000, 18)).toBe(1180);

    // Base 500 with 5% GST -> 525
    expect(calculatePriceWithTax(500, 5)).toBe(525);

    // Base 200 with 0% GST -> 200
    expect(calculatePriceWithTax(200, 0)).toBe(200);
  });

  it('3. Aggregates product catalog summary metrics', () => {
    const mockProducts: ProductDoc[] = [
      {
        id: 'prd-1',
        name: 'A2 Milk 1L',
        sku: 'MILK-1L',
        purchasePrice: 60,
        sellingPrice: 80,
        category: 'Dairy',
        brand: 'VC Organic',
        type: 'OWN',
        sellingMode: 'packaged',
        status: 'active'
      },
      {
        id: 'prd-2',
        name: 'Organic Honey 500g',
        sku: 'HONEY-500',
        purchasePrice: 200,
        sellingPrice: 300,
        category: 'Pantry',
        brand: 'VC Organic',
        type: 'OWN',
        sellingMode: 'packaged',
        status: 'active'
      },
      {
        id: 'prd-3',
        name: 'Loose Tomatoes 1kg',
        sku: 'TOM-1KG',
        purchasePrice: 20,
        sellingPrice: 40,
        category: 'Vegetables',
        brand: 'Local Farm',
        type: 'EXTERNAL',
        sellingMode: 'loose',
        status: 'active'
      },
      {
        id: 'prd-archived',
        name: 'Discontinued Paneer',
        sku: 'PAN-DISC',
        purchasePrice: 100,
        sellingPrice: 150,
        isArchived: true,
        status: 'archived'
      }
    ];

    const metrics = calculateProductSummaryMetrics(mockProducts);

    expect(metrics.totalCatalogProducts).toBe(3); // Excludes archived
    expect(metrics.ownBrandCount).toBe(2);
    expect(metrics.externalBrandCount).toBe(1);
    expect(metrics.packagedCount).toBe(2);
    expect(metrics.looseCount).toBe(1);
    expect(metrics.categoriesCount).toBe(3);
    expect(metrics.brandsCount).toBe(2);
    expect(metrics.avgMarginPercent).toBeGreaterThan(0);
  });
});
