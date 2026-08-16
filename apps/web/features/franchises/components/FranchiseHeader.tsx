'use client';

import React from 'react';
import { Store, Plus, Package } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface FranchiseHeaderProps {
  totalFranchises: number;
  activeFranchises: number;
  canManage: boolean;
  onRegisterFranchise: () => void;
  onCreateSupplyOrder: () => void;
}

export function FranchiseHeader({
  totalFranchises,
  activeFranchises,
  canManage,
  onRegisterFranchise,
  onCreateSupplyOrder
}: FranchiseHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Franchise CRM & Supply Chain
            </h1>
            <p className="text-xs text-slate-400">
              Manage external franchise partners, wholesale pricing agreements, and supply dispatches
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <Badge variant="info" size="md">
          {totalFranchises} Registered ({activeFranchises} Active)
        </Badge>
        {canManage && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateSupplyOrder}
              leftIcon={<Package className="h-4 w-4" />}
            >
              Record Supply Order
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onRegisterFranchise}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add Franchise
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
