'use client';

import React from 'react';
import { Truck, Plus } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface SupplierHeaderProps {
  canCreate: boolean;
  onOpenCreate: () => void;
}

export function SupplierHeader({ canCreate, onOpenCreate }: SupplierHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      {/* Title & Description */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
          <Truck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Supplier & Vendor Directory
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Central vendor identity, contact details, GST tax profiles, and procurement purchase history
          </p>
        </div>
      </div>

      {/* Action Button */}
      {canCreate && (
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCreate}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Register Supplier
        </Button>
      )}
    </div>
  );
}
