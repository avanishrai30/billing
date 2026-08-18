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
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">
              Inventory & Stock Management
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Stock balances, inter-store transfers, and immutable movement history for daily control.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {storeOptions.length > 1 && (
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer shadow-[0_6px_16px_rgba(15,23,42,0.04)]"
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
