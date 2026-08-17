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

  const cards = [
    {
      label: 'Registered Supply Partners',
      value: metrics.totalSuppliers.toLocaleString('en-IN'),
      subtext: 'Central vendor & distributor directory',
      icon: Truck,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-400/20'
    },
    {
      label: 'GST Registered Vendors',
      value: metrics.withGstCount.toLocaleString('en-IN'),
      subtext: 'B2B verified tax identifiers',
      icon: FileCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-400/20'
    },
    {
      label: 'Direct Email Channels',
      value: metrics.withEmailCount.toLocaleString('en-IN'),
      subtext: 'Configured for purchase orders',
      icon: Mail,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-400/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
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
