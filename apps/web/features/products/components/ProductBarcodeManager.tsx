'use client';

import React from 'react';
import { Barcode, Plus, Trash2, Sparkles, Building2, Tag, Edit3 } from 'lucide-react';
import { Input, Select, Button, Badge } from '../../../components/ui';
import { useGenerateBarcodeMutation } from '../hooks';
import type { ProductBarcodeEntry, BarcodeType, BarcodeSource, ProductType } from '../types';

export interface ProductBarcodeManagerProps {
  primaryBarcode?: string | null;
  onPrimaryBarcodeChange: (val: string) => void;
  barcodeSource?: BarcodeSource | null;
  onBarcodeSourceChange?: (val: BarcodeSource) => void;
  productType?: ProductType;
  barcodes: ProductBarcodeEntry[];
  onChangeBarcodes: (entries: ProductBarcodeEntry[]) => void;
  disabled?: boolean;
}

export function ProductBarcodeManager({
  primaryBarcode,
  onPrimaryBarcodeChange,
  barcodeSource,
  onBarcodeSourceChange,
  productType = 'OWN',
  barcodes,
  onChangeBarcodes,
  disabled = false
}: ProductBarcodeManagerProps) {
  const generateBarcodeMutation = useGenerateBarcodeMutation();

  const handleGenerateAIABarcode = async () => {
    try {
      const res = await generateBarcodeMutation.mutateAsync();
      if (res?.barcode) {
        onPrimaryBarcodeChange(res.barcode);
        onBarcodeSourceChange?.('AIAVRO');
      }
    } catch (e) {
      console.error('Failed to generate barcode', e);
    }
  };

  const handleBarcodeInputChange = (val: string) => {
    onPrimaryBarcodeChange(val);
    if (val.trim()) {
      if (val.toUpperCase().startsWith('AIA')) {
        onBarcodeSourceChange?.('AIAVRO');
      } else if (productType === 'EXTERNAL' && (!barcodeSource || barcodeSource === 'AIAVRO')) {
        onBarcodeSourceChange?.('EXTERNAL');
      } else if (!barcodeSource) {
        onBarcodeSourceChange?.('MANUAL');
      }
    }
  };

  const handleAddBarcode = () => {
    onChangeBarcodes([
      ...barcodes,
      {
        barcode: '',
        type: 'ALTERNATE',
        source: productType === 'EXTERNAL' ? 'EXTERNAL' : 'MANUAL',
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

  const barcodeSourceOptions = [
    { value: 'EXTERNAL', label: '🏢 Manufacturer / External (GTIN/EAN)' },
    { value: 'AIAVRO', label: '⚡ AIavro Generated (AIA Sequence)' },
    { value: 'MANUAL', label: '✍️ Manual / Registered Barcode' }
  ];

  const barcodeTypeOptions = [
    { value: 'ALTERNATE', label: 'Alternate Unit' },
    { value: 'VARIANT', label: 'Variant Pack' }
  ];

  const currentSource = barcodeSource || (primaryBarcode?.toUpperCase().startsWith('AIA') ? 'AIAVRO' : (productType === 'EXTERNAL' ? 'EXTERNAL' : 'MANUAL'));

  return (
    <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-semibold text-slate-800">
            Barcode & Source Management
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

      {/* Primary Barcode & Source Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white border border-slate-200 rounded-lg p-3">
        <div className="md:col-span-7 space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-slate-700">
              Primary Product Barcode (EAN / UPC / AIA)
            </label>
            <button
              type="button"
              onClick={handleGenerateAIABarcode}
              disabled={disabled || generateBarcodeMutation.isPending}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
              title="Generate standard AIA sequence barcode"
            >
              <Sparkles className="w-3 h-3" />
              Generate AIA Code
            </button>
          </div>
          <Input
            placeholder="Scan or enter primary GTIN/EAN/UPC code..."
            value={primaryBarcode || ''}
            onChange={(e) => handleBarcodeInputChange(e.target.value)}
            disabled={disabled}
            leftIcon={<Barcode className="w-4 h-4 text-slate-400" />}
          />
          <p className="text-[11px] text-slate-500">
            Globally unique master barcode. Scanned at POS terminals and Warehouse check-in.
          </p>
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="block text-[11px] font-semibold text-slate-700">
            Barcode Origin / Source
          </label>
          <Select
            options={barcodeSourceOptions}
            value={currentSource}
            onChange={(e) => onBarcodeSourceChange?.(e.target.value as BarcodeSource)}
            disabled={disabled || !primaryBarcode}
          />
          <div className="flex items-center gap-1.5 pt-0.5">
            {primaryBarcode ? (
              <Badge variant={currentSource === 'AIAVRO' ? 'brand' : (currentSource === 'EXTERNAL' ? 'info' : 'neutral')} size="sm">
                {currentSource === 'EXTERNAL' && '🏢 Manufacturer / External'}
                {currentSource === 'AIAVRO' && '⚡ AIavro Generated'}
                {currentSource === 'MANUAL' && '✍️ Manual Registered'}
              </Badge>
            ) : (
              <span className="text-[10px] text-slate-400">Unassigned</span>
            )}
          </div>
        </div>
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
