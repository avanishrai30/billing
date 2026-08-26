'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Layers,
  AlertCircle,
  Plus,
  Minus,
  Tag,
  Sparkles,
  Check,
  SlidersHorizontal
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
  calculateBarcodeFit,
  calculateLabelGeometry,
  calculateLabelScale,
  calculateLabelTypography,
  calculateTextFit,
  formatDisplayDate,
  formatInputDate,
  LABEL_PROFILE_PRESETS,
  resolvePrinterModelProfile,
  type DetectedPrinter,
  type LabelProfile
} from '../../../lib/utils/labelProfiles';
import { buildProductLabelDocument } from '../../../lib/utils/labelDocument';
import {
  checkPrintAgentHealth,
  sendNativePrintJob,
  type PrintAgentHealth
} from '../../../lib/utils/printAgent';
import { usePrinterLabelPreferences } from '../../settings/hooks';
import {
  useProductBatchesQuery,
  useProductDetailQuery,
  useCreateProductBatchMutation,
  useGenerateBarcodeMutation,
  useSaveProductMutation
} from '../hooks';
import type { ProductDoc, ProductBatchDoc } from '../types';

export interface ProductPrintBarcodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDoc | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

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
  const {
    selectedProfileId,
    selectedProfile,
    customProfile,
    printerName,
    printerType,
    printerModelId,
    printerLanguage,
    mediaType,
    sensorMode,
    gapMm,
    xOffsetMm,
    yOffsetMm,
    printAgentUrl,
    setSelectedProfileId,
    setCustomProfile
  } = usePrinterLabelPreferences();

  // Local Print Agent health
  const [agentHealth, setAgentHealth] = useState<PrintAgentHealth>({ connected: false });
  const [isPrintingNative, setIsPrintingNative] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      checkPrintAgentHealth(printAgentUrl).then(setAgentHealth);
    }
  }, [isOpen, printAgentUrl]);

  // Print Configuration State
  const [selectedBatchId, setSelectedBatchId] = useState<string>('none');
  const [quantity, setQuantity] = useState<number>(3);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showLotExpiry, setShowLotExpiry] = useState<boolean>(true);
  const [showBrand, setShowBrand] = useState<boolean>(true);

  // Direct SKU Expiry Edit state
  const [skuExpiryInput, setSkuExpiryInput] = useState<string>('');

  React.useEffect(() => {
    if (product) {
      setSkuExpiryInput(formatInputDate(product.defaultExpiryDate || product.doe || ''));
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
    const rawExpiry = isBatchSelected
      ? (selectedBatch?.expiryDate || '').trim()
      : (skuExpiryInput.trim() || productDefaultExpiry);

    return formatDisplayDate(rawExpiry);
  }, [isBatchSelected, selectedBatch, skuExpiryInput, productDefaultExpiry]);

  const effectiveProfile = useMemo<LabelProfile>(() => ({
    ...selectedProfile,
    showPrice: selectedProfile.showPrice && showPrice,
    showLot: selectedProfile.showLot && showLotExpiry,
    showExpiry: selectedProfile.showExpiry && showLotExpiry
  }), [selectedProfile, showLotExpiry, showPrice]);

  const labelGeometry = useMemo(() => calculateLabelGeometry(effectiveProfile), [effectiveProfile]);
  const labelTypography = useMemo(() => calculateLabelTypography(effectiveProfile), [effectiveProfile]);
  const barcodeFit = useMemo(() => calculateBarcodeFit(assignedBarcode, effectiveProfile), [assignedBarcode, effectiveProfile]);
  const previewScale = useMemo(() => calculateLabelScale(effectiveProfile, 300, 220), [effectiveProfile]);
  const compatibleAgentPrinter = useMemo(() => {
    if (!agentHealth.connected) return null;
    return (agentHealth.printers || []).find((detected) => {
      const resolved = resolvePrinterModelProfile(detected);
      if (!resolved) return false;
      return resolved.language === effectiveProfile.printerLanguage ||
        resolved.language.replace('-', '') === String(effectiveProfile.printerLanguage || '').replace('-', '');
    }) || null;
  }, [agentHealth.connected, agentHealth.printers, effectiveProfile.printerLanguage]);
  const compatibleAgentPrinterName = useMemo(() => {
    if (!compatibleAgentPrinter) return null;
    if (typeof compatibleAgentPrinter === 'string') return compatibleAgentPrinter;
    const detected = compatibleAgentPrinter as DetectedPrinter;
    return detected.model || detected.name || detected.id || null;
  }, [compatibleAgentPrinter]);
  const canUseNativePrinter = Boolean(
    agentHealth.connected &&
    compatibleAgentPrinterName &&
    effectiveProfile.printerLanguage &&
    effectiveProfile.printerLanguage !== 'BROWSER'
  );

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
        success('Product Expiry Saved', `Updated SKU default expiry to ${formatDisplayDate(cleanDate)} for ${product.name}`);
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

  const handlePrint = async () => {
    if (!product) return;

    if (!hasAssignedBarcode) {
      toastError('No Barcode Assigned', 'Please assign a barcode to this product before printing scannable labels.');
      return;
    }

    if (!barcodeFit.safe) {
      toastError('Barcode Cannot Safely Fit', barcodeFit.warnings[0] || 'Choose a larger label before printing.');
      return;
    }

    const labelCount = Math.min(Math.max(1, quantity), 100);

    // 1. If Local Print Agent is online, dispatch native TSPL/ZPL command stream directly
    if (canUseNativePrinter) {
      setIsPrintingNative(true);
      try {
        const labelDoc = buildProductLabelDocument({
          product,
          profile: effectiveProfile,
          selectedBatch,
          effectiveExpiry,
          showPrice,
          showBrand,
          showLotExpiry
        });

        const printResult = await sendNativePrintJob(
          {
            printerProfileId: effectiveProfile.id,
            printerName: compatibleAgentPrinterName || printerName,
            mediaProfile: {
              widthMm: effectiveProfile.widthMm,
              heightMm: effectiveProfile.heightMm,
              gapMm: effectiveProfile.gapMm || 2,
              sensorMode: (effectiveProfile.sensorMode as any) || 'GAP'
            },
            copies: labelCount,
            document: labelDoc
          },
          effectiveProfile,
          printAgentUrl
        );

        if (printResult.success) {
          success(
            'Labels Printed',
            printResult.message || `Dispatched ${labelCount} native label(s) to ${printerName}`
          );
          onClose();
          return;
        } else {
          toastError('Native Print Notice', `${printResult.message}. Falling back to browser print.`);
        }
      } catch (err: any) {
        toastError('Native Print Error', err?.message || 'Failed to dispatch native job. Using browser print.');
      } finally {
        setIsPrintingNative(false);
      }
    } else if (agentHealth.connected) {
      toastError('Native Print Notice', 'Print Agent is online but no compatible printer was discovered. Using browser print.');
    }

    // 2. High-fidelity physical popup browser printing fallback
    const barcodeSvgStr = generateBarcodeSvg(assignedBarcode, {
      width: barcodeFit.moduleWidthPx,
      height: barcodeFit.barHeightPx,
      includeText: effectiveProfile.showBarcodeValue,
      fontSize: barcodeFit.fontSizePx,
      quietZone: barcodeFit.quietZoneModules
    });

    const lotText = selectedBatch?.lotNumber ? `Lot: ${selectedBatch.lotNumber}` : '';
    const expText = effectiveExpiry ? `EXP: ${effectiveExpiry}` : '';
    const metaParts = [];
    if (selectedBatch?.lotNumber) metaParts.push(lotText);
    if (effectiveExpiry) metaParts.push(expText);
    const priceText = showPrice
      ? `₹${(product.sellingPrice || product.price || 0).toFixed(2)}${product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}`
      : '';
    const brandText = showBrand ? (product.brand || "VC ORGANIC'S") : '';
    const productFontMm = calculateTextFit(product.name, labelGeometry.textMaxWidthMm, labelTypography.productFontMm);
    const priceFontMm = priceText
      ? calculateTextFit(priceText, labelGeometry.textMaxWidthMm, labelTypography.priceFontMm, 2)
      : labelTypography.priceFontMm;

    let labelCardsHtml = '';
    for (let i = 0; i < labelCount; i++) {
      labelCardsHtml += `
        <div class="print-label-card ${i === labelCount - 1 ? 'is-last' : ''}">
          ${brandText ? `<div class="label-brand">${escapeHtml(brandText)}</div>` : ''}
          <div class="label-name">${escapeHtml(product.name)}</div>
          <div class="label-barcode">${barcodeSvgStr}</div>
          <div class="label-footer">
            ${priceText ? `<div class="label-price">${escapeHtml(priceText)}</div>` : ''}
            ${showLotExpiry && (selectedBatch?.lotNumber || effectiveExpiry) ? `
              <div class="label-meta">
                ${selectedBatch?.lotNumber ? `<div class="label-meta-item">Lot: ${escapeHtml(selectedBatch.lotNumber)}</div>` : ''}
                ${effectiveExpiry ? `<div class="label-meta-item">EXP: ${escapeHtml(effectiveExpiry)}</div>` : ''}
              </div>
            ` : ''}
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
            size: ${labelGeometry.widthMm}mm ${labelGeometry.heightMm}mm;
            margin: 0;
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
            padding: 0;
          }
          .labels-grid {
            display: block;
          }
          .print-label-card {
            width: ${labelGeometry.widthMm}mm;
            height: ${labelGeometry.heightMm}mm;
            padding: ${effectiveProfile.marginTopMm}mm ${effectiveProfile.marginRightMm}mm ${effectiveProfile.marginBottomMm}mm ${effectiveProfile.marginLeftMm}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: ${labelTypography.rowGapMm}mm;
            text-align: center;
            background: #fff;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
          }
          .print-label-card.is-last {
            page-break-after: auto;
          }
          .label-brand {
            font-size: ${labelTypography.brandFontMm}mm;
            font-weight: 700;
            text-transform: uppercase;
            color: #444;
            max-width: ${labelGeometry.textMaxWidthMm}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .label-name {
            font-size: ${productFontMm}mm;
            line-height: ${labelTypography.productLineHeightMm}mm;
            font-weight: 700;
            max-width: ${labelGeometry.textMaxWidthMm}mm;
            overflow: hidden;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }
          .label-sku {
            font-size: ${labelTypography.skuFontMm}mm;
            font-family: monospace;
            color: #555;
            max-width: ${labelGeometry.textMaxWidthMm}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .label-barcode {
            width: ${labelGeometry.barcodeMaxWidthMm}mm;
            max-height: ${labelGeometry.barcodeMaxHeightMm + 4}mm;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
          }
          .label-barcode svg {
            width: ${barcodeFit.displayWidthMm}mm;
            max-width: 100%;
            height: auto;
          }
          .label-footer {
            width: ${labelGeometry.textMaxWidthMm}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: ${Math.max(0.35, labelTypography.rowGapMm * 0.55)}mm;
            overflow: hidden;
          }
          .label-price {
            font-size: ${priceFontMm}mm;
            font-weight: 800;
            color: #000;
            font-variant-numeric: tabular-nums;
            line-height: 1.05;
            max-width: ${labelGeometry.textMaxWidthMm}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .label-meta {
            font-size: ${labelTypography.metaFontMm}mm;
            line-height: ${labelTypography.metaLineHeightMm}mm;
            font-weight: 600;
            color: #444;
            max-width: ${labelGeometry.textMaxWidthMm}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media print {
            .print-label-card {
              border: 0;
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
      selectedProfile.name,
      `${labelGeometry.widthMm} x ${labelGeometry.heightMm} mm`,
      selectedBatch
        ? `Batch ${selectedBatch.lotNumber}`
        : (productDefaultExpiry ? `Default EXP ${formatDisplayDate(productDefaultExpiry)}` : 'Master Barcode'),
      `${quantity} Label${quantity > 1 ? 's' : ''}`
    ];
    return parts.join(' • ');
  }, [labelGeometry.heightMm, labelGeometry.widthMm, productDefaultExpiry, quantity, selectedBatch, selectedProfile.name]);

  if (!product) return null;

  const livePreviewSvg = hasAssignedBarcode
    ? generateBarcodeSvg(assignedBarcode, {
        width: barcodeFit.moduleWidthPx,
        height: barcodeFit.barHeightPx,
        includeText: effectiveProfile.showBarcodeValue,
        fontSize: barcodeFit.fontSizePx,
        quietZone: barcodeFit.quietZoneModules
      })
    : '';

  const previewLotText = selectedBatch?.lotNumber ? `Lot: ${selectedBatch.lotNumber}` : '';
  const previewExpText = effectiveExpiry ? `EXP: ${effectiveExpiry}` : '';
  const previewMetaText = [previewLotText, previewExpText].filter(Boolean).join(' • ');
  const previewPriceText = showPrice
    ? `₹${(product.sellingPrice || product.price || 0).toFixed(2)}${product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}`
    : '';
  const previewBrandText = showBrand ? (product.brand || "VC ORGANIC'S") : '';
  const previewProductFontMm = calculateTextFit(product.name, labelGeometry.textMaxWidthMm, labelTypography.productFontMm);
  const previewPriceFontMm = previewPriceText
    ? calculateTextFit(previewPriceText, labelGeometry.textMaxWidthMm, labelTypography.priceFontMm, 2)
    : labelTypography.priceFontMm;
  const previewOuterStyle: React.CSSProperties = {
    width: `${labelGeometry.widthMm * previewScale}mm`,
    height: `${labelGeometry.heightMm * previewScale}mm`
  };
  const labelCanvasStyle: React.CSSProperties = {
    width: `${labelGeometry.widthMm}mm`,
    height: `${labelGeometry.heightMm}mm`,
    padding: `${effectiveProfile.marginTopMm}mm ${effectiveProfile.marginRightMm}mm ${effectiveProfile.marginBottomMm}mm ${effectiveProfile.marginLeftMm}mm`,
    gap: `${labelTypography.rowGapMm}mm`,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left'
  };

  const batchOptions = [
    {
      value: 'none',
      label: productDefaultExpiry
        ? `🏷️ Master Barcode (Default EXP: ${formatDisplayDate(productDefaultExpiry)})`
        : '🏷️ Master Product Barcode (No Expiry)'
    },
    ...batches.map((b) => ({
      value: b.id,
      label: `📦 Lot: ${b.lotNumber} | EXP: ${b.expiryDate ? formatDisplayDate(b.expiryDate) : 'No Expiry'} (${b.remainingQuantity || 0} left)`
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
          disabled={!hasAssignedBarcode || !barcodeFit.safe}
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

          {/* 2. Label Media Profile */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              Label Media Profile
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[...LABEL_PROFILE_PRESETS, customProfile].map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 leading-tight">
                        {profile.name}
                      </div>
                      <div className="text-[10px] font-mono text-blue-700 font-semibold mt-0.5">
                        {profile.widthMm} x {profile.heightMm} mm
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 truncate">
                        {profile.id === 'custom' ? 'Custom media' : `${profile.dpi || 203} DPI`}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedProfileId === 'custom' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                {([
                  ['Width', 'widthMm', 20, 160],
                  ['Height', 'heightMm', 15, 120],
                  ['DPI', 'dpi', 152, 600],
                  ['Margin', 'marginTopMm', 0, 20]
                ] as const).map(([label, key, min, max]) => (
                  <div key={String(key)} className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-600">{label}</label>
                    <Input
                      type="number"
                      min={Number(min)}
                      max={Number(max)}
                      value={Number(customProfile[key as keyof typeof customProfile]) || ''}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        const nextProfile = {
                          ...customProfile,
                          [key]: nextValue
                        };
                        if (key === 'marginTopMm') {
                          nextProfile.marginRightMm = nextValue;
                          nextProfile.marginBottomMm = nextValue;
                          nextProfile.marginLeftMm = nextValue;
                        }
                        setCustomProfile(nextProfile);
                      }}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
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
              <div className="bg-slate-100/70 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="min-w-0 sm:col-span-3">
                    <span className="text-slate-500">Lot</span>
                    <strong className="block text-slate-900 font-mono truncate">{selectedBatch.lotNumber}</strong>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500">Batch expiry</span>
                    <strong className="block text-slate-900 font-mono truncate">
                      {selectedBatch.expiryDate ? formatDisplayDate(selectedBatch.expiryDate) : 'No Expiry'}
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-500">Available</span>
                    <strong className="block text-emerald-700 font-mono truncate">{selectedBatch.remainingQuantity ?? 0} units</strong>
                  </div>
                  <div className="flex items-end">
                    <Badge variant="brand" size="sm">📦 BATCH EXPIRY</Badge>
                  </div>
                </div>
                {productDefaultExpiry && selectedBatch.expiryDate && productDefaultExpiry !== selectedBatch.expiryDate && (
                  <div className="text-[10px] text-slate-500 italic mt-1.5">
                    * Overriding SKU default expiry ({formatDisplayDate(productDefaultExpiry)})
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
                    <span className="text-[11px] font-mono font-medium text-blue-700">Current: {formatDisplayDate(productDefaultExpiry)}</span>
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
                    disabled={skuExpiryInput === formatInputDate(productDefaultExpiry)}
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

        {/* RIGHT COLUMN: Physical Print Simulator */}
        <div className="md:col-span-5 flex flex-col justify-between bg-slate-100/90 border border-slate-200/90 rounded-2xl p-4 shadow-inner min-h-[320px]">
          <div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 text-slate-600">
              <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                Live Print Simulator
              </span>
              <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                {labelGeometry.widthMm} x {labelGeometry.heightMm} mm
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-slate-400">Printer</span>
                <span className="block break-words font-bold text-slate-900">{compatibleAgentPrinterName || printerName || 'TVS LP-46 Dlite'}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-slate-400">Media & Gap</span>
                <span className="block break-words font-bold text-slate-900">
                  {mediaType === 'CONTINUOUS' ? 'Continuous' : `Die-Cut (${effectiveProfile.gapMm ?? gapMm ?? 2}mm)`}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-slate-400">Engine Dialect</span>
                <span className="block break-words font-bold text-slate-900">{printerLanguage || 'TSPL-EZ'}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <span className="block text-slate-400">Resolution</span>
                <span className="block break-words font-bold text-slate-900">{effectiveProfile.dpi || 203} DPI</span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-500">
              Native print: <strong className="text-slate-800">
                {canUseNativePrinter ? 'ready' : agentHealth.connected ? 'agent online, no compatible printer' : 'browser fallback'}
              </strong>
            </div>

            <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-600">
              <div className="grid grid-cols-3 gap-2">
                <span>
                  Across printhead
                  <strong className="block font-mono text-slate-900">{effectiveProfile.physicalMedia?.acrossPrintheadMm ?? effectiveProfile.widthMm} mm</strong>
                </span>
                <span>
                  Feed direction
                  <strong className="block font-mono text-slate-900">{effectiveProfile.physicalMedia?.alongFeedMm ?? effectiveProfile.heightMm} mm</strong>
                </span>
                <span>
                  Gap / rotation
                  <strong className="block font-mono text-slate-900">
                    {mediaType === 'CONTINUOUS' ? '0' : (effectiveProfile.gapMm ?? gapMm ?? 2)} mm / {effectiveProfile.barcodeRotation ?? 0}°
                  </strong>
                </span>
              </div>
            </div>

            {barcodeFit.warnings.length > 0 && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-snug ${
                barcodeFit.safe
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{barcodeFit.warnings[0]}</span>
                </div>
              </div>
            )}

            {/* Scaled physical label canvas */}
            <div className="mt-4 flex items-center justify-center p-2 overflow-hidden">
              <div style={previewOuterStyle}>
                <div
                  className="bg-white text-slate-900 rounded-md shadow-sm border border-dashed border-slate-300 flex flex-col items-center justify-center text-center select-none transition-colors overflow-hidden"
                  style={labelCanvasStyle}
                >
                {hasAssignedBarcode ? (
                  <>
                    {showBrand && (
                      <span
                        className="font-bold uppercase text-slate-500 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ fontSize: `${labelTypography.brandFontMm}mm` }}
                      >
                        {previewBrandText}
                      </span>
                    )}
                    <div
                      className="font-bold text-slate-900 max-w-full overflow-hidden"
                      style={{
                        fontSize: `${previewProductFontMm}mm`,
                        lineHeight: `${labelTypography.productLineHeightMm}mm`,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2
                      }}
                    >
                      {product.name}
                    </div>

                    {/* SVG Vector Barcode Output */}
                    <div
                      className="flex justify-center items-center overflow-hidden"
                      style={{
                        width: `${labelGeometry.barcodeMaxWidthMm}mm`,
                        maxHeight: `${labelGeometry.barcodeMaxHeightMm + 4}mm`
                      }}
                      dangerouslySetInnerHTML={{ __html: livePreviewSvg }}
                    />

                    {showPrice && (
                      <div
                        className="font-extrabold text-slate-950 font-mono max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ fontSize: `${previewPriceFontMm}mm`, lineHeight: 1.05 }}
                      >
                        {previewPriceText}
                      </div>
                    )}

                    {showLotExpiry && (selectedBatch || effectiveExpiry) && (
                      <div
                        className="font-semibold text-slate-600 max-w-full overflow-hidden flex flex-col items-center gap-[0.2mm]"
                        style={{
                          fontSize: `${labelTypography.metaFontMm}mm`,
                          lineHeight: `${labelTypography.metaLineHeightMm}mm`
                        }}
                      >
                        {selectedBatch?.lotNumber && (
                          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                            Lot: {selectedBatch.lotNumber}
                          </span>
                        )}
                        {effectiveExpiry && (
                          <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                            <span>EXP: {effectiveExpiry}</span>
                            {!selectedBatch && productDefaultExpiry && (
                              <span className="text-blue-600 font-normal ml-0.5"> (SKU Default)</span>
                            )}
                          </span>
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
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 text-center text-[11px] text-slate-500">
            {hasAssignedBarcode ? (
              <>
                Preview uses <strong className="text-slate-800">{selectedProfile.name}</strong> at {selectedProfile.dpi || 203} DPI.
                <span className="block font-mono text-[10px] text-slate-400">
                  Module {barcodeFit.moduleWidthPx.toFixed(2)}px / min {barcodeFit.minModuleWidthMm}mm
                </span>
              </>
            ) : (
              <span className="text-amber-700">Assign barcode to enable printing.</span>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
