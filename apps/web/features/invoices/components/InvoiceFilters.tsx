'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input, IconButton } from '../../../components/ui';

export interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  paymentModeFilter: string;
  onPaymentModeFilterChange: (mode: string) => void;
  onClearFilters: () => void;
}

export function InvoiceFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  paymentModeFilter,
  onPaymentModeFilterChange,
  onClearFilters
}: InvoiceFiltersProps) {
  const isFiltered = searchQuery || statusFilter !== 'ALL' || paymentModeFilter !== 'ALL';

  const statusOptions = [
    { id: 'ALL', label: 'All Invoices' },
    { id: 'PAID', label: 'Paid' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'VOIDED', label: 'Voided' }
  ];

  return (
    <div className="bg-[#021b47] border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            placeholder="Search by invoice #, customer name, phone..."
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

        {/* Payment Mode Selector */}
        <div className="flex items-center gap-2">
          <select
            value={paymentModeFilter}
            onChange={(e) => onPaymentModeFilterChange(e.target.value)}
            className="px-3 py-2 bg-[#032154] border border-white/15 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            aria-label="Filter by Payment Mode"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash Tender</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card Swipe</option>
            <option value="BANK">Bank Transfer</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-white/5 scrollbar-thin no-scrollbar">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0 mr-1">
          <Filter className="w-3 h-3 text-sky-400" />
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
                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
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
