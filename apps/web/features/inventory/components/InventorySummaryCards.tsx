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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 space-y-2.5"
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
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-400/20'
    },
    {
      label: 'Low Stock Warnings',
      value: lowStock.toString(),
      subtext: 'Below reorder threshold',
      icon: AlertTriangle,
      color: lowStock > 0 ? 'text-amber-400' : 'text-slate-400',
      bg: lowStock > 0 ? 'bg-amber-500/10 border-amber-400/20' : 'bg-white/5 border-white/10'
    },
    {
      label: 'Out of Stock Items',
      value: outOfStock.toString(),
      subtext: 'Requires replenishment',
      icon: XCircle,
      color: outOfStock > 0 ? 'text-rose-400' : 'text-slate-400',
      bg: outOfStock > 0 ? 'bg-rose-500/10 border-rose-400/20' : 'bg-white/5 border-white/10'
    },
    {
      label: 'Total Stock Valuation',
      value: `₹ ${valuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtext: 'Based on purchase cost',
      icon: IndianRupee,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-400/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-400 truncate">
                {c.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight tabular-nums">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {c.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
