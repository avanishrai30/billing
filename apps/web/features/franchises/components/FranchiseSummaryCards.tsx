'use client';

import React from 'react';
import { Store, Truck, DollarSign, Clock } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import type { FranchiseSummaryMetrics } from '../types';

export interface FranchiseSummaryCardsProps {
  metrics: FranchiseSummaryMetrics;
  isLoading?: boolean;
}

export function FranchiseSummaryCards({ metrics, isLoading = false }: FranchiseSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Active Partners"
        value={isLoading ? '...' : `${metrics.activeFranchises} / ${metrics.totalFranchises}`}
        subtext="Active franchise outlets"
        icon={<Store className="h-4 w-4" />}
      />

      <StatCard
        label="Supply Dispatches"
        value={isLoading ? '...' : metrics.totalSupplyOrders}
        subtext="Total supply orders recorded"
        icon={<Truck className="h-4 w-4" />}
      />

      <StatCard
        label="Earnings Realized"
        value={
          isLoading
            ? '...'
            : `₹${Number(metrics.totalEarnings || 0).toLocaleString('en-IN', {
                maximumFractionDigits: 2
              })}`
        }
        subtext="Settled supply orders"
        icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
      />

      <StatCard
        label="Pending Receivables"
        value={
          isLoading
            ? '...'
            : `₹${Number(metrics.pendingReceivables || 0).toLocaleString('en-IN', {
                maximumFractionDigits: 2
              })}`
        }
        subtext="Unpaid / credit supply orders"
        icon={<Clock className="h-4 w-4 text-amber-400" />}
      />
    </div>
  );
}
