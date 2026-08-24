'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Barcode as BarcodeIcon,
  Layers,
  Calendar,
  AlertCircle,
  Plus,
  Minus,
  Tag,
  Sparkles,
  Check,
  Building2,
  SlidersHorizontal,
  Package,
  Scale
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
import {
  useProductBatchesQuery,
  useProductDetailQuery,
  useCreateProductBatchMutation,
  useGenerateBarcodeMutation,
  useSaveProductMutation
} from '../hooks';
import type { ProductDoc, ProductBatchDoc, BarcodeLabelTemplate } from '../types';

export interface ProductPrintBarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDoc | null;
}

interface TemplateMeta {
  id: BarcodeLabelTemplate;
  name: string;
  dimensions: string;
  description: string;
  aspectRatio: string;
}

const TEMPLATES: TemplateMeta[] = [
  {
    id: 'standard_shelf',
    name: 'Standard Shelf Tag',
    dimensions: '50 × 30 mm',
    description: 'Retail shelf tag with price, brand, and barcode',
    aspectRatio: '5 / 3'
  },
  {
    id: 'sticker_38x25',
    name: 'Product Sticker',
    dimensions: '38 × 25 mm',
    description: 'Adhesive label for jars, boxes & bottles',
    aspectRatio: '3.8 / 2.5'
  },
  {
    id: 'compact_tag',
    name: 'Compact Tag',
    dimensions: '25 × 15 mm',
    description: 'Mini price tag for small retail items',
    aspectRatio: '2.5 / 1.5'
  }
];

export function ProductPrintBarcodeDialog({
  isOpen,
  onClose,
  product: initialProduct
}: ProductPrintBarcodeDialogProps) {
  const { success, error: toastError } = useToast();

  const { data: authoritativeProduct } = useProductDetailQuery(initialProduct?.id, initialProduct);
  const product = authoritativeProduct || initialProduct;

  const { data: batches = [], isLoading: isLoadingBatches } = useProductBatchesQuery(product?.id);
  const createBatchMutation = useCreateProductBatchMutation();
  const generateBarcodeMutation = useGenerateBarcodeMutation();
  const saveProductMutation = useSaveProductMutation();

  // Print Configuration State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('none');
  const [quantity, setQuantity] = useState<number>(3);
  const [template, setTemplate] = useState<BarcodeLabelTemplate>('standard_shelf');
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showLotExpiry, setShowLotExpiry] = useState<boolean>(true);
  const [showBrand, setShowBrand] = useState<boolean>(true);

  // Direct SKU Expiry Edit state
  const [skuExpiryInput, setSkuExpiryInput] = useState<string>('');

  React.useEffect(() => {
    if (product) {
      setSkuExpiryInput(product.defaultExpiryDate || product.doe || '');
    }
  }, [product, isOpen]);

  // Quick Add Batch state
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newBatchQuantity, setNewBatchQuantity] = useState<number>(10);

  // Initialize default selected batch when product or batches load
  const hasInitializedBatch = React.useRef(false);
  React.useEffect(() => {
    if (isOpen) {
      if (!hasInitializedBatch.current && batches.length > 0) {
        setSelectedBatchId(batches[0].id || 'none');
        hasInitializedBatch.current = true;
      }
    } else {
      hasInitializedBatch.current = false;
      setSelectedBatchId('none');
    }
  }, [isOpen, batches]);

  // Explicit barcode check — DO NOT silently treat SKU as barcode
  const assignedBarcode = useMemo(() => {
    return (product?.barcode || '').trim();
  }, [product]);

  const hasAssignedBarcode = Boolean(assignedBarcode);

  const productDefaultExpiry = useMemo(() => {
    return (product?.defaultExpiryDate || product?.doe || '').trim();
  }, [product]);

  const selectedBatch = useMemo<ProductBatchDoc | null>(() => {
    if (selectedBatchId === 'none') return null;
    return batches.find((b) => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const isBatchSelected = Boolean(selectedBatch);

  const effectiveExpiry = useMemo(() => {
    if (isBatchSelected) {
      return (selectedBatch?.expiryDate || '').trim();
    }
    return (skuExpiryInput.trim() || productDefaultExpiry);
  }, [isBatchSelected, selectedBatch, skuExpiryInput, productDefaultExpiry]);

  const currentTemplateMeta = useMemo(() => {
    return TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];
  }, [template]);

  const handleOpenAddBatch = () => {
    setIsAddingBatch(true);
    setNewExpiryDate(skuExpiryInput.trim() || productDefaultExpiry);
    setNewLotNumber('');
    setNewMfgDate(product?.dom || '');
  };

  const handleSaveSkuExpiry = async () => {
    if (!product?.id) return;
    const cleanDate = skuExpiryInput.trim() || undefined;

    try {
      await saveProductMutation.mutateAsync({
        ...product,
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingPrice: product.sellingPrice ?? product.price ?? 0,
        purchasePrice: product.purchasePrice ?? product.cost ?? 0,
        gst: product.gst ?? 0,
        unit: product.unit || 'pc',
        sellingMode: product.sellingMode || 'packaged',
        type: product.type || 'OWN',
        status: product.status || 'active',
        reorderLevel: product.reorderLevel ?? 5,
        maxStock: product.maxStock ?? 100,
        defaultExpiryDate: cleanDate,
        barcodes: (product.barcodes || []).map((b) => ({
          barcode: b.barcode,
          type: (b.type || 'ALTERNATE') as 'PRIMARY' | 'ALTERNATE' | 'VARIANT',
          source: (b.source || 'MANUAL') as 'EXTERNAL' | 'AIAVRO' | 'MANUAL',
          active: b.active !== false,
          variantId: b.variantId,
          variantName: b.variantName
        })),
        variants: (product.variants || []).map((v) => ({
          ...v,
          status: v.status || 'active'
        }))
      });
      if (cleanDate) {
        success('Product Expiry Saved', `Updated SKU default expiry to ${cleanDate} for ${product.name}`);
      } else {
        success('Product Expiry Cleared', `Removed SKU default expiry for ${product.name}`);
      }
    } catch (err: any) {
      toastError('Failed to Save Expiry', err?.message || 'Server error updating product expiry.');
    }
  };

  // Explicit action to generate and assign AIA Barcode
  const handleAssignBarcode = async () => {
    if (!product) return;
    try {
      const res = await generateBarcodeMutation.mutateAsync();
      if (res && res.barcode) {
        await saveProductMutation.mutateAsync({
          ...product,
          barcode: res.barcode,
          barcodeSource: 'AIAVRO',
          gst: product.gst ?? 0,
          unit: product.unit || 'unit',
          sellingMode: product.sellingMode || 'packaged',
          type: product.type || 'OWN',
          status: product.status || 'active',
          reorderLevel: product.reorderLevel ?? 0,
          maxStock: product.maxStock ?? 100,
          defaultExpiryDate: product.defaultExpiryDate || product.doe || undefined,
          barcodes: (product.barcodes || []).map(b => ({
            barcode: b.barcode,
            type: (b.type || 'ALTERNATE') as 'PRIMARY' | 'ALTERNATE' | 'VARIANT',
            source: (b.source || 'MANUAL') as 'EXTERNAL' | 'AIAVRO' | 'MANUAL',
            active: b.active !== false,
            variantId: b.variantId,
            variantName: b.variantName
          })),
          variants: (product.variants || []).map(v => ({
            ...v,
            status: v.status || 'active'
          }))
        });
        success('Barcode Assigned', `Assigned ${res.barcode} to ${product.name}`);
      }
    } catch (err: any) {
      toastError('Failed to Assign Barcode', err?.message || 'Server error generating barcode.');
    }
  };

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

    if (!hasAssignedBarcode) {
      toastError('No Barcode Assigned', 'Please assign a barcode to this product before printing scannable labels.');
      return;
    }

    const labelCount = Math.min(Math.max(1, quantity), 100);
    const barcodeSvgStr = generateBarcodeSvg(assignedBarcode, {
      width: template === 'compact_tag' ? 1.1 : 1.4,
      height: template === 'compact_tag' ? 26 : 36,
      includeText: true,
      fontSize: 10
    });

    const lotText = selectedBatch?.lotNumber ? `Lot: ${selectedBatch.lotNumber}` : '';
    const expText = effectiveExpiry ? `EXP: ${effectiveExpiry}` : '';
    const metaParts = [];
    if (selectedBatch?.lotNumber) metaParts.push(lotText);
    if (effectiveExpiry) metaParts.push(expText);
    const metaText = metaParts.join(' • ');

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
            ${showLotExpiry && metaText ? `<div class="label-meta">${metaText}</div>` : ''}
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

  // Footer summary text
  const footerSummary = useMemo(() => {
    const parts = [
      currentTemplateMeta.name,
      currentTemplateMeta.dimensions,
      selectedBatch
        ? `Batch ${selectedBatch.lotNumber}`
        : (productDefaultExpiry ? `Default EXP ${productDefaultExpiry}` : 'Master Barcode'),
      `${quantity} Label${quantity > 1 ? 's' : ''}`
    ];
    return parts.join(' • ');
  }, [currentTemplateMeta, selectedBatch, productDefaultExpiry, quantity]);

  if (!product) return null;

  const livePreviewSvg = hasAssignedBarcode
    ? generateBarcodeSvg(assignedBarcode, {
        width: template === 'compact_tag' ? 1.15 : 1.4,
        height: template === 'compact_tag' ? 26 : 38,
        includeText: true,
        fontSize: 11
      })
    : '';

  const batchOptions = [
    {
      value: 'none',
      label: productDefaultExpiry
        ? `🏷️ Master Barcode (Default EXP: ${productDefaultExpiry})`
        : '🏷️ Master Product Barcode (No Expiry)'
    },
    ...batches.map((b) => ({
      value: b.id,
      label: `📦 Lot: ${b.lotNumber} | EXP: ${b.expiryDate || 'No Expiry'} (${b.remainingQuantity || 0} left)`
    }))
  ];

  const footerContent = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="text-xs text-slate-500 font-medium truncate max-w-sm hidden sm:block">
        {footerSummary}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={!hasAssignedBarcode}
          leftIcon={<Printer className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          Print {quantity} Label{quantity > 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Print Barcode Labels"
      description={`${product.name} • SKU: ${product.sku}`}
      footer={footerContent}
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-1">
        {/* LEFT COLUMN: Configuration Controls */}
        <div className="md:col-span-7 space-y-4">
          {/* 1. Product Identity Card */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="text-xs font-bold text-slate-900 truncate">{product.name}</span>
              </div>
              <Badge variant={product.sellingMode === 'loose' ? 'info' : 'neutral'} size="sm">
                {product.sellingMode === 'loose' ? '⚖️ Loose Item' : '📦 Packaged'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
              <div className="font-mono text-slate-600">
                SKU: <strong className="text-slate-800">{product.sku}</strong>
              </div>
              <div className="font-semibold text-emerald-700">
                ₹{(product.sellingPrice || product.price || 0).toFixed(2)}
                {product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
              {hasAssignedBarcode ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-900">
                    Barcode: {assignedBarcode}
                  </span>
                  <Badge
                    variant={
                      product.barcodeSource === 'AIAVRO'
                        ? 'brand'
                        : product.barcodeSource === 'EXTERNAL'
                        ? 'info'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {product.barcodeSource === 'EXTERNAL' && '🏢 Manufacturer'}
                    {product.barcodeSource === 'AIAVRO' && '⚡ AIAVRO'}
                    {(!product.barcodeSource || product.barcodeSource === 'MANUAL') && '✍️ Manual'}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    No barcode assigned
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleAssignBarcode}
                    isLoading={generateBarcodeMutation.isPending || saveProductMutation.isPending}
                    leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                  >
                    Generate AIA Code
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Label Template Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              Label Template
            </label>

            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map((tmpl) => {
                const isSelected = template === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplate(tmpl.id)}
                    className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 leading-tight">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] font-mono text-blue-700 font-semibold mt-0.5">
                        {tmpl.dimensions}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 truncate">{tmpl.description.slice(0, 18)}...</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Batch / Expiry Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Inventory Batch & Expiry
              </label>
              <button
                type="button"
                onClick={() => {
                  if (isAddingBatch) {
                    setIsAddingBatch(false);
                  } else {
                    handleOpenAddBatch();
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {isAddingBatch ? 'Cancel' : 'New Batch'}
              </button>
            </div>

            <Select
              options={batchOptions}
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={isLoadingBatches}
            />

            {/* Selected Batch Summary Card or Editable SKU Default Expiry Card */}
            {selectedBatch ? (
              <div className="bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs flex flex-col gap-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Lot: <strong className="text-slate-900 font-mono">{selectedBatch.lotNumber}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <Badge variant="brand" size="sm">📦 BATCH EXPIRY</Badge>
                    <strong className="text-slate-900 font-mono">{selectedBatch.expiryDate || 'No Expiry'}</strong>
                  </span>
                  <span>Available: <strong className="text-emerald-700 font-mono">{selectedBatch.remainingQuantity ?? 0} units</strong></span>
                </div>
                {productDefaultExpiry && selectedBatch.expiryDate && productDefaultExpiry !== selectedBatch.expiryDate && (
                  <div className="text-[10px] text-slate-500 italic">
                    * Overriding SKU default expiry ({productDefaultExpiry})
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="neutral" size="sm">🏷️ SKU DEFAULT</Badge>
                    <span className="font-semibold text-blue-950">Product Expiry</span>
                  </div>
                  {productDefaultExpiry ? (
                    <span className="text-[11px] font-mono font-medium text-blue-700">Current: {productDefaultExpiry}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No SKU default expiry configured</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={skuExpiryInput}
                    onChange={(e) => setSkuExpiryInput(e.target.value)}
                    className="text-xs bg-white flex-1"
                    placeholder="YYYY-MM-DD"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSkuExpiry}
                    isLoading={saveProductMutation.isPending}
                    disabled={skuExpiryInput === productDefaultExpiry}
                  >
                    Save Expiry
                  </Button>
                  {skuExpiryInput && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSkuExpiryInput('')}
                      title="Clear date"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Default expiry for this SKU. Updating will persist directly to the product catalog and sync active labels.
                </p>
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

          {/* 4. Quantity Stepper & Field Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Quantity Stepper */}
            <div className="sm:col-span-6 space-y-1">
              <label className="text-xs font-semibold text-slate-800 block">
                Number of Labels
              </label>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Decrease label quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full text-center font-mono font-bold text-xs text-slate-900 focus:outline-hidden py-1.5"
                  aria-label="Quantity of labels"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(100, quantity + 1))}
                  disabled={quantity >= 100}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                  aria-label="Increase label quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Print {quantity} physical label{quantity > 1 ? 's' : ''} for this product.
              </span>
            </div>

            {/* Content Field Toggles */}
            <div className="sm:col-span-6 space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">
                Print Fields
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPrice(!showPrice)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    showPrice
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {showPrice && <Check className="w-3 h-3 text-blue-600" />}
                  Price
                </button>

                <button
                  type="button"
                  onClick={() => setShowBrand(!showBrand)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    showBrand
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {showBrand && <Check className="w-3 h-3 text-blue-600" />}
                  Brand
                </button>

                <button
                  type="button"
                  onClick={() => setShowLotExpiry(!showLotExpiry)}
                  disabled={!selectedBatch && !productDefaultExpiry}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    !selectedBatch && !productDefaultExpiry
                      ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                      : showLotExpiry
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                  title={!selectedBatch && !productDefaultExpiry ? 'No batch or product expiry configured' : ''}
                >
                  {showLotExpiry && (selectedBatch || productDefaultExpiry) && <Check className="w-3 h-3 text-blue-600" />}
                  {selectedBatch ? 'Lot & Expiry' : 'Product Expiry'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Studio Print Simulator */}
        <div className="md:col-span-5 flex flex-col justify-between bg-slate-100/90 border border-slate-200/90 rounded-2xl p-4 shadow-inner min-h-[320px]">
          <div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 text-slate-600">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                Live Print Simulator
              </span>
              <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                {currentTemplateMeta.dimensions}
              </span>
            </div>

            {/* Rendered Physical Label Container */}
            <div className="mt-4 flex items-center justify-center p-2">
              <div
                className="w-full max-w-[260px] bg-white text-slate-900 rounded-xl p-4 shadow-sm border border-dashed border-slate-300 flex flex-col items-center text-center space-y-1.5 select-none transition-colors"
                style={{ minHeight: template === 'compact_tag' ? '140px' : '180px' }}
              >
                {hasAssignedBarcode ? (
                  <>
                    {showBrand && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {product.brand || "VC ORGANIC'S"}
                      </span>
                    )}
                    <div className="font-bold text-xs text-slate-900 truncate max-w-[220px]">
                      {product.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                      SKU: {product.sku}
                    </div>

                    {/* SVG Vector Barcode Output */}
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

                    {showLotExpiry && (selectedBatch || productDefaultExpiry) && (
                      <div className="text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-md px-2 py-0.5 w-full flex items-center justify-center gap-1 flex-wrap">
                        {selectedBatch?.lotNumber && <span>Lot: {selectedBatch.lotNumber}</span>}
                        {selectedBatch?.lotNumber && effectiveExpiry && <span>•</span>}
                        {effectiveExpiry && <span>EXP: {effectiveExpiry}</span>}
                        {!selectedBatch && productDefaultExpiry && (
                          <span className="text-[9px] text-blue-600 font-normal ml-0.5">(SKU Default)</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2 my-auto">
                    <AlertCircle className="w-7 h-7 text-amber-500 mx-auto" />
                    <div className="text-xs font-bold text-slate-800">No Barcode Assigned</div>
                    <div className="text-[11px] text-slate-500 leading-tight">
                      Assign an external code or generate an AIA sequence to preview.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 text-center text-[11px] text-slate-500">
            {hasAssignedBarcode ? (
              <>Preview rendered at scaled ratio for <strong className="text-slate-800">{currentTemplateMeta.name}</strong>.</>
            ) : (
              <span className="text-amber-700">Assign barcode to enable printing.</span>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
