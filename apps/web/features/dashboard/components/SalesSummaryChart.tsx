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
    <Card variant="default">
      <SectionHeader
        title="Financial Velocity & Portfolio Composition"
        subtitle="Authoritative server-side aggregated ledger comparisons"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">
        {/* 1. Financial Distribution Scale */}
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Financial Balance Comparison
          </span>

          <div className="space-y-3">
            {/* Sales Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Sales Revenue</span>
                <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                  ₹ {metrics.totalSales.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(salesPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Purchases Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Supplier Purchases</span>
                <span className="font-mono text-sky-400 font-semibold tabular-nums">
                  ₹ {metrics.totalPurchases.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${Math.min(purchasePct, 100)}%` }}
                />
              </div>
            </div>

            {/* Stock Valuation Cost */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Stock Valuation (Cost Basis)</span>
                <span className="font-mono text-amber-400 font-semibold tabular-nums">
                  ₹ {metrics.stockAssetValuationCost.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(stockCostPct, 100)}%` }}
                />
              </div>
            </div>

            {/* Stock Valuation Retail */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Stock Valuation (Retail Realizable)</span>
                <span className="font-mono text-indigo-400 font-semibold tabular-nums">
                  ₹ {metrics.stockAssetValuationRetail.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(stockRetailPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Product Portfolio Composition */}
        <div className="space-y-4">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
            Catalog & Brand Portfolio
          </span>

          <div className="p-4 rounded-xl bg-[#021b47] border border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Own Production vs Vendor SKUs</span>
              <span className="font-mono text-white font-semibold">
                {metrics.totalProducts} Total SKUs
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-sky-500"
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
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 flex-shrink-0" />
                <span className="text-slate-300">Own SKUs: {metrics.ownProducts} ({ownPct}%)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-300">Vendor: {metrics.externalProducts} ({extPct}%)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Categories: <strong className="text-white font-mono">{metrics.categoriesCount}</strong></span>
              <span>Suppliers: <strong className="text-white font-mono">{metrics.suppliersCount}</strong></span>
              <span>Brands: <strong className="text-white font-mono">{metrics.brandsCount}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
