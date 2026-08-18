'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';

export interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearFilters: () => void;
}

export function CustomerFilters({
  searchQuery,
  onSearchChange,
  onClearFilters
}: CustomerFiltersProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by customer name, phone number, email, or GSTIN..."
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
                onClick={onClearFilters}
                icon={<X className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
          )}
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
