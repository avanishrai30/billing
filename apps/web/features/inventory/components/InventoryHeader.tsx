'use client';

import React from 'react';
import { Package, SlidersHorizontal, ArrowLeftRight, Building2, Warehouse, Globe2 } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';
import type { CommandCenterStore } from '../types';

export interface InventoryHeaderProps {
  selectedLocation: string; // 'network' | storeId
  stores: CommandCenterStore[];
  onSelectLocation: (loc: string) => void;
  canAdjust: boolean;
  canTransfer: boolean;
  onOpenAdjustment: () => void;
  onOpenTransfer: () => void;
  isSuperAdmin?: boolean;
}

export function InventoryHeader({
  selectedLocation,
  stores,
  onSelectLocation,
  canAdjust,
  canTransfer,
  onOpenAdjustment,
  onOpenTransfer,
  isSuperAdmin = true
}: InventoryHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-4">
      {/* Top Bar: Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-sm">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
                Inventory Command Center
              </h1>
              <Badge variant="success" size="sm" dot>
                REALTIME ACTIVE
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Multi-store consolidated stock visibility, Central Warehouse distribution, and batch-aware stock transfers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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

      {/* Location Navigation Tabs: [ Network ] [ Central Warehouse ] [ Store 1 ] [ Store 2 ]... */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Network Consolidated Tab */}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => onSelectLocation('network')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedLocation === 'network'
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Network Consolidated</span>
          </button>
        )}

        {/* Dynamic Store & Warehouse Tabs */}
        {stores.map((store) => {
          const isSelected = selectedLocation === store.id;
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelectLocation(store.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-700/20'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              {store.isWarehouse ? (
                <Warehouse className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
              ) : (
                <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
              )}
              <span>{store.name}</span>
              {store.isWarehouse && (
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide ${
                    isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Hub
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
