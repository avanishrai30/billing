'use client';

import React from 'react';
import { Store, UserCircle, Cpu, Wifi } from 'lucide-react';
import { Badge } from '../../../components/ui';

export interface POSHeaderProps {
  storeName: string;
  cashierName: string;
  itemCount: number;
  onOpenMobileCart?: () => void;
}

export function POSHeader({
  storeName,
  cashierName,
  itemCount,
  onOpenMobileCart
}: POSHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      {/* Left: Terminal context */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">POS Terminal</h2>
            <Badge variant="success" size="sm" dot>
              LIVE
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              {storeName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <UserCircle className="w-3.5 h-3.5 text-slate-400" />
              {cashierName}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Cart Status & Mobile Trigger */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          <span>Realtime Sync Connected</span>
        </div>

        {onOpenMobileCart && (
          <button
            type="button"
            onClick={onOpenMobileCart}
            aria-label={`View Cart (${itemCount} items)`}
            className="lg:hidden flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <span>View Cart</span>
            <span className="w-5 h-5 rounded-full bg-white text-sky-900 flex items-center justify-center font-bold text-[10px]">
              {itemCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
