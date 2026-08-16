'use client';

import React from 'react';
import { Store, Plus } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface StoreHeaderProps {
  canCreate: boolean;
  onOpenCreate: () => void;
}

export function StoreHeader({ canCreate, onOpenCreate }: StoreHeaderProps) {
  return (
    <div className="bg-[#021b47] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 flex-shrink-0">
          <Store className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Store & Branch Outlets
            </h1>
            <Badge variant="success" size="sm" dot>
              LIVE
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical stores, retail outlets, inventory locations, and register assignments
          </p>
        </div>
      </div>

      {canCreate && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCreate}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Register Store
        </Button>
      )}
    </div>
  );
}
