'use client';

import React from 'react';
import { Package, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface InventoryHeaderProps {
  selectedLocation: string;
  storeOptions: Array<{ value: string; label: string }>;
  onSelectLocation: (loc: string) => void;
  canAdjust: boolean;
  canTransfer: boolean;
  onOpenAdjustment: () => void;
  onOpenTransfer: () => void;
}

export function InventoryHeader({
  selectedLocation,
  storeOptions,
  onSelectLocation,
  canAdjust,
  canTransfer,
  onOpenAdjustment,
  onOpenTransfer
}: InventoryHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      {/* Title & Scope */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Inventory & Stock Management
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative stock balances, inter-store transfers, and immutable movement ledger
          </p>
        </div>
      </div>

      {/* Location Filter & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        {storeOptions.length > 1 && (
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
            aria-label="Filter inventory by outlet"
          >
            {storeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {canAdjust && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAdjustment}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          >
            Stock Adjustment
          </Button>
        )}

        {canTransfer && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenTransfer}
            leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
          >
            Transfer Stock
          </Button>
        )}
      </div>
    </div>
  );
}
