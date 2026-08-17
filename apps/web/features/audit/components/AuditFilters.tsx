'use client';

import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { Input, Select, Button } from '../../../components/ui';
import type { StoreDoc } from '../../stores/types';

export interface AuditFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  action: string;
  onActionChange: (val: string) => void;
  entity: string;
  onEntityChange: (val: string) => void;
  storeId: string;
  onStoreIdChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  stores: StoreDoc[];
  isStoreScoped: boolean;
  onReset: () => void;
}

export function AuditFilters({
  search,
  onSearchChange,
  action,
  onActionChange,
  entity,
  onEntityChange,
  storeId,
  onStoreIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  stores,
  isStoreScoped,
  onReset
}: AuditFiltersProps) {
  const isFiltered =
    search !== '' ||
    action !== 'ALL' ||
    entity !== 'ALL' ||
    storeId !== 'all' ||
    startDate !== '' ||
    endDate !== '';

  return (
    <div className="bg-[#0f172a] p-3.5 rounded-xl border border-white/10 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by actor, entity ID, request ID, details..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            className="bg-black/20 text-xs"
          />
        </div>

        {/* Action Category Filter */}
        <div>
          <Select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            options={[
              { value: 'ALL', label: '⚡ All Action Types' },
              { value: 'auth', label: '🔑 Authentications (Login/Logout)' },
              { value: 'billing', label: '💳 POS Transactions (Sales)' },
              { value: 'create', label: '➕ Record Creations' },
              { value: 'update', label: '✏️ Updates & Adjustments' },
              { value: 'delete', label: '🗑️ Deletions & Voids' },
              { value: 'transfer', label: '📦 Stock Transfers' },
              { value: 'security', label: '🚨 Security Alerts & Denials' }
            ]}
            className="bg-black/20 text-xs"
          />
        </div>

        {/* Store Scope Filter (if not locked) */}
        <div>
          <Select
            value={storeId}
            onChange={(e) => onStoreIdChange(e.target.value)}
            disabled={isStoreScoped}
            options={[
              { value: 'all', label: '🌐 All Stores (Global Enterprise)' },
              ...stores.map((s) => ({
                value: s.id,
                label: `📍 ${s.name} (${s.code || s.address || 'Store'})`
              }))
            ]}
            className="bg-black/20 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Entity Domain Filter */}
          <div className="w-40">
            <Select
              value={entity}
              onChange={(e) => onEntityChange(e.target.value)}
              options={[
                { value: 'ALL', label: '📁 All Entities' },
                { value: 'billing', label: 'Invoices / POS' },
                { value: 'inventory', label: 'Products & Stock' },
                { value: 'purchase', label: 'Purchases' },
                { value: 'customers', label: 'Customers CRM' },
                { value: 'suppliers', label: 'Suppliers' },
                { value: 'stores', label: 'Stores & Branches' },
                { value: 'user', label: 'User Accounts' },
                { value: 'permissions', label: 'RBAC Roles' },
                { value: 'auth', label: 'Auth Gateway' }
              ]}
              className="bg-black/20 text-xs"
            />
          </div>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}
