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
  SlidersHorizontal,
  ArrowLeftRight,
  ArrowUpDown,
  RotateCcw,
  RotateCw,
  Save,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter
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
  calculateLabelTypography,
  calculateTextFit,
  formatDisplayDate,
  formatInputDate,
  LABEL_PROFILE_PRESETS,
  mmToPx,
  resolvePrinterModelProfile,
  type BarcodeRotation,
  type DetectedPrinter,
  type LabelProfile
} from '../../../lib/utils/labelProfiles';
import { calculatePreviewFit } from '../../../lib/utils/previewFit';
import { buildProductLabelDocument } from '../../../lib/utils/labelDocument';
import {
  LABEL_DESIGN_STORAGE_KEY,
  SCREEN_PX_PER_MM,
  alignElements,
  autoFixLabelDesign,
  calculateResize,
  calculateRotation,
  createDefaultLabelDesign,
  detectCollisions,
  distributeElements,
  getDesignElementText,
  getElementBounds,
  hitTestElement,
  mmToScreen,
  screenToMm,
  validateLabelDesign,
  type LabelDesign,
  type LabelDesignElement,
  type LabelDesignElementType,
  type ResizeHandle
} from '../../../lib/utils/labelDesign';
import {
  checkPrintAgentHealth,
  sendNativePrintJob,
  sendNativeCalibrate,
  sendNativeTestPrint,
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

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

type EditorAction =
  | { kind: 'drag'; startClientX: number; startClientY: number; originals: Record<string, LabelDesignElement>; beforeDesign: LabelDesign; historyCaptured?: boolean }
  | { kind: 'resize'; handle: ResizeHandle; startClientX: number; startClientY: number; original: LabelDesignElement; beforeDesign: LabelDesign; historyCaptured?: boolean }
  | { kind: 'rotate'; startClientX: number; startClientY: number; original: LabelDesignElement; beforeDesign: LabelDesign; historyCaptured?: boolean };

const EDITABLE_LABEL_ELEMENTS: LabelDesignElementType[] = ['brand', 'product', 'barcode', 'barcodeValue', 'price', 'lot', 'expiry'];

const labelElementName: Record<LabelDesignElementType, string> = {
  brand: 'Brand',
  product: 'Product Name',
  barcode: 'Barcode',
  barcodeValue: 'Barcode Text',
  price: 'Price',
  lot: 'Lot',
  expiry: 'Expiry'
};

const resizeHandles: ResizeHandle[] = ['nw', 'ne', 'se', 'sw'];

const parseSavedDesigns = (raw: string | null): LabelDesign[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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
  const [labelOrientation, setLabelOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [barcodeRotation, setBarcodeRotation] = useState<BarcodeRotation>(0);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'manual'>('auto');
  const [designDpi, setDesignDpi] = useState<number>(selectedProfile.dpi || 203);
  const [brandScale, setBrandScale] = useState<number>(1);
  const [productScale, setProductScale] = useState<number>(1);
  const [priceScale, setPriceScale] = useState<number>(1);
  const [metaScale, setMetaScale] = useState<number>(1);
  const [barcodeScale, setBarcodeScale] = useState<number>(1);
  const [barcodeTextScale, setBarcodeTextScale] = useState<number>(1);
  const [previewViewportRef, previewViewportSize] = useElementSize<HTMLDivElement>();

  React.useEffect(() => {
    if (isOpen) {
      setDesignDpi(selectedProfile.dpi || 203);
    }
  }, [isOpen, selectedProfile.dpi, selectedProfileId]);

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
    dpi: designDpi,
    orientation: labelOrientation === 'vertical' ? 90 : 0,
    barcodeRotation,
    brandScale,
    productScale,
    priceScale,
    metaScale,
    barcodeScale,
    barcodeTextScale,
    showPrice: selectedProfile.showPrice && showPrice,
    showLot: selectedProfile.showLot && showLotExpiry,
    showExpiry: selectedProfile.showExpiry && showLotExpiry
  }), [
    barcodeRotation,
    barcodeScale,
    barcodeTextScale,
    brandScale,
    designDpi,
    labelOrientation,
    metaScale,
    priceScale,
    productScale,
    selectedProfile,
    showLotExpiry,
    showPrice
  ]);

  const labelGeometry = useMemo(() => calculateLabelGeometry(effectiveProfile), [effectiveProfile]);
  const labelTypography = useMemo(() => calculateLabelTypography(effectiveProfile), [effectiveProfile]);
  const barcodeFit = useMemo(() => calculateBarcodeFit(assignedBarcode, effectiveProfile), [assignedBarcode, effectiveProfile]);
  const defaultLabelDesign = useMemo(() => {
    if (!product) return null;
    return createDefaultLabelDesign({
      profile: effectiveProfile,
      product,
      selectedBatch,
      effectiveExpiry,
      showPrice,
      showBrand,
      showLotExpiry
    });
  }, [effectiveExpiry, effectiveProfile, product, selectedBatch, showBrand, showLotExpiry, showPrice]);
  const [labelDesign, setLabelDesign] = useState<LabelDesign | null>(null);
  const [designScopeKey, setDesignScopeKey] = useState('');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<LabelDesign[]>([]);
  const [redoStack, setRedoStack] = useState<LabelDesign[]>([]);
  const [editorAction, setEditorAction] = useState<EditorAction | null>(null);
  const [editorZoom, setEditorZoom] = useState<number>(1);
  const [savedDesigns, setSavedDesigns] = useState<LabelDesign[]>([]);
  const [selectedSavedDesignId, setSelectedSavedDesignId] = useState('');
  const [newDesignName, setNewDesignName] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    setSavedDesigns(parseSavedDesigns(window.localStorage.getItem(LABEL_DESIGN_STORAGE_KEY)));
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !defaultLabelDesign || !product) return;
    const nextScopeKey = [
      product.id,
      effectiveProfile.id,
      effectiveProfile.widthMm,
      effectiveProfile.heightMm,
      effectiveProfile.dpi,
      labelOrientation,
      barcodeRotation,
      showPrice,
      showBrand,
      showLotExpiry,
      selectedBatchId
    ].join(':');
    if (designScopeKey !== nextScopeKey || layoutMode === 'auto') {
      setLabelDesign(defaultLabelDesign);
      setDesignScopeKey(nextScopeKey);
      setSelectedElementIds(defaultLabelDesign.elements[0] ? [defaultLabelDesign.elements[0].id] : []);
      setUndoStack([]);
      setRedoStack([]);
    }
  }, [
    barcodeRotation,
    defaultLabelDesign,
    designScopeKey,
    effectiveProfile.dpi,
    effectiveProfile.heightMm,
    effectiveProfile.id,
    effectiveProfile.widthMm,
    isOpen,
    labelOrientation,
    layoutMode,
    product,
    selectedBatchId,
    showBrand,
    showLotExpiry,
    showPrice
  ]);

  const activeDesign = labelDesign || defaultLabelDesign;
  const selectedElements = useMemo(
    () => (activeDesign?.elements || []).filter((element) => selectedElementIds.includes(element.id)),
    [activeDesign, selectedElementIds]
  );
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const designCollisions = useMemo(() => detectCollisions(activeDesign?.elements || []), [activeDesign]);
  const designBoundsWarnings = useMemo(
    () => activeDesign ? validateLabelDesign(activeDesign, effectiveProfile) : [],
    [activeDesign, effectiveProfile]
  );
  const labelBaseWidthPx = useMemo(() => mmToPx(labelGeometry.widthMm, 96), [labelGeometry.widthMm]);
  const labelBaseHeightPx = useMemo(() => mmToPx(labelGeometry.heightMm, 96), [labelGeometry.heightMm]);
  const previewFit = useMemo(() => calculatePreviewFit({
    labelWidthPx: labelBaseWidthPx,
    labelHeightPx: labelBaseHeightPx,
    availableWidthPx: previewViewportSize.width || 440,
    availableHeightPx: previewViewportSize.height || 300,
    paddingPx: 20,
    maxScale: 2.6
  }), [labelBaseHeightPx, labelBaseWidthPx, previewViewportSize.height, previewViewportSize.width]);
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
  const designWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (![203, 300, 600].includes(designDpi)) {
      warnings.push('Unsupported printer DPI. Use 203, 300, or 600.');
    }
    if (!barcodeFit.safe) {
      warnings.push(barcodeFit.warnings[0] || 'Barcode cannot safely fit on this label.');
    }
    if (designBoundsWarnings.length > 0) {
      warnings.push(designBoundsWarnings[0]);
    }
    if (designCollisions.length > 0) {
      warnings.push(`${designCollisions.length} label element collision${designCollisions.length > 1 ? 's' : ''} detected.`);
    }
    if (previewFit.widthPx > 0 && previewFit.heightPx > 0) {
      const availableWidth = previewViewportSize.width || 440;
      const availableHeight = previewViewportSize.height || 300;
      if (previewFit.widthPx > availableWidth || previewFit.heightPx > availableHeight) {
        warnings.push('Preview canvas does not fit inside the available viewport.');
      }
    }
    return warnings;
  }, [barcodeFit.safe, barcodeFit.warnings, designBoundsWarnings, designCollisions.length, designDpi, previewFit.heightPx, previewFit.widthPx, previewViewportSize.height, previewViewportSize.width]);
  const hasBlockingDesignError = !barcodeFit.safe || ![203, 300, 600].includes(designDpi);

  const resetDesignLayout = () => {
    setLayoutMode('auto');
    setLabelOrientation('horizontal');
    setBarcodeRotation(0);
    setDesignDpi(selectedProfile.dpi || 203);
    setBrandScale(1);
    setProductScale(1);
    setPriceScale(1);
    setMetaScale(1);
    setBarcodeScale(1);
    setBarcodeTextScale(1);
    if (defaultLabelDesign) {
      setLabelDesign(defaultLabelDesign);
      setSelectedElementIds(defaultLabelDesign.elements[0] ? [defaultLabelDesign.elements[0].id] : []);
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  const commitDesign = React.useCallback((updater: (current: LabelDesign) => LabelDesign) => {
    setLabelDesign((current) => {
      if (!current) return current;
      const next = updater(current);
      if (next === current) return current;
      setUndoStack((stack) => [...stack.slice(-19), current]);
      setRedoStack([]);
      setLayoutMode('manual');
      return next;
    });
  }, []);

  const previewTransform = useMemo(() => ({
    scale: previewFit.scale * editorZoom,
    originXPx: 0,
    originYPx: 0,
    pxPerMm: SCREEN_PX_PER_MM
  }), [editorZoom, previewFit.scale]);

  const updateElement = React.useCallback((elementId: string, patch: Partial<LabelDesignElement>) => {
    commitDesign((current) => ({
      ...current,
      elements: current.elements.map((element) => element.id === elementId ? { ...element, ...patch } : element)
    }));
  }, [commitDesign]);

  const handleUndo = () => {
    setUndoStack((stack) => {
      const previous = stack[stack.length - 1];
      if (!previous) return stack;
      setLabelDesign((current) => {
        if (!current) return current;
        setRedoStack((redo) => [current, ...redo].slice(0, 20));
        return previous;
      });
      return stack.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((stack) => {
      const next = stack[0];
      if (!next) return stack;
      setLabelDesign((current) => {
        if (!current) return current;
        setUndoStack((undo) => [...undo.slice(-19), current]);
        return next;
      });
      return stack.slice(1);
    });
  };

  const handleSaveDesign = () => {
    if (!activeDesign) return;
    const name = (newDesignName.trim() || activeDesign.name || 'Barcode label design').slice(0, 60);
    const designToSave: LabelDesign = {
      ...activeDesign,
      id: `label-design-${Date.now()}`,
      name
    };
    const nextSaved = [designToSave, ...savedDesigns.filter((item) => item.name !== name)].slice(0, 30);
    window.localStorage.setItem(LABEL_DESIGN_STORAGE_KEY, JSON.stringify(nextSaved));
    setSavedDesigns(nextSaved);
    setSelectedSavedDesignId(designToSave.id);
    setNewDesignName('');
    success('Label Design Saved', `${name} can be loaded for this label geometry.`);
  };

  const handleLoadDesign = () => {
    const saved = savedDesigns.find((item) => item.id === selectedSavedDesignId);
    if (!saved) return;
    setLabelDesign({
      ...saved,
      profileId: effectiveProfile.id,
      dpi: designDpi,
      orientation: labelOrientation === 'vertical' ? 90 : 0
    });
    setLayoutMode('manual');
    setUndoStack([]);
    setRedoStack([]);
    setSelectedElementIds(saved.elements[0] ? [saved.elements[0].id] : []);
  };

  const handleResetElement = () => {
    if (!selectedElement || !defaultLabelDesign) return;
    const defaultElement = defaultLabelDesign.elements.find((element) => element.id === selectedElement.id);
    if (!defaultElement) return;
    updateElement(selectedElement.id, defaultElement);
  };

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDesign || layoutMode === 'auto') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointMm = screenToMm({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }, previewTransform);
    const hit = hitTestElement(pointMm, activeDesign.elements);
    if (!hit) {
      setSelectedElementIds([]);
      return;
    }
    const nextSelection = event.shiftKey || event.metaKey
      ? selectedElementIds.includes(hit.id)
        ? selectedElementIds.filter((id) => id !== hit.id)
        : [...selectedElementIds, hit.id]
      : selectedElementIds.includes(hit.id) ? selectedElementIds : [hit.id];
    setSelectedElementIds(nextSelection);
    if (hit.locked) return;
    const originals = Object.fromEntries(
      activeDesign.elements
        .filter((element) => nextSelection.includes(element.id) && !element.locked)
        .map((element) => [element.id, element])
    );
    setUndoStack((stack) => [...stack.slice(-19), activeDesign]);
    setRedoStack([]);
    setEditorAction({
      kind: 'drag',
      startClientX: event.clientX,
      startClientY: event.clientY,
      originals,
      beforeDesign: activeDesign,
      historyCaptured: true
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editorAction || !activeDesign) return;
    const deltaMm = {
      x: (event.clientX - editorAction.startClientX) / (SCREEN_PX_PER_MM * previewTransform.scale),
      y: (event.clientY - editorAction.startClientY) / (SCREEN_PX_PER_MM * previewTransform.scale)
    };

    if (editorAction.kind === 'drag') {
      const movedIds = new Set(Object.keys(editorAction.originals));
      setLabelDesign((current) => current ? {
        ...current,
        elements: current.elements.map((element) => {
          const original = editorAction.originals[element.id];
          if (!original) return element;
          return {
            ...element,
            xMm: Math.min(Math.max(0, Math.round((original.xMm + deltaMm.x) * 10) / 10), Math.max(0, labelGeometry.widthMm - element.widthMm)),
            yMm: Math.min(Math.max(0, Math.round((original.yMm + deltaMm.y) * 10) / 10), Math.max(0, labelGeometry.heightMm - element.heightMm))
          };
        })
      } : current);
      if (movedIds.size > 0) setLayoutMode('manual');
      return;
    }

    if (editorAction.kind === 'resize') {
      const resized = calculateResize({
        element: editorAction.original,
        handle: editorAction.handle,
        deltaMm,
        labelWidthMm: labelGeometry.widthMm,
        labelHeightMm: labelGeometry.heightMm,
        preserveAspectRatio: editorAction.original.type === 'barcode' && editorAction.original.lockAspectRatio !== false,
        snapEnabled: activeDesign.snapEnabled
      });
      setLabelDesign((current) => current ? {
        ...current,
        elements: current.elements.map((element) => element.id === resized.id ? resized : element)
      } : current);
      setLayoutMode('manual');
      return;
    }

    const center = {
      x: editorAction.original.xMm + editorAction.original.widthMm / 2,
      y: editorAction.original.yMm + editorAction.original.heightMm / 2
    };
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerMm = screenToMm({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }, previewTransform);
    const rotation = calculateRotation({ center, pointer: pointerMm, snapDegrees: event.shiftKey ? 45 : 1 });
    setLabelDesign((current) => current ? {
      ...current,
      elements: current.elements.map((element) => element.id === editorAction.original.id ? { ...element, rotation } : element)
    } : current);
    setLayoutMode('manual');
  };

  const handleCanvasPointerUp = () => {
    if (editorAction && !editorAction.historyCaptured) {
      setUndoStack((stack) => [...stack.slice(-19), editorAction.beforeDesign]);
      setRedoStack([]);
    }
    setEditorAction(null);
  };

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

    if (hasBlockingDesignError) {
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
          design: activeDesign,
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
    const printLabelDoc = buildProductLabelDocument({
      product,
      profile: effectiveProfile,
      design: activeDesign,
      selectedBatch,
      effectiveExpiry,
      showPrice,
      showBrand,
      showLotExpiry
    });
    const renderPrintElement = (element: typeof printLabelDoc.elements[number]) => {
      if (element.type === 'barcode') {
        const svg = generateBarcodeSvg(element.value, {
          width: barcodeFit.moduleWidthPx,
          height: barcodeFit.barHeightPx,
          includeText: element.showHumanReadableText,
          fontSize: barcodeFit.fontSizePx,
          quietZone: element.quietZoneModules ?? barcodeFit.quietZoneModules
        });
        return `<div class="label-element label-barcode-element" style="left:${element.xMm}mm;top:${element.yMm}mm;width:${element.widthMm}mm;height:${element.heightMm}mm;transform:rotate(${element.rotation || 0}deg);">${svg}</div>`;
      }
      if (element.type === 'text') {
        return `<div class="label-element label-text-element" style="left:${element.xMm}mm;top:${element.yMm}mm;width:${element.widthMm}mm;height:${element.heightMm}mm;font-size:${element.fontSizeMm}mm;line-height:${element.lineHeightMm || element.fontSizeMm * 1.15}mm;text-align:${element.align};font-weight:${element.weight || 'normal'};">${escapeHtml(element.value)}</div>`;
      }
      return '';
    };

    let labelCardsHtml = '';
    for (let i = 0; i < labelCount; i++) {
      labelCardsHtml += `
        <div class="print-label-card ${i === labelCount - 1 ? 'is-last' : ''}">
          ${printLabelDoc.elements.map(renderPrintElement).join('')}
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
            position: relative;
            background: #fff;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
          }
          .print-label-card.is-last {
            page-break-after: auto;
          }
          .label-element {
            position: absolute;
            transform-origin: center;
          }
          .label-text-element {
            color: #000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-variant-numeric: tabular-nums;
            overflow-wrap: anywhere;
          }
          .label-barcode-element,
          .label-barcode-element svg {
            display: block;
          }
          .label-barcode-element svg {
            width: 100%;
            height: 100%;
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

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      const res = await sendNativeTestPrint(effectiveProfile, printAgentUrl);
      if (res.success) {
        success('Test Print Sent', res.message || 'Diagnostic label printed successfully.');
      } else {
        toastError('Test Print Notice', res.message);
      }
    } catch (err: any) {
      toastError('Test Print Error', err?.message || 'Failed to send test label.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCalibrate = async () => {
    setIsCalibrating(true);
    try {
      const res = await sendNativeCalibrate(effectiveProfile, printAgentUrl);
      if (res.success) {
        success('Calibration Sent', res.message || 'Sensor calibration triggered.');
      } else {
        toastError('Calibration Notice', res.message);
      }
    } catch (err: any) {
      toastError('Calibration Error', err?.message || 'Failed to trigger calibration.');
    } finally {
      setIsCalibrating(false);
    }
  };

  // Footer summary text
  const footerSummary = useMemo(() => {
    const parts = [
      compatibleAgentPrinterName || printerName || selectedProfile.name,
      `${labelGeometry.widthMm} x ${labelGeometry.heightMm} mm`,
      labelOrientation === 'vertical' ? 'Vertical' : 'Horizontal',
      `${effectiveProfile.dpi || 203} DPI`,
      selectedBatch
        ? `Batch ${selectedBatch.lotNumber}`
        : (productDefaultExpiry ? `Default EXP ${formatDisplayDate(productDefaultExpiry)}` : 'Master Barcode'),
      `${quantity} Label${quantity > 1 ? 's' : ''}`
    ];
    return parts.join(' • ');
  }, [
    compatibleAgentPrinterName,
    labelGeometry.heightMm,
    labelGeometry.widthMm,
    labelOrientation,
    printerName,
    productDefaultExpiry,
    quantity,
    selectedBatch,
    effectiveProfile.dpi,
    selectedProfile.name
  ]);

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
  const barcodeBoxWidthPx = mmToPx(barcodeFit.displayWidthMm, 96);
  const barcodeBoxHeightPx = mmToPx(barcodeFit.displayHeightMm, 96);
  const barcodePreviewStyle: React.CSSProperties = {
    width: `${barcodeRotation === 90 || barcodeRotation === 270 ? barcodeBoxHeightPx : barcodeBoxWidthPx}px`,
    height: `${barcodeRotation === 90 || barcodeRotation === 270 ? barcodeBoxWidthPx : barcodeBoxHeightPx}px`,
    maxWidth: `${mmToPx(labelGeometry.barcodeMaxWidthMm, 96)}px`,
    maxHeight: `${mmToPx(labelGeometry.barcodeMaxHeightMm + 3, 96)}px`
  };
  const barcodeSvgStyle: React.CSSProperties = {
    width: `${barcodeBoxWidthPx}px`,
    height: `${barcodeBoxHeightPx}px`,
    transform: `translate(-50%, -50%) rotate(${barcodeRotation}deg)`,
    transformOrigin: 'center'
  };
  const previewOuterStyle: React.CSSProperties = {
    width: `${previewFit.widthPx * editorZoom}px`,
    height: `${previewFit.heightPx * editorZoom}px`
  };
  const labelCanvasStyle: React.CSSProperties = {
    width: `${labelBaseWidthPx}px`,
    height: `${labelBaseHeightPx}px`,
    position: 'relative',
    transform: `scale(${previewTransform.scale})`,
    transformOrigin: 'top left'
  };
  const selectedBounds = selectedElements.length > 0
    ? {
        xMm: Math.min(...selectedElements.map((element) => element.xMm)),
        yMm: Math.min(...selectedElements.map((element) => element.yMm)),
        rightMm: Math.max(...selectedElements.map((element) => element.xMm + element.widthMm)),
        bottomMm: Math.max(...selectedElements.map((element) => element.yMm + element.heightMm))
      }
    : null;

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

  const scaleControls = [
    ['Product', productScale, setProductScale],
    ['Price', priceScale, setPriceScale],
    ['Brand', brandScale, setBrandScale],
    ['Lot / Expiry', metaScale, setMetaScale],
    ['Barcode', barcodeScale, setBarcodeScale],
    ['Barcode Text', barcodeTextScale, setBarcodeTextScale]
  ] as const;

  const editorElements = activeDesign?.elements.filter((element) => {
    if (element.visible === false) return false;
    if (element.type === 'brand') return showBrand;
    if (element.type === 'price') return showPrice;
    if (element.type === 'lot') return showLotExpiry && Boolean(selectedBatch?.lotNumber);
    if (element.type === 'expiry') return showLotExpiry && Boolean(effectiveExpiry);
    if (element.type === 'barcode' || element.type === 'barcodeValue') return hasAssignedBarcode;
    return true;
  }) || [];

  const handleElementPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    element: LabelDesignElement
  ) => {
    if (!activeDesign || layoutMode === 'auto') return;
    event.stopPropagation();
    const nextSelection = event.shiftKey || event.metaKey
      ? selectedElementIds.includes(element.id)
        ? selectedElementIds.filter((id) => id !== element.id)
        : [...selectedElementIds, element.id]
      : selectedElementIds.includes(element.id) ? selectedElementIds : [element.id];
    setSelectedElementIds(nextSelection);
    if (element.locked) return;
    const originals = Object.fromEntries(
      activeDesign.elements
        .filter((candidate) => nextSelection.includes(candidate.id) && !candidate.locked)
        .map((candidate) => [candidate.id, candidate])
    );
    setUndoStack((stack) => [...stack.slice(-19), activeDesign]);
    setRedoStack([]);
    setEditorAction({
      kind: 'drag',
      startClientX: event.clientX,
      startClientY: event.clientY,
      originals,
      beforeDesign: activeDesign,
      historyCaptured: true
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    element: LabelDesignElement,
    handle: ResizeHandle
  ) => {
    event.stopPropagation();
    if (element.locked || !activeDesign) return;
    setSelectedElementIds([element.id]);
    setUndoStack((stack) => [...stack.slice(-19), activeDesign]);
    setRedoStack([]);
    setEditorAction({
      kind: 'resize',
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      original: element,
      beforeDesign: activeDesign,
      historyCaptured: true
    });
  };

  const startRotate = (
    event: React.PointerEvent<HTMLButtonElement>,
    element: LabelDesignElement
  ) => {
    event.stopPropagation();
    if (element.locked || !activeDesign) return;
    setSelectedElementIds([element.id]);
    setUndoStack((stack) => [...stack.slice(-19), activeDesign]);
    setRedoStack([]);
    setEditorAction({
      kind: 'rotate',
      startClientX: event.clientX,
      startClientY: event.clientY,
      original: element,
      beforeDesign: activeDesign,
      historyCaptured: true
    });
  };

  const applyAlignment = (alignment: Parameters<typeof alignElements>[2]) => {
    if (selectedElementIds.length < 2) return;
    commitDesign((current) => ({
      ...current,
      elements: alignElements(current.elements, selectedElementIds, alignment)
    }));
  };

  const applyDistribution = (axis: 'horizontal' | 'vertical') => {
    if (selectedElementIds.length < 3) return;
    commitDesign((current) => ({
      ...current,
      elements: distributeElements(current.elements, selectedElementIds, axis)
    }));
  };

  const updateTextFontSize = (element: LabelDesignElement, fontSizeMm: number) => {
    const heightFactor = element.type === 'product' ? 2.7 : 1.3;
    updateElement(element.id, {
      fontSizeMm,
      lineHeightMm: fontSizeMm * 1.15,
      heightMm: fontSizeMm * heightFactor
    });
  };

  const renderEditorElement = (element: LabelDesignElement) => {
    const isSelected = selectedElementIds.includes(element.id);
    const left = mmToPx(element.xMm, 96);
    const top = mmToPx(element.yMm, 96);
    const width = mmToPx(element.widthMm, 96);
    const height = mmToPx(element.heightMm, 96);
    const commonStyle: React.CSSProperties = {
      left,
      top,
      width,
      height,
      transform: `rotate(${element.rotation}deg)`,
      transformOrigin: 'center',
      position: 'absolute',
      zIndex: isSelected ? 20 : element.type === 'barcode' ? 8 : element.type === 'barcodeValue' ? 6 : 4
    };

    const selectionChrome = isSelected && (
      <>
        <div className="pointer-events-none absolute inset-0 rounded-[2px] border border-blue-600 ring-2 ring-blue-500/20" />
        {resizeHandles.map((handle) => (
          <button
            key={handle}
            type="button"
            aria-label={`Resize ${labelElementName[element.type]} ${handle}`}
            onPointerDown={(event) => startResize(event, element, handle)}
            className={`absolute h-2.5 w-2.5 rounded-full border border-white bg-blue-600 shadow-sm ${
              handle === 'nw' ? '-left-1.5 -top-1.5 cursor-nwse-resize' :
              handle === 'ne' ? '-right-1.5 -top-1.5 cursor-nesw-resize' :
              handle === 'se' ? '-right-1.5 -bottom-1.5 cursor-nwse-resize' :
              '-left-1.5 -bottom-1.5 cursor-nesw-resize'
            }`}
          />
        ))}
        <button
          type="button"
          aria-label={`Rotate ${labelElementName[element.type]}`}
          onPointerDown={(event) => startRotate(event, element)}
          className="absolute left-1/2 -top-7 h-4 w-4 -translate-x-1/2 rounded-full border border-blue-600 bg-white text-blue-700 shadow-sm"
        >
          <RotateCw className="h-3 w-3" />
        </button>
      </>
    );

    if (element.type === 'barcode') {
      return (
        <div
          key={element.id}
          data-testid={`label-element-${element.id}`}
          role="button"
          tabIndex={0}
          aria-label={labelElementName[element.type]}
          onPointerDown={(event) => handleElementPointerDown(event, element)}
          className={`group flex items-center justify-center rounded-[2px] ${element.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
          style={{
            ...commonStyle,
            transform: 'none'
          }}
        >
          <div
            data-testid="barcode-svg-content"
            className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
            style={{
              transform: `rotate(${element.rotation}deg)`,
              transformOrigin: 'center'
            }}
            dangerouslySetInnerHTML={{ __html: livePreviewSvg }}
          />
          {selectionChrome}
        </div>
      );
    }

    const text = getDesignElementText({ element, product, selectedBatch, effectiveExpiry });
    const showSkuDefaultCue = element.type === 'expiry' && !selectedBatch && productDefaultExpiry;
    return (
      <div
        key={element.id}
        data-testid={`label-element-${element.id}`}
        role="button"
        tabIndex={0}
        aria-label={labelElementName[element.type]}
        onPointerDown={(event) => handleElementPointerDown(event, element)}
        className={`flex items-center rounded-[2px] px-0.5 text-slate-950 ${element.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
        style={{
          ...commonStyle,
          fontSize: `${mmToPx(element.fontSizeMm || 2, 96)}px`,
          lineHeight: `${mmToPx(element.lineHeightMm || (element.fontSizeMm || 2) * 1.15, 96)}px`,
          fontWeight: element.fontWeight === 'extrabold' ? 800 : element.fontWeight === 'bold' ? 700 : element.fontWeight === 'semibold' ? 600 : 400,
          justifyContent: element.alignment === 'left' ? 'flex-start' : element.alignment === 'right' ? 'flex-end' : 'center',
          letterSpacing: `${mmToPx(element.letterSpacingMm || 0, 96)}px`,
          textAlign: element.alignment || 'center',
          overflowWrap: 'anywhere'
        }}
      >
        <span className="line-clamp-2">
          <span>{text}</span>
          {showSkuDefaultCue && <span className="ml-0.5 font-normal text-blue-600">(SKU Default)</span>}
        </span>
        {selectionChrome}
      </div>
    );
  };

  const footerContent = (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
      <div className="text-xs text-slate-500 font-medium hidden sm:block min-w-0 flex-1">
        {footerSummary}
      </div>
      <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
        {agentHealth.connected && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestPrint}
              isLoading={isTesting}
            >
              Test Print
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCalibrate}
              isLoading={isCalibrating}
            >
              Calibrate
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={!hasAssignedBarcode || hasBlockingDesignError}
          leftIcon={<Printer className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          {canUseNativePrinter ? `Print ${quantity} Label${quantity > 1 ? 's' : ''}` : 'Use Browser Print'}
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
      maxWidth="5xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-1">
        {/* LEFT COLUMN: Configuration Controls */}
        <div className="lg:col-span-5 space-y-4 min-w-0">
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
                      <div className="text-[12px] font-bold text-slate-900 leading-tight font-mono">
                        {profile.widthMm} x {profile.heightMm} mm
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {profile.id === 'custom' ? 'Custom' : `${profile.dpi || 203} DPI`}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400">
                        {profile.mediaType === 'CONTINUOUS' ? 'Continuous' : `Gap ${profile.gapMm ?? 2}mm`}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedProfileId === 'custom' && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="text-[11px] font-semibold text-slate-700">Custom media dimensions</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {([
                    ['Width', 'widthMm', 20, 160],
                    ['Height', 'heightMm', 15, 120],
                    ['Gap', 'gapMm', 0, 20],
                    ['X offset', 'xOffsetMm', -20, 20],
                    ['Y offset', 'yOffsetMm', -20, 20]
                  ] as const).map(([label, key, min, max]) => (
                    <div key={String(key)} className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600">{label}</label>
                        <Input
                          type="number"
                          aria-label={`Custom label ${label}`}
                          min={Number(min)}
                        max={Number(max)}
                        value={Number(customProfile[key as keyof typeof customProfile]) || ''}
                        onChange={(event) => {
                          const nextValue = Number(event.target.value);
                          const nextProfile = {
                            ...customProfile,
                            [key]: nextValue
                          };
                          if (key === 'widthMm' || key === 'heightMm' || key === 'gapMm') {
                            nextProfile.physicalMedia = {
                              acrossPrintheadMm: key === 'widthMm' ? nextValue : (customProfile.physicalMedia?.acrossPrintheadMm ?? customProfile.widthMm),
                              alongFeedMm: key === 'heightMm' ? nextValue : (customProfile.physicalMedia?.alongFeedMm ?? customProfile.heightMm),
                              gapMm: key === 'gapMm' ? nextValue : (customProfile.physicalMedia?.gapMm ?? customProfile.gapMm ?? 2)
                            };
                          }
                          setCustomProfile(nextProfile);
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-800">Label Designer</div>
                <div className="text-[10px] text-slate-500">Physical mm controls, live canvas update</div>
              </div>
              <button
                type="button"
                onClick={resetDesignLayout}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Reset Layout
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {([
                ['auto', 'Auto Layout'],
                ['manual', 'Manual Design']
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLayoutMode(value)}
                  className={`h-8 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    layoutMode === value
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              {[203, 300, 600].map((dpi) => (
                <button
                  key={dpi}
                  type="button"
                  onClick={() => setDesignDpi(dpi)}
                  className={`h-8 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    designDpi === dpi
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {dpi} DPI
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {scaleControls.map(([label, value, setValue]) => (
                <div key={label} className="grid grid-cols-[82px_1fr_44px] items-center gap-2">
                  <label className="text-[11px] font-medium text-slate-600">{label}</label>
                  <input
                    type="range"
                    min={label === 'Barcode' ? 50 : 70}
                    max={label === 'Barcode' ? 145 : 170}
                    step={5}
                    value={Math.round(value * 100)}
                    onChange={(event) => setValue(Number(event.target.value) / 100)}
                    className="h-2 w-full accent-blue-600"
                    aria-label={`${label} size`}
                  />
                  <span className="text-right text-[10px] font-mono font-semibold text-slate-700">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
              <span>Mode <strong className="block text-slate-800">{layoutMode === 'auto' ? 'Auto Reflow' : 'Manual Tuning'}</strong></span>
              <span>DPI <strong className="block font-mono text-slate-800">{designDpi}</strong></span>
              <span>Barcode <strong className="block font-mono text-slate-800">{Math.round(barcodeScale * 100)}%</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">Label Orientation</label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {([
                  ['horizontal', 'Horizontal', <ArrowLeftRight key="horizontal" className="w-3.5 h-3.5" />],
                  ['vertical', 'Vertical', <ArrowUpDown key="vertical" className="w-3.5 h-3.5" />]
                ] as const).map(([value, label, icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLabelOrientation(value)}
                    className={`h-8 rounded-md text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      labelOrientation === value
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800 block">Barcode Orientation</label>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                {([0, 90, 180, 270] as BarcodeRotation[]).map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    onClick={() => setBarcodeRotation(rotation)}
                    className={`h-8 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      barcodeRotation === rotation
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {rotation}°
                  </button>
                ))}
              </div>
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
        <div className="lg:col-span-7 flex min-w-0 flex-col justify-between bg-slate-100/90 border border-slate-200/90 rounded-2xl p-4 shadow-inner min-h-[420px]">
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

            {designWarnings.length > 0 && (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-snug ${
                !hasBlockingDesignError
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{designWarnings[0]}</span>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
              <button type="button" onClick={handleUndo} disabled={undoStack.length === 0} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">Undo</button>
              <button type="button" onClick={handleRedo} disabled={redoStack.length === 0} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">Redo</button>
              <span className="h-5 w-px bg-slate-200" />
              <button type="button" onClick={() => setEditorZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">Zoom -</button>
              <button type="button" onClick={() => setEditorZoom(1)} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">100%</button>
              <button type="button" onClick={() => setEditorZoom(1)} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">Fit</button>
              <button type="button" onClick={() => setEditorZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))} className="h-7 rounded-md px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">Zoom +</button>
              <span className="h-5 w-px bg-slate-200" />
              <button type="button" onClick={() => commitDesign((current) => ({ ...current, gridEnabled: !current.gridEnabled }))} className={`h-7 rounded-md px-2 text-[11px] font-semibold ${activeDesign?.gridEnabled ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Grid</button>
              <button type="button" onClick={() => commitDesign((current) => ({ ...current, snapEnabled: !current.snapEnabled }))} className={`h-7 rounded-md px-2 text-[11px] font-semibold ${activeDesign?.snapEnabled ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Snap</button>
              <button type="button" onClick={() => setLayoutMode('auto')} className={`h-7 rounded-md px-2 text-[11px] font-semibold ${layoutMode === 'auto' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Auto Layout</button>
              <button type="button" onClick={() => setLayoutMode('manual')} className={`h-7 rounded-md px-2 text-[11px] font-semibold ${layoutMode === 'manual' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Manual Design</button>
            </div>

            {/* Scaled physical label canvas */}
            <div
              ref={previewViewportRef}
              data-testid="barcode-preview-viewport"
              className="mt-4 flex h-[340px] min-h-[300px] w-full min-w-0 items-center justify-center rounded-xl border border-slate-200 bg-white/45 p-5 overflow-visible"
            >
              <div
                data-testid="barcode-preview-outer"
                className="relative"
                style={previewOuterStyle}
              >
                <div
                  data-testid="barcode-label-canvas"
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  className="bg-white text-slate-900 rounded-md shadow-sm border border-dashed border-slate-300 select-none transition-colors"
                  style={labelCanvasStyle}
                >
                {hasAssignedBarcode ? (
                  <>
                    {activeDesign?.gridEnabled && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 opacity-60"
                        style={{
                          backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)',
                          backgroundSize: `${mmToPx(5, 96)}px ${mmToPx(5, 96)}px`
                        }}
                      />
                    )}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute border border-blue-400/40"
                      style={{
                        left: mmToPx(effectiveProfile.marginLeftMm || 0, 96),
                        top: mmToPx(effectiveProfile.marginTopMm || 0, 96),
                        width: mmToPx(labelGeometry.contentWidthMm, 96),
                        height: mmToPx(labelGeometry.contentHeightMm, 96)
                      }}
                    />
                    {editorElements.map(renderEditorElement)}
                    {selectedBounds && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute border border-dashed border-blue-500"
                        style={{
                          left: mmToPx(selectedBounds.xMm, 96),
                          top: mmToPx(selectedBounds.yMm, 96),
                          width: mmToPx(selectedBounds.rightMm - selectedBounds.xMm, 96),
                          height: mmToPx(selectedBounds.bottomMm - selectedBounds.yMm, 96)
                        }}
                      />
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

            <div className="mt-3 grid grid-cols-1 xl:grid-cols-[1fr_220px] gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">Alignment</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {selectedElement ? `${selectedElement.xMm.toFixed(1)}, ${selectedElement.yMm.toFixed(1)} mm` : `${selectedElementIds.length} selected`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" aria-label="Align left" onClick={() => applyAlignment('left')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><AlignLeft className="mx-auto h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Align center" onClick={() => applyAlignment('center')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><AlignCenter className="mx-auto h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Align right" onClick={() => applyAlignment('right')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><AlignRight className="mx-auto h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Align middle" onClick={() => applyAlignment('middle')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><AlignVerticalJustifyCenter className="mx-auto h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Align center vertical" onClick={() => applyAlignment('center')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"><AlignHorizontalJustifyCenter className="mx-auto h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => applyDistribution('horizontal')} className="h-7 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Distribute H</button>
                  <button type="button" onClick={() => applyDistribution('vertical')} className="h-7 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Distribute V</button>
                  <button type="button" onClick={() => activeDesign && commitDesign(() => autoFixLabelDesign(activeDesign, effectiveProfile))} className="h-7 rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">Auto Fix</button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">Inspector</span>
                  {selectedElement && (
                    <button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="text-slate-500 hover:text-slate-800" aria-label={selectedElement.locked ? 'Unlock element' : 'Lock element'}>
                      {selectedElement.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
                {selectedElement ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-blue-700">{labelElementName[selectedElement.type]}</div>
                    {selectedElement.type !== 'barcode' ? (
                      <>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Font Size <Input aria-label="Font Size" type="number" value={selectedElement.fontSizeMm || 0} step="0.1" onChange={(event) => updateTextFontSize(selectedElement, Number(event.target.value))} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Weight <Select aria-label="Weight" value={selectedElement.fontWeight || 'normal'} onChange={(event) => updateElement(selectedElement.id, { fontWeight: event.target.value as LabelDesignElement['fontWeight'] })} options={[{ value: 'normal', label: 'Normal' }, { value: 'semibold', label: 'Semibold' }, { value: 'bold', label: 'Bold' }, { value: 'extrabold', label: 'Extrabold' }]} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Alignment <Select aria-label="Alignment" value={selectedElement.alignment || 'center'} onChange={(event) => updateElement(selectedElement.id, { alignment: event.target.value as LabelDesignElement['alignment'] })} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Letter Spacing <Input aria-label="Letter Spacing" type="number" value={selectedElement.letterSpacingMm || 0} step="0.05" onChange={(event) => updateElement(selectedElement.id, { letterSpacingMm: Number(event.target.value) })} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Line Height <Input aria-label="Line Height" type="number" value={selectedElement.lineHeightMm || 0} step="0.1" onChange={(event) => updateElement(selectedElement.id, { lineHeightMm: Number(event.target.value) })} className="h-7 text-xs" /></label>
                      </>
                    ) : (
                      <>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Format <Select aria-label="Format" value={selectedElement.barcodeFormat || barcodeFit.format} onChange={(event) => updateElement(selectedElement.id, { barcodeFormat: event.target.value as LabelDesignElement['barcodeFormat'] })} options={[{ value: 'CODE128', label: 'CODE128' }, { value: 'EAN13', label: 'EAN13' }, { value: 'EAN8', label: 'EAN8' }, { value: 'UPC', label: 'UPC' }]} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Module Width <Input aria-label="Module Width" type="number" value={selectedElement.moduleWidthMm || 0} step="0.01" onChange={(event) => updateElement(selectedElement.id, { moduleWidthMm: Number(event.target.value) })} className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Barcode Text <Input aria-label="Barcode Text" value={assignedBarcode} readOnly className="h-7 text-xs" /></label>
                        <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">Quiet Zone <Input aria-label="Quiet Zone" type="number" value={selectedElement.quietZoneModules || barcodeFit.quietZoneModules} onChange={(event) => updateElement(selectedElement.id, { quietZoneModules: Number(event.target.value) })} className="h-7 text-xs" /></label>
                        <label className="flex items-center justify-between gap-2 text-[10px] text-slate-600">Lock Aspect Ratio <input aria-label="Lock Aspect Ratio" type="checkbox" checked={selectedElement.lockAspectRatio !== false} onChange={(event) => updateElement(selectedElement.id, { lockAspectRatio: event.target.checked })} /></label>
                        <label className="flex items-center justify-between gap-2 text-[10px] text-slate-600">Auto Fit <input aria-label="Auto Fit" type="checkbox" checked={selectedElement.autoFit !== false} onChange={(event) => updateElement(selectedElement.id, { autoFit: event.target.checked })} /></label>
                      </>
                    )}
                    {(['xMm', 'yMm', 'widthMm', 'heightMm', 'rotation'] as const).map((key) => (
                      <label key={key} className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px] text-slate-500">
                        {key === 'xMm' ? 'X' : key === 'yMm' ? 'Y' : key === 'widthMm' ? 'Width' : key === 'heightMm' ? 'Height' : 'Rotation'}
                        <Input aria-label={key === 'xMm' ? 'X' : key === 'yMm' ? 'Y' : key === 'widthMm' ? 'Width' : key === 'heightMm' ? 'Height' : 'Rotation'} type="number" value={Number(selectedElement[key]).toFixed(key === 'rotation' ? 0 : 1)} step={key === 'rotation' ? 1 : 0.1} onChange={(event) => updateElement(selectedElement.id, { [key]: Number(event.target.value) } as Partial<LabelDesignElement>)} className="h-7 text-xs" />
                      </label>
                    ))}
                    <button type="button" onClick={handleResetElement} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3 w-3" /> Reset Element</button>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Select an element on the label.</div>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
              <Input aria-label="Design name" placeholder="Named label design" value={newDesignName} onChange={(event) => setNewDesignName(event.target.value)} className="h-8 min-w-[160px] flex-1 text-xs" />
              <Button type="button" size="sm" variant="outline" onClick={handleSaveDesign} leftIcon={<Save className="h-3.5 w-3.5" />}>Save Design</Button>
              <Select aria-label="Saved design" value={selectedSavedDesignId} onChange={(event) => setSelectedSavedDesignId(event.target.value)} options={[{ value: '', label: 'Saved designs' }, ...savedDesigns.map((item) => ({ value: item.id, label: item.name }))]} className="h-8 min-w-[160px] text-xs" />
              <Button type="button" size="sm" variant="secondary" onClick={handleLoadDesign} disabled={!selectedSavedDesignId}>Load</Button>
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
