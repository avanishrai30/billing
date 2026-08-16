'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui';
import type { UserCategory, UserStatus } from '../types';

export interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: 'ALL' | UserCategory;
  onCategoryChange: (category: 'ALL' | UserCategory) => void;
  status: 'ALL' | UserStatus;
  onStatusChange: (status: 'ALL' | UserStatus) => void;
  onReset: () => void;
}

export function UserFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onReset
}: UserFiltersProps) {
  const isFiltered = search !== '' || category !== 'ALL' || status !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#021b47] p-3 rounded-xl border border-white/10">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search by full name, @username, email, or role title..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          className="bg-black/20 text-xs"
        />
      </div>

      <div className="w-full sm:w-44">
        <Select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as 'ALL' | UserCategory)}
          options={[
            { value: 'ALL', label: 'All Roles' },
            { value: 'super admin', label: 'Super Admin' },
            { value: 'admin', label: 'Admin' },
            { value: 'employee', label: 'Staff / Cashier' },
            { value: 'auditor', label: 'Auditor' }
          ]}
          className="bg-black/20 text-xs"
        />
      </div>

      <div className="w-full sm:w-36">
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'ALL' | UserStatus)}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'inactive', label: 'Inactive' }
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
