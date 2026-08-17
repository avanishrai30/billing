'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui';
import type { FranchiseStatus } from '../types';

export interface FranchiseFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: 'ALL' | FranchiseStatus;
  onStatusChange: (status: 'ALL' | FranchiseStatus) => void;
  onReset: () => void;
}

export function FranchiseFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onReset
}: FranchiseFiltersProps) {
  const isFiltered = search !== '' || status !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#0f172a] p-3 rounded-xl border border-white/10">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search by franchise name, owner, city, phone or GSTIN..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          className="bg-black/20 text-xs"
        />
      </div>

      <div className="w-full sm:w-44">
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'ALL' | FranchiseStatus)}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'active', label: 'Active Partners' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' }
          ]}
          className="bg-black/20 text-xs"
        />
      </div>

      {isFiltered && (
        <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
          Reset
        </Button>
      )}
    </div>
  );
}
