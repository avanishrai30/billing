'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
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
    { id: 'overview', label: 'Compliance Overview' },
    { id: 'slabs', label: 'GST Slabs' },
    { id: 'b2b_b2c', label: 'B2B vs B2C' },
    { id: 'outward', label: 'Outward GST' },
    { id: 'inward', label: 'Inward GST' }
  ];

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
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
                { value: 'all', label: 'All Stores (Enterprise)' },
                ...stores.map((s) => ({
                  value: s.id,
                  label: s.name
                }))
              ]}
              className="text-xs"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
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
      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer focus-ring ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
