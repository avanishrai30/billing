'use client';

import React from 'react';
import { Barcode, Plus, Trash2 } from 'lucide-react';
import { Input, Select, Button, Badge } from '../../../components/ui';
import type { ProductBarcodeEntry, BarcodeType } from '../types';

export interface ProductBarcodeManagerProps {
  primaryBarcode?: string | null;
  onPrimaryBarcodeChange: (val: string) => void;
  barcodes: ProductBarcodeEntry[];
  onChangeBarcodes: (entries: ProductBarcodeEntry[]) => void;
  disabled?: boolean;
}

export function ProductBarcodeManager({
  primaryBarcode,
  onPrimaryBarcodeChange,
  barcodes,
  onChangeBarcodes,
  disabled = false
}: ProductBarcodeManagerProps) {
  const handleAddBarcode = () => {
    onChangeBarcodes([
      ...barcodes,
      {
        barcode: '',
        type: 'ALTERNATE',
        variantName: 'Alternate Unit',
        active: true
      }
    ]);
  };

  const handleUpdateEntry = (index: number, updates: Partial<ProductBarcodeEntry>) => {
    const updated = [...barcodes];
    updated[index] = { ...updated[index], ...updates };
    onChangeBarcodes(updated);
  };

  const handleRemoveEntry = (index: number) => {
    const updated = barcodes.filter((_, i) => i !== index);
    onChangeBarcodes(updated);
  };

  const barcodeTypeOptions = [
    { value: 'ALTERNATE', label: 'Alternate Unit' },
    { value: 'VARIANT', label: 'Variant Pack' }
  ];

  return (
    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-semibold text-slate-800">
            Barcode Mapping Management
          </h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBarcode}
          disabled={disabled}
          leftIcon={<Plus className="w-3 h-3" />}
        >
          Add Alternate Barcode
        </Button>
      </div>

      {/* Primary Barcode Input */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          Primary Product Barcode (EAN/UPC)
        </label>
        <div className="relative">
          <Input
            placeholder="Scan or enter primary GTIN/EAN/UPC code..."
            value={primaryBarcode || ''}
            onChange={(e) => onPrimaryBarcodeChange(e.target.value)}
            disabled={disabled}
            leftIcon={<Barcode className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <p className="text-[11px] text-slate-600 mt-1">
          Unique master barcode mapped to the primary unit. Scanned at POS & Warehouse scanners.
        </p>
      </div>

      {/* Secondary Barcodes List */}
      {barcodes.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span>Additional / Pack Barcodes ({barcodes.length})</span>
          </div>

          {barcodes.map((b, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-lg p-2.5"
            >
              <div className="sm:col-span-5">
                <Input
                  placeholder="Barcode number..."
                  value={b.barcode}
                  onChange={(e) => handleUpdateEntry(index, { barcode: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-3">
                <Select
                  options={barcodeTypeOptions}
                  value={b.type || 'ALTERNATE'}
                  onChange={(e) =>
                    handleUpdateEntry(index, { type: e.target.value as BarcodeType })
                  }
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-3">
                <Input
                  placeholder="Label / Unit Name"
                  value={b.variantName || ''}
                  onChange={(e) => handleUpdateEntry(index, { variantName: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <div className="sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveEntry(index)}
                  disabled={disabled}
                  aria-label={`Remove barcode ${b.barcode || index + 1}`}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
