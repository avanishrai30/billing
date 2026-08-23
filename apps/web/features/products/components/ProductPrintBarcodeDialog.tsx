'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Barcode,
  Layers,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Tag,
  Store,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  Button,
  Input,
  Select,
  Badge,
  useToast
} from '../../../components/ui';
import { generateBarcodeSvg } from '../../../lib/utils/barcode';
import { useProductBatchesQuery, useCreateProductBatchMutation } from '../hooks';
import type { ProductDoc, ProductBatchDoc, BarcodeLabelTemplate } from '../types';

export interface ProductPrintBarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDoc | null;
}

export function ProductPrintBarcodeDialog({
  isOpen,
  onClose,
  product
}: ProductPrintBarcodeDialogProps) {
  const { success, error: toastError } = useToast();

  const { data: batches = [], isLoading: isLoadingBatches } = useProductBatchesQuery(product?.id);
  const createBatchMutation = useCreateProductBatchMutation();

  // Print Configuration State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('none');
  const [quantity, setQuantity] = useState<number>(3);
  const [template, setTemplate] = useState<BarcodeLabelTemplate>('standard_shelf');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showLotExpiry, setShowLotExpiry] = useState<boolean>(true);
  const [showBrand, setShowBrand] = useState<boolean>(true);

  // Quick Add Batch state
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newBatchQuantity, setNewBatchQuantity] = useState<number>(10);

  // Set default selected batch when batches load
  React.useEffect(() => {
    if (batches.length > 0 && selectedBatchId === 'none') {
      setSelectedBatchId(batches[0].id || 'none');
    }
  }, [batches, selectedBatchId]);

  const activeBarcode = useMemo(() => {
    return product?.barcode || product?.sku || 'AIA000000';
  }, [product]);

  const selectedBatch = useMemo<ProductBatchDoc | null>(() => {
    if (selectedBatchId === 'none') return null;
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id) return;
    if (!newLotNumber.trim()) {
      toastError('Lot Number Required', 'Please enter a valid batch/lot identifier.');
      return;
    }

    try {
      const res = await createBatchMutation.mutateAsync({
        productId: product.id,
        payload: {
          lotNumber: newLotNumber.trim(),
          expiryDate: newExpiryDate || undefined,
          manufactureDate: newMfgDate || undefined,
          receivedQuantity: newBatchQuantity || 0,
          remainingQuantity: newBatchQuantity || 0
        }
      });
      success('Batch Created', `Batch ${newLotNumber} registered for ${product.name}`);
      setSelectedBatchId(res.batch.id);
      setIsAddingBatch(false);
      setNewLotNumber('');
      setNewExpiryDate('');
      setNewMfgDate('');
    } catch (err: any) {
      toastError('Failed to Create Batch', err?.message || 'Server error creating batch.');
    }
  };

  const handlePrint = () => {
    if (!product) return;

    const labelCount = Math.min(Math.max(1, quantity), 100);
    const barcodeSvgStr = generateBarcodeSvg(activeBarcode, {
      width: template === 'compact_tag' ? 1.1 : 1.4,
      height: template === 'compact_tag' ? 28 : 36,
      includeText: true,
      fontSize: 10
    });

    const lotText = selectedBatch?.lotNumber ? `Lot: ${selectedBatch.lotNumber}` : '';
    const expText = selectedBatch?.expiryDate ? `EXP: ${selectedBatch.expiryDate}` : '';
    const priceText = showPrice
      ? `₹${(product.sellingPrice || product.price || 0).toFixed(2)}${product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}`
      : '';
    const brandText = showBrand ? (product.brand || "VC ORGANIC'S") : '';

    let labelCardsHtml = '';
    for (let i = 0; i < labelCount; i++) {
      labelCardsHtml += `
        <div class="print-label-card template-${template}">
          ${brandText ? `<div class="label-brand">${brandText}</div>` : ''}
          <div class="label-name">${product.name}</div>
          <div class="label-sku">SKU: ${product.sku}</div>
          <div class="label-barcode">${barcodeSvgStr}</div>
          <div class="label-footer">
            ${priceText ? `<div class="label-price">${priceText}</div>` : ''}
            ${showLotExpiry && (lotText || expText) ? `<div class="label-meta">${[lotText, expText].filter(Boolean).join(' • ')}</div>` : ''}
          </div>
        </div>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toastError('Popup Blocked', 'Please allow popups to open the print document.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels - ${product.name}</title>
        <meta charset="utf-8">
        <style>
          @page {
            margin: 4mm;
            size: auto;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            background: #fff;
            padding: 10px;
          }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 8px;
          }
          .print-label-card {
            border: 1px dashed #bbb;
            border-radius: 4px;
            padding: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            background: #fff;
            page-break-inside: avoid;
          }
          .label-brand {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #444;
          }
          .label-name {
            font-size: 11px;
            font-weight: 700;
            margin: 2px 0;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .label-sku {
            font-size: 9px;
            font-family: monospace;
            color: #555;
          }
          .label-barcode {
            margin: 4px 0;
            width: 100%;
            display: flex;
            justify-content: center;
          }
          .label-footer {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            margin-top: 2px;
          }
          .label-price {
            font-size: 12px;
            font-weight: 800;
            color: #000;
          }
          .label-meta {
            font-size: 8px;
            font-weight: 600;
            color: #444;
          }
          @media print {
            body {
              padding: 0;
            }
            .print-label-card {
              border: 1px dotted #ccc;
            }
          }
        </style>
      </head>
      <body onload="window.print();">
        <div class="labels-grid">${labelCardsHtml}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    success('Print Initiated', `Dispatched ${labelCount} label(s) for ${product.name}`);
  };

  if (!product) return null;

  const livePreviewSvg = generateBarcodeSvg(activeBarcode, {
    width: template === 'compact_tag' ? 1.2 : 1.5,
    height: template === 'compact_tag' ? 30 : 42,
    includeText: true,
    fontSize: 11
  });

  const batchOptions = [
    { value: 'none', label: '🏷️ Master Product Barcode (No Expiry)' },
    ...batches.map((b) => ({
      value: b.id,
      label: `📦 Lot: ${b.lotNumber} | EXP: ${b.expiryDate || 'No Expiry'} (${b.remainingQuantity || 0} left)`
    }))
  ];

  const templateOptions = [
    { value: 'standard_shelf', label: 'Standard Shelf Tag (50 × 30 mm)' },
    { value: 'sticker_38x25', label: 'Product Sticker (38 × 25 mm)' },
    { value: 'compact_tag', label: 'Compact Tag (25 × 15 mm)' },
    { value: 'qr_dual', label: 'Dual Barcode Tag (50 × 40 mm)' }
  ];

  const footerContent = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handlePrint}
        leftIcon={<Printer className="w-4 h-4" />}
      >
        Print {quantity} Label{quantity > 1 ? 's' : ''}
      </Button>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Print Product Barcode & Batch Labels"
      description="Configure label templates, select inventory batch/lot, and generate scannable barcodes."
      footer={footerContent}
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2">
        {/* LEFT: Configuration Panel */}
        <div className="md:col-span-7 space-y-4">
          {/* Product Identity Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 truncate">{product.name}</span>
              <Badge variant={product.sellingMode === 'loose' ? 'info' : 'neutral'} size="sm">
                {product.sellingMode === 'loose' ? '⚖️ Loose Item' : '📦 Packaged'}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
              <span>SKU: <strong className="text-slate-800">{product.sku}</strong></span>
              <span>Barcode: <strong className="text-slate-800">{product.barcode || product.sku}</strong></span>
            </div>
            <div className="text-xs font-semibold text-emerald-700">
              Unit Price: ₹{(product.sellingPrice || product.price || 0).toFixed(2)}
              {product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}
            </div>
          </div>

          {/* Batch / Lot Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Inventory Batch / Expiry
              </label>
              <button
                type="button"
                onClick={() => setIsAddingBatch(!isAddingBatch)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {isAddingBatch ? 'Cancel' : 'Add Batch'}
              </button>
            </div>

            <Select
              options={batchOptions}
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={isLoadingBatches}
            />

            {batches.length === 0 && !isAddingBatch && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  No inventory batch available for expiry labeling. Printing master product barcode without expiry date.
                </span>
              </div>
            )}
          </div>

          {/* Quick Add Batch Subform */}
          {isAddingBatch && (
            <form onSubmit={handleCreateBatch} className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-3">
              <div className="text-xs font-bold text-blue-900">Record New Batch / Lot</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-700">Lot Number *</label>
                  <Input
                    placeholder="e.g. LOT-2026-08"
                    value={newLotNumber}
                    onChange={(e) => setNewLotNumber(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700">Expiry Date</label>
                  <Input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingBatch(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createBatchMutation.isPending}
                >
                  Save Batch
                </Button>
              </div>
            </form>
          )}

          {/* Template & Quantity Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-800 mb-1 block">
                Label Template
              </label>
              <Select
                options={templateOptions}
                value={template}
                onChange={(e) => setTemplate(e.target.value as BarcodeLabelTemplate)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 mb-1 block">
                Quantity (Labels)
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="font-mono text-center"
              />
            </div>
          </div>

          {/* Content Toggles */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-700 block">Print Fields</label>
            <div className="flex flex-wrap gap-4 text-xs text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show Selling Price</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLotExpiry}
                  onChange={(e) => setShowLotExpiry(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show Lot / Expiry</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBrand}
                  onChange={(e) => setShowBrand(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show Brand Name</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Barcode Preview Card */}
        <div className="md:col-span-5 flex flex-col justify-between bg-slate-900 text-white rounded-2xl p-4 shadow-inner">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Live Print Preview</span>
              <span className="font-mono text-[10px] text-blue-400">Code128 Vector</span>
            </div>

            {/* Rendered Label Simulator */}
            <div className="mt-4 bg-white text-slate-900 rounded-xl p-4 shadow-md flex flex-col items-center text-center space-y-2 select-none border border-slate-200">
              {showBrand && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                  {product.brand || "VC ORGANIC'S"}
                </span>
              )}
              <div className="font-bold text-xs text-slate-900 truncate max-w-[200px]">
                {product.name}
              </div>
              <div className="text-[10px] font-mono text-slate-600">
                SKU: {product.sku}
              </div>

              {/* SVG Barcode Output */}
              <div
                className="w-full flex justify-center py-1"
                dangerouslySetInnerHTML={{ __html: livePreviewSvg }}
              />

              {showPrice && (
                <div className="text-sm font-extrabold text-slate-950 font-mono">
                  ₹{(product.sellingPrice || product.price || 0).toFixed(2)}
                  {product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}
                </div>
              )}

              {showLotExpiry && selectedBatch && (
                <div className="text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-md px-2 py-0.5 w-full">
                  {selectedBatch.lotNumber && `Lot: ${selectedBatch.lotNumber}`}
                  {selectedBatch.expiryDate && ` • EXP: ${selectedBatch.expiryDate}`}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-center text-[11px] text-slate-400">
            Print job generates <strong className="text-white">{quantity}</strong> physical sticker label(s).
          </div>
        </div>
      </div>
    </Dialog>
  );
}
