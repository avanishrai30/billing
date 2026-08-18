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
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 flex-shrink-0">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-950 tracking-tight">
              Product Master Catalog
            </h1>
            <Badge variant="success" size="sm" dot>
              REALTIME
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            SKU control, barcode mappings, tax classification, and procurement pricing in one catalog workspace.
          </p>
        </div>
      </div>

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
