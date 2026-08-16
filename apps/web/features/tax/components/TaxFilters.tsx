'use client';

import React from 'react';
import { RotateCcw, Filter, Calendar, Store as StoreIcon } from 'lucide-react';
import { Select, Button } from '../../../components/ui';
import type { StoreDoc } from '../../stores/types';
import type { TaxReportingTab } from '../types';

export interface TaxFiltersProps {
  activeTab: TaxReportingTab;
  onTabChange: (tab: TaxReportingTab) => void;
  storeId: string;
  onStoreIdChange: (storeId: string) => void;
  startDate: string;
  onStartDateChange: (startDate: string) => void;
  endDate: string;
  onEndDateChange: (endDate: string) => void;
  stores: StoreDoc[];
  isStoreScoped: boolean;
  onReset: () => void;
}

export function TaxFilters({
  activeTab,
  onTabChange,
  storeId,
  onStoreIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  stores,
  isStoreScoped,
  onReset
}: TaxFiltersProps) {
  const isFiltered = storeId !== 'all' || startDate !== '' || endDate !== '';

  const tabs: Array<{ id: TaxReportingTab; label: string }> = [
    { id: 'overview', label: '📊 Compliance Overview' },
    { id: 'slabs', label: '🏷️ GST Slabs (0/5/12/18%)' },
    { id: 'b2b_b2c', label: '🏢 B2B vs B2C Matrix' },
    { id: 'outward', label: '💳 Outward GST (Sales)' },
    { id: 'inward', label: '📦 Inward GST (ITC)' }
  ];

  return (
    <div className="bg-[#021b47] p-3.5 rounded-2xl border border-white/10 space-y-3">
      {/* Top Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Store Scope */}
          <div className="w-56">
            <Select
              value={storeId}
              onChange={(e) => onStoreIdChange(e.target.value)}
              disabled={isStoreScoped}
              options={[
                { value: 'all', label: '🌐 All Stores (Enterprise)' },
                ...stores.map((s) => ({
                  value: s.id,
                  label: `📍 ${s.name}`
                }))
              ]}
              className="bg-black/20 text-xs"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
            />
          </div>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Reset Filters
          </Button>
        )}
      </div>

      {/* Segmented Navigation Tab Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-white/5 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-black/20 text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
