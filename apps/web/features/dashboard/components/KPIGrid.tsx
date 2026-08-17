'use client';

import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Truck,
  Boxes,
  Package,
  AlertTriangle,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { StatCard } from '../../../components/ui';
import type { DashboardMetrics } from '../types';

export interface KPIGridProps {
  metrics: DashboardMetrics;
}

export function KPIGrid({ metrics }: KPIGridProps) {
  return (
    <div className="space-y-4">
      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Gross Sales"
          value={metrics.totalSales}
          isCurrency
          subtext={`${metrics.invoiceCount} invoices recorded`}
          icon={<DollarSign className="w-4 h-4" />}
        />

        <StatCard
          label="Calculated Net Profit"
          value={metrics.netProfit}
          isCurrency
          subtext="Gross revenue minus COGS"
          icon={<TrendingUp className="w-4 h-4" />}
        />

        <StatCard
          label="Procurement Purchases"
          value={metrics.totalPurchases}
          isCurrency
          subtext={`${metrics.purchaseCount} purchase orders`}
          icon={<Truck className="w-4 h-4" />}
        />

        <StatCard
          label="Stock Asset Valuation"
          value={metrics.stockAssetValuationRetail}
          isCurrency
          subtext={`Cost base: ₹ ${metrics.stockAssetValuationCost.toLocaleString('en-IN')}`}
          icon={<Boxes className="w-4 h-4" />}
        />
      </div>

      {/* Secondary Operational & Inventory KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Catalog SKUs"
          value={metrics.totalProducts}
          subtext={`${metrics.ownProducts} own • ${metrics.externalProducts} vendor`}
          icon={<Package className="w-4 h-4" />}
        />

        <StatCard
          label="Low Stock Watch"
          value={metrics.lowStockCount}
          subtext={`${metrics.outOfStockCount} items currently out of stock`}
          trend={
            metrics.lowStockCount > 0
              ? { value: `${metrics.lowStockCount} Low`, direction: 'down' }
              : { value: 'Optimal', direction: 'up' }
          }
          icon={<AlertTriangle className="w-4 h-4" />}
        />

        <StatCard
          label="Expiry Warnings (30d)"
          value={metrics.expiryWarningsCount}
          subtext="Batches nearing expiration"
          trend={
            metrics.expiryWarningsCount > 0
              ? { value: `${metrics.expiryWarningsCount} Items`, direction: 'down' }
              : { value: 'Zero Risks', direction: 'up' }
          }
          icon={<ShieldCheck className="w-4 h-4" />}
        />

        <StatCard
          label="Franchise Earnings"
          value={metrics.franchiseEarnings}
          isCurrency
          subtext="Partner supply orders"
          icon={<Receipt className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}
