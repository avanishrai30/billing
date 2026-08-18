'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui';
import type { ProductFilterState } from '../types';

export interface ProductFiltersProps {
  filters: ProductFilterState;
  onFilterChange: (updates: Partial<ProductFilterState>) => void;
  onReset: () => void;
  categories: string[];
  brands: string[];
  totalResults: number;
}

export function ProductFilters({
  filters,
  onFilterChange,
  onReset,
  categories,
  brands,
  totalResults
}: ProductFiltersProps) {
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map((c) => ({ value: c, label: c }))
  ];

  const brandOptions = [
    { value: 'all', label: 'All Brands' },
    ...brands.map((b) => ({ value: b, label: b }))
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types (Own & Ext)' },
    { value: 'OWN', label: 'Own / Private Label' },
    { value: 'EXTERNAL', label: 'External Vendor' }
  ];

  const sellingModeOptions = [
    { value: 'all', label: 'All Formats' },
    { value: 'packaged', label: 'Packaged Goods' },
    { value: 'loose', label: 'Loose / Weighed' },
    { value: 'weight_based', label: 'Weight Based' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active Catalog SKUs' },
    { value: 'archived', label: 'Archived Only' },
    { value: 'all', label: 'All (Active & Archived)' }
  ];

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== 'all' ||
    filters.brand !== 'all' ||
    filters.type !== 'all' ||
    filters.sellingMode !== 'all' ||
    filters.status !== 'active';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by SKU, product name, or barcode..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Category */}
        <div>
          <Select
            options={categoryOptions}
            value={filters.category}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            aria-label="Filter by category"
          />
        </div>

        {/* Brand */}
        <div>
          <Select
            options={brandOptions}
            value={filters.brand}
            onChange={(e) => onFilterChange({ brand: e.target.value })}
            aria-label="Filter by brand"
          />
        </div>

        {/* Type (Own/External) */}
        <div>
          <Select
            options={typeOptions}
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            aria-label="Filter by ownership type"
          />
        </div>

        {/* Selling Mode / Status */}
        <div>
          <Select
            options={sellingModeOptions}
            value={filters.sellingMode}
            onChange={(e) => onFilterChange({ sellingMode: e.target.value })}
            aria-label="Filter by selling mode"
          />
        </div>
      </div>

      {/* Secondary Bar with Status and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-600">
            Showing <strong className="text-slate-900 font-semibold">{totalResults}</strong> matching SKU records
          </span>
          <div className="w-36">
            <Select
              options={statusOptions}
              value={filters.status}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              aria-label="Filter by archive status"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
