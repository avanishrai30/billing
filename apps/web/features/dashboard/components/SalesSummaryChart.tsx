'use client';

import React from 'react';
import { Card, SectionHeader } from '../../../components/ui';
import type { DashboardMetrics } from '../types';

export interface SalesSummaryChartProps {
  metrics: DashboardMetrics;
}

export function SalesSummaryChart({ metrics }: SalesSummaryChartProps) {
  const maxFinancial = Math.max(
    metrics.totalSales,
    metrics.totalPurchases,
    metrics.stockAssetValuationRetail,
    1
  );

  const salesPct = Math.round((metrics.totalSales / maxFinancial) * 100);
  const purchasePct = Math.round((metrics.totalPurchases / maxFinancial) * 100);
  const stockCostPct = Math.round((metrics.stockAssetValuationCost / maxFinancial) * 100);
  const stockRetailPct = Math.round((metrics.stockAssetValuationRetail / maxFinancial) * 100);

  const totalProducts = Math.max(metrics.totalProducts, 1);
  const ownPct = Math.round((metrics.ownProducts / totalProducts) * 100);
  const extPct = Math.round((metrics.externalProducts / totalProducts) * 100);

  return (
    <Card variant="default" className="overflow-hidden">
      <SectionHeader
        title="Financial Velocity & Portfolio Composition"
        subtitle="Server-aggregated ledger balances and SKU portfolio mix"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 pt-1">
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-700 block">
            Financial Balance Comparison
          </span>

          <div className="space-y-3">
            {/* Sales Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Total Sales Revenue</span>
                <span className="font-mono text-emerald-700 font-semibold tabular-nums">
                  ₹ {metrics.totalSales.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(salesPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Purchases Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Total Supplier Purchases</span>
                <span className="font-mono text-blue-700 font-semibold tabular-nums">
                  ₹ {metrics.totalPurchases.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(purchasePct, 100)}%` }}
                />
              </div>
            </div>

            {/* Stock Valuation Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Stock Valuation (Cost Basis)</span>
                <span className="font-mono text-amber-700 font-semibold tabular-nums">
                  ₹ {metrics.stockAssetValuationCost.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(stockCostPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Stock Valuation Retail */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600">Stock Valuation (Retail Realizable)</span>
                <span className="font-mono text-indigo-700 font-semibold tabular-nums">
                  ₹ {metrics.stockAssetValuationRetail.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(stockRetailPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-700 block">
            Catalog & Brand Portfolio
          </span>

          <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Own Production vs Vendor SKUs</span>
              <span className="font-mono text-slate-900 font-semibold">
                {metrics.totalProducts} Total SKUs
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${ownPct}%` }}
                title={`Own Brands: ${metrics.ownProducts}`}
              />
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${extPct}%` }}
                title={`Vendor Brands: ${metrics.externalProducts}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0" />
                <span className="text-slate-700">Own SKUs: {metrics.ownProducts} ({ownPct}%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-700">Vendor: {metrics.externalProducts} ({extPct}%)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Categories: <strong className="text-slate-900 font-mono">{metrics.categoriesCount}</strong></span>
              <span>Suppliers: <strong className="text-slate-900 font-mono">{metrics.suppliersCount}</strong></span>
              <span>Brands: <strong className="text-slate-900 font-mono">{metrics.brandsCount}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
