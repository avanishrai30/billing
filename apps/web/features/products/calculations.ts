import type { ProductDoc, ProductSummaryMetrics } from './types';

/**
 * Computes gross profit margin percentage for a product:
 * margin = ((sellingPrice - purchasePrice) / sellingPrice) * 100
 */
export function calculateProductMargin(sellingPrice: number, purchasePrice: number): number {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  const margin = ((sellingPrice - purchasePrice) / sellingPrice) * 100;
  return Math.max(0, Math.round(margin * 10) / 10);
}

/**
 * Computes tax-inclusive selling price given a base price and GST percentage rate.
 */
export function calculatePriceWithTax(basePrice: number, gstRate: number): number {
  if (!basePrice || basePrice < 0) return 0;
  if (!gstRate || gstRate <= 0) return basePrice;
  const taxAmount = (basePrice * gstRate) / 100;
  return Math.round((basePrice + taxAmount) * 100) / 100;
}

/**
 * Aggregates high-level metrics across the tenant product catalog.
 */
export function calculateProductSummaryMetrics(products: ProductDoc[]): ProductSummaryMetrics {
  const activeProducts = products.filter((p) => !p.isArchived && p.status !== 'archived');
  const total = activeProducts.length;

  if (total === 0) {
    return {
      totalCatalogProducts: 0,
      ownBrandCount: 0,
      externalBrandCount: 0,
      packagedCount: 0,
      looseCount: 0,
      categoriesCount: 0,
      brandsCount: 0,
      avgMarginPercent: 0
    };
  }

  let ownBrandCount = 0;
  let externalBrandCount = 0;
  let packagedCount = 0;
  let looseCount = 0;
  let totalMargin = 0;

  const categories = new Set<string>();
  const brands = new Set<string>();

  for (const p of activeProducts) {
    if ((p.type || 'OWN').toUpperCase() === 'EXTERNAL') {
      externalBrandCount++;
    } else {
      ownBrandCount++;
    }

    if (p.sellingMode === 'loose' || p.sellingMode === 'weight_based') {
      looseCount++;
    } else {
      packagedCount++;
    }

    if (p.category && p.category.trim()) {
      categories.add(p.category.trim());
    }

    if (p.brand && p.brand.trim()) {
      brands.add(p.brand.trim());
    }

    const margin = calculateProductMargin(p.sellingPrice || p.price || 0, p.purchasePrice || p.cost || 0);
    totalMargin += margin;
  }

  const avgMarginPercent = Math.round((totalMargin / total) * 10) / 10;

  return {
    totalCatalogProducts: total,
    ownBrandCount,
    externalBrandCount,
    packagedCount,
    looseCount,
    categoriesCount: categories.size,
    brandsCount: brands.size,
    avgMarginPercent
  };
}
