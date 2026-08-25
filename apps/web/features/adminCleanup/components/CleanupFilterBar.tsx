'use client';

import React from 'react';
import { Search, Calendar, Filter, RotateCcw } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui';
import type { CleanupDomain, CleanupFilterState } from '../types';

export interface CleanupFilterBarProps {
  domain: CleanupDomain;
  filters: CleanupFilterState;
  onFilterChange: (newFilters: Partial<CleanupFilterState>) => void;
  onReset: () => void;
}

export function CleanupFilterBar({
  domain,
  filters,
  onFilterChange,
  onReset
}: CleanupFilterBarProps) {
  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Range...' }
  ];

  const statusOptionsMap: Record<CleanupDomain, { value: string; label: string }[]> = {
    invoices: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active Posted' },
      { value: 'archived', label: 'Archived Only' },
      { value: 'voided', label: 'Voided Only' }
    ],
    purchases: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active Received' },
      { value: 'archived', label: 'Archived Only' },
      { value: 'voided', label: 'Voided Only' }
    ],
    products: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active Catalog' },
      { value: 'archived', label: 'Archived Products' }
    ],
    inventory: [
      { value: 'all', label: 'All Stock Levels' },
      { value: 'zero', label: 'Zero / Depleted Stock (0)' },
      { value: 'positive', label: 'Positive Stock (> 0)' },
      { value: 'orphan', label: 'Orphan Inventory' }
    ]
  };

  const statusOptions = statusOptionsMap[domain] || [{ value: 'all', label: 'All' }];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search input */}
        <div className="col-span-1 sm:col-span-2">
          <Input
            placeholder={
              domain === 'invoices'
                ? 'Search by invoice #, customer name, phone...'
                : domain === 'purchases'
                ? 'Search by purchase #, supplier...'
                : domain === 'products'
                ? 'Search by product name, SKU, barcode...'
                : 'Search inventory by product name or SKU...'
            }
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="text-xs"
          />
        </div>

        {/* Date Preset */}
        <div>
          <Select
            options={dateOptions}
            value={filters.datePreset}
            onChange={(e) => onFilterChange({ datePreset: e.target.value as any })}
          />
        </div>

        {/* Status / Level filter */}
        <div>
          <Select
            options={statusOptions}
            value={domain === 'inventory' ? (filters.stockStatus || 'all') : (filters.status || 'all')}
            onChange={(e) => {
              if (domain === 'inventory') {
                onFilterChange({ stockStatus: e.target.value as any });
              } else {
                onFilterChange({ status: e.target.value });
              }
            }}
          />
        </div>
      </div>

      {/* Custom Date Range if selected */}
      {filters.datePreset === 'custom' && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">From:</span>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value })}
              className="text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">To:</span>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value })}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Reset Filter Action */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
        <span>Filtered selection applies directly to bulk operations.</span>
        <button
          type="button"
          onClick={onReset}
          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Filters
        </button>
      </div>
    </div>
  );
}
