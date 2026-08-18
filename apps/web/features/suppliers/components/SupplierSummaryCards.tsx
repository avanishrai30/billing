'use client';

import React from 'react';
import { Truck, FileCheck, Mail } from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import type { SupplierSummaryMetrics } from '../types';

export interface SupplierSummaryCardsProps {
  metrics: SupplierSummaryMetrics;
  isLoading: boolean;
}

export function SupplierSummaryCards({ metrics, isLoading }: SupplierSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs"
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

  const cards = [
    {
      label: 'Registered Supply Partners',
      value: metrics.totalSuppliers.toLocaleString('en-IN'),
      subtext: 'Central vendor & distributor directory',
      icon: Truck,
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200'
    },
    {
      label: 'GST Registered Vendors',
      value: metrics.withGstCount.toLocaleString('en-IN'),
      subtext: 'B2B verified tax identifiers',
      icon: FileCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      label: 'Direct Email Channels',
      value: metrics.withEmailCount.toLocaleString('en-IN'),
      subtext: 'Configured for purchase orders',
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 truncate">
                {c.label}
              </span>
              <div
                className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${c.bg} ${c.color}`}
              >
                <Icon className="w-4 h-4" />
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
