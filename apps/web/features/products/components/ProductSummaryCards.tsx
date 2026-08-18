'use client';

import React from 'react';
import { MetricCard } from '../../../components/ui';
import type { ProductSummaryMetrics } from '../types';

export interface ProductSummaryCardsProps {
  metrics: ProductSummaryMetrics;
  isLoading?: boolean;
}

export function ProductSummaryCards({ metrics, isLoading = false }: ProductSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        title="Total Active SKUs"
        metric={isLoading ? '...' : metrics.totalCatalogProducts.toLocaleString('en-IN')}
        description={`${metrics.categoriesCount} categories / ${metrics.brandsCount} brands`}
      />

      <MetricCard
        title="Catalog Classification"
        metric={
          isLoading
            ? '...'
            : `${metrics.ownBrandCount} Own / ${metrics.externalBrandCount} Ext`
        }
        description="Private label and vendor brands"
      />

      <MetricCard
        title="Selling Formats"
        metric={
          isLoading
            ? '...'
            : `${metrics.packagedCount} Pack / ${metrics.looseCount} Loose`
        }
        description="Packaged and weighed commodities"
      />

      <MetricCard
        title="Avg Retail Margin"
        metric={isLoading ? '...' : `${metrics.avgMarginPercent}%`}
        description="Purchase price against retail price"
      />
    </div>
  );
}
