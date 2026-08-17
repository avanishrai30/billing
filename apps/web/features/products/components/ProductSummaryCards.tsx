'use client';

import React from 'react';
import { Package, ShieldCheck, Scale, Percent } from 'lucide-react';
import { MetricCard } from '../../../components/ui';
import type { ProductSummaryMetrics } from '../types';

export interface ProductSummaryCardsProps {
  metrics: ProductSummaryMetrics;
  isLoading?: boolean;
}

export function ProductSummaryCards({ metrics, isLoading = false }: ProductSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <MetricCard
        title="Total Active SKUs"
        metric={isLoading ? '...' : metrics.totalCatalogProducts.toLocaleString('en-IN')}
        description={`${metrics.categoriesCount} Categories • ${metrics.brandsCount} Brands`}
      />

      <MetricCard
        title="Catalog Classification"
        metric={
          isLoading
            ? '...'
            : `${metrics.ownBrandCount} Own / ${metrics.externalBrandCount} Ext`
        }
        description="Private Label vs External Brands"
      />

      <MetricCard
        title="Selling Formats"
        metric={
          isLoading
            ? '...'
            : `${metrics.packagedCount} Pack / ${metrics.looseCount} Loose`
        }
        description="Packaged vs Weighed Commodities"
      />

      <MetricCard
        title="Avg Retail Margin"
        metric={isLoading ? '...' : `${metrics.avgMarginPercent}%`}
        description="Based on Purchase vs Selling Price"
      />
    </div>
  );
}
