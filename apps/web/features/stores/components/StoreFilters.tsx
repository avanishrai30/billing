'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';

export interface StoreFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearFilters: () => void;
}

export function StoreFilters({
  searchQuery,
  onSearchChange,
  onClearFilters
}: StoreFiltersProps) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by store name, branch code, address, or phone..."
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
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
