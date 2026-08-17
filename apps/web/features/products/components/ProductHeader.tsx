'use client';

import React from 'react';
import { Package, Plus, Upload } from 'lucide-react';
import { Button, Badge } from '../../../components/ui';

export interface ProductHeaderProps {
  canCreate: boolean;
  canImport: boolean;
  onOpenCreate: () => void;
  onOpenImport: () => void;
}

export function ProductHeader({
  canCreate,
  canImport,
  onOpenCreate,
  onOpenImport
}: ProductHeaderProps) {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      {/* Title & Description */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Product Master Catalog
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized SKU catalog, multi-barcode mappings, tax classifications, and procurement pricing
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {canImport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenImport}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            Bulk Import
          </Button>
        )}

        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenCreate}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Product SKU
          </Button>
        )}
      </div>
    </div>
  );
}
