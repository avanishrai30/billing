'use client';

import React from 'react';
import { Store, UserCircle, Cpu, Wifi } from 'lucide-react';
import { Badge } from '../../../components/ui';

export interface POSHeaderProps {
  storeName: string;
  cashierName: string;
  itemCount: number;
  onOpenMobileCart?: () => void;
  onOpenReturnStudio?: () => void;
}

export function POSHeader({
  storeName,
  cashierName,
  itemCount,
  onOpenMobileCart,
  onOpenReturnStudio
}: POSHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-950 tracking-tight">POS Terminal</h1>
            <Badge variant="success" size="sm" dot>
              LIVE
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              {storeName}
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1">
              <UserCircle className="w-3.5 h-3.5 text-slate-400" />
              {cashierName}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenReturnStudio && (
          <button
            type="button"
            data-testid="return-exchange-btn"
            onClick={onOpenReturnStudio}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
          >
            <span>Return / Exchange</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Realtime Sync</span>
        </div>

        {onOpenMobileCart && (
          <button
            type="button"
            onClick={onOpenMobileCart}
            aria-label={`View Cart (${itemCount} items)`}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-[0_10px_22px_rgba(37,99,235,0.18)] cursor-pointer focus-ring active:scale-[0.98]"
          >
            <span>View Cart</span>
            <span className="w-5 h-5 rounded-md bg-white text-blue-900 flex items-center justify-center font-bold text-[10px]">
              {itemCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
