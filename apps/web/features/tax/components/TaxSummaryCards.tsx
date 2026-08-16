'use client';

import React from 'react';
import { IndianRupee, FileSpreadsheet, ShieldAlert, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { StatCard } from '../../../components/ui';
import type { TaxSummaryMetrics } from '../types';

export interface TaxSummaryCardsProps {
  metrics: TaxSummaryMetrics;
  isLoading?: boolean;
}

export function TaxSummaryCards({ metrics, isLoading = false }: TaxSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Gross Sales Turnover"
        value={isLoading ? '...' : `₹${metrics.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtext={`Taxable: ₹${metrics.taxableSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={<IndianRupee className="h-4 w-4 text-emerald-400" />}
      />

      <StatCard
        label="Total Outward GST"
        value={isLoading ? '...' : `₹${metrics.outwardGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtext={`CGST: ₹${metrics.cgstShare.toFixed(2)} | SGST: ₹${metrics.sgstShare.toFixed(2)}`}
        icon={<ArrowUpRight className="h-4 w-4 text-sky-400" />}
      />

      <StatCard
        label="Inward GST Paid (ITC)"
        value={isLoading ? '...' : `₹${metrics.inwardGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtext={`Purchase Taxable: ₹${metrics.purchaseTaxable.toFixed(2)}`}
        icon={<ArrowDownLeft className="h-4 w-4 text-amber-400" />}
      />

      <StatCard
        label="Net Tax Liability"
        value={
          isLoading
            ? '...'
            : `₹${Math.max(0, metrics.outwardGst - metrics.inwardGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }
        subtext="Outward GST minus Inward ITC"
        icon={<FileSpreadsheet className="h-4 w-4 text-purple-400" />}
      />
    </div>
  );
}
