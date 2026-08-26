'use client';

import React from 'react';
import { Store, CheckCircle, XCircle, Share2 } from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import type { StoreSummaryMetrics } from '../types';

export interface StoreSummaryCardsProps {
  metrics: StoreSummaryMetrics;
  isLoading: boolean;
}

export function StoreSummaryCards({ metrics, isLoading }: StoreSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
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
      label: 'Registered Stores',
      value: (metrics.totalStores || 0).toLocaleString('en-IN'),
      subtext: 'Total physical branches & retail points',
      icon: Store,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200'
    },
    {
      label: 'Active Stores',
      value: (metrics.activeStoresCount || 0).toLocaleString('en-IN'),
      subtext: 'Operational billing outlets',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200'
    },
    {
      label: 'Distribution Hubs',
      value: (metrics.hubStoresCount || 0).toLocaleString('en-IN'),
      subtext: 'Regional stock distribution centers',
      icon: Share2,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200'
    },
    {
      label: 'Inactive Outlets',
      value: (metrics.inactiveStoresCount || 0).toLocaleString('en-IN'),
      subtext: 'Offline outlet configurations',
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-200'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-4.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${card.bg}`}
              >
                <IconComponent className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>

            <div className="mt-2">
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
