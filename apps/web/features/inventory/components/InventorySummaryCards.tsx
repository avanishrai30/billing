'use client';

import React from 'react';
import { Layers, AlertTriangle, XCircle, IndianRupee } from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import type { InventorySummary } from '../types';

export interface InventorySummaryCardsProps {
  summary?: InventorySummary;
  isLoading: boolean;
}

export function InventorySummaryCards({ summary, isLoading }: InventorySummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
          >
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-24 h-3.5" />
              <Skeleton variant="circular" className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton variant="text" className="w-32 h-6" />
          </div>
        ))}
      </div>
    );
  }

  const totalUnits = summary?.totalUnits ?? 0;
  const lowStock = summary?.lowStockCount ?? 0;
  const outOfStock = summary?.outOfStockCount ?? 0;
  const valuation = summary?.inventoryValue ?? 0;

  const cards = [
    {
      label: 'Total Units in Stock',
      value: totalUnits.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtext: `${summary?.totalTrackedItems ?? 0} tracked product lines`,
      icon: Layers,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-100'
    },
    {
      label: 'Low Stock Warnings',
      value: lowStock.toString(),
      subtext: 'Below reorder threshold',
      icon: AlertTriangle,
      color: lowStock > 0 ? 'text-amber-700' : 'text-slate-500',
      bg: lowStock > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
    },
    {
      label: 'Out of Stock Items',
      value: outOfStock.toString(),
      subtext: 'Requires replenishment',
      icon: XCircle,
      color: outOfStock > 0 ? 'text-rose-700' : 'text-slate-500',
      bg: outOfStock > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
    },
    {
      label: 'Stock Valuation',
      value: `₹ ${valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: 'Based on purchase cost',
      icon: IndianRupee,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-600">
                {c.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-semibold font-mono text-slate-950 tracking-tight tabular-nums">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                {c.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
