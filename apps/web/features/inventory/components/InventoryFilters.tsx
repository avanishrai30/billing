'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';
import type { StockStatus } from '../types';

export interface InventoryFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | StockStatus;
  onStatusFilterChange: (status: 'ALL' | StockStatus) => void;
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  categories: string[];
  onClearFilters: () => void;
}

export function InventoryFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  onClearFilters
}: InventoryFiltersProps) {
  const isFiltered = searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL';

  const statusOptions: Array<{ id: 'ALL' | StockStatus; label: string }> = [
    { id: 'ALL', label: 'All Items' },
    { id: 'HEALTHY', label: 'In Stock' },
    { id: 'LOW_STOCK', label: 'Low Stock' },
    { id: 'OUT_OF_STOCK', label: 'Out of Stock' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            placeholder="Search by product name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center z-10">
              <IconButton
                aria-label="Clear search"
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                icon={<X className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
          )}
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-white text-slate-900">
                {c}
              </option>
            ))}
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100 scrollbar-thin no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 flex-shrink-0 mr-1">
          <Filter className="w-3 h-3 text-blue-600" />
          Status:
        </span>
        {statusOptions.map((opt) => {
          const isSelected = statusFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatusFilterChange(opt.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
