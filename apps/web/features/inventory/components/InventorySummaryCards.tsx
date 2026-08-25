'use client';

import React from 'react';
import { Layers, Warehouse, Store, AlertTriangle, Clock, PackageCheck } from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import type { CommandCenterSummary } from '../types';

export interface InventorySummaryCardsProps {
  summary?: CommandCenterSummary;
  isLoading: boolean;
}

export function InventorySummaryCards({ summary, isLoading }: InventorySummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
          >
            <div className="flex justify-between items-center">
              <Skeleton variant="text" className="w-20 h-3" />
              <Skeleton variant="circular" className="w-7 h-7 rounded-lg" />
            </div>
            <Skeleton variant="text" className="w-24 h-5" />
          </div>
        ))}
      </div>
    );
  }

  const networkStock = summary?.networkStock ?? 0;
  const centralStock = summary?.centralStock ?? 0;
  const storeStock = summary?.storeStock ?? 0;
  const lowStock = summary?.lowStockCount ?? 0;
  const outOfStock = summary?.outOfStockCount ?? 0;
  const expiringSoon = summary?.expiringSoonCount ?? 0;
  const catalogProducts = summary?.catalogProducts ?? summary?.totalProducts ?? 0;
  const stockedProducts = summary?.stockedProducts ?? 0;

  const cards = [
    {
      label: 'Catalog Products',
      value: catalogProducts.toLocaleString('en-IN'),
      subtext: `${stockedProducts.toLocaleString('en-IN')} currently stocked`,
      icon: PackageCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      label: 'Network Stock',
      value: networkStock.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtext: `${stockedProducts.toLocaleString('en-IN')} stocked products`,
      icon: Layers,
      color: 'text-slate-900',
      bg: 'bg-slate-100 border-slate-200'
    },
    {
      label: 'Central Stock',
      value: centralStock.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtext: 'Central distribution hub',
      icon: Warehouse,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      label: 'Store Stock',
      value: storeStock.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      subtext: 'Retail outlets total',
      icon: Store,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      label: 'Low Stock',
      value: lowStock.toString(),
      subtext: `${outOfStock.toLocaleString('en-IN')} out of stock`,
      icon: AlertTriangle,
      color: lowStock > 0 ? 'text-rose-700' : 'text-slate-500',
      bg: lowStock > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon.toString(),
      subtext: 'Batches in < 30 days',
      icon: Clock,
      color: expiringSoon > 0 ? 'text-amber-700' : 'text-slate-500',
      bg: expiringSoon > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-slate-500">
                {c.label}
              </span>
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {c.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
