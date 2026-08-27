import {
  calculateBarcodeFit,
  calculateLabelGeometry,
  calculateLabelTypography,
  calculateTextFit,
  formatDisplayDate,
  pxToMm,
  type BarcodeFormat,
  type BarcodeRotation,
  type LabelProfile
} from './labelProfiles';
import type { ProductDoc, ProductBatchDoc } from '../../features/products/types';

export type LabelDesignElementType =
  | 'brand'
  | 'product'
  | 'barcode'
  | 'barcodeValue'
  | 'price'
  | 'lot'
  | 'expiry';

export type LabelDesignTextAlign = 'left' | 'center' | 'right';

export type LabelDesignElement = {
  id: string;
  type: LabelDesignElementType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSizeMm?: number;
  fontWeight?: 'normal' | 'semibold' | 'bold' | 'extrabold';
  alignment?: LabelDesignTextAlign;
  letterSpacingMm?: number;
  lineHeightMm?: number;
  rotation: number;
  locked?: boolean;
  visible?: boolean;
  lockAspectRatio?: boolean;
  autoFit?: boolean;
  barcodeFormat?: Exclude<BarcodeFormat, 'AUTO'> | 'CODE128' | 'EAN13' | 'EAN8' | 'UPC';
  moduleWidthMm?: number;
  quietZoneModules?: number;
};

export type LabelDesign = {
  id: string;
  name: string;
  profileId: string;
  orientation: 0 | 90;
  dpi: number;
  elements: LabelDesignElement[];
  snapEnabled: boolean;
  gridEnabled: boolean;
  autoReflow: boolean;
};

export type CanvasTransform = {
  scale: number;
  originXPx: number;
  originYPx: number;
  pxPerMm: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Bounds = {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
};

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const LABEL_DESIGN_STORAGE_KEY = 'aiavro_label_design_profiles_v1';
export const SCREEN_PX_PER_MM = 96 / 25.4;
const GRID_STEP_MM = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundMm = (value: number) => Math.round(value * 100) / 100;

export function screenToMm(point: Point, transform: CanvasTransform): Point {
  return {
    x: roundMm((point.x - transform.originXPx) / (transform.pxPerMm * transform.scale)),
    y: roundMm((point.y - transform.originYPx) / (transform.pxPerMm * transform.scale))
  };
}

export function mmToScreen(point: Point, transform: CanvasTransform): Point {
  return {
    x: (point.x * transform.pxPerMm * transform.scale) + transform.originXPx,
    y: (point.y * transform.pxPerMm * transform.scale) + transform.originYPx
  };
}

export function getElementBounds(element: LabelDesignElement): Bounds {
  return {
    xMm: element.xMm,
    yMm: element.yMm,
    widthMm: element.widthMm,
    heightMm: element.heightMm
  };
}

export function hitTestElement(pointMm: Point, elements: LabelDesignElement[]): LabelDesignElement | null {
  for (const element of [...elements].reverse()) {
    if (element.visible === false) continue;
    const bounds = getElementBounds(element);
    if (
      pointMm.x >= bounds.xMm &&
      pointMm.x <= bounds.xMm + bounds.widthMm &&
      pointMm.y >= bounds.yMm &&
      pointMm.y <= bounds.yMm + bounds.heightMm
    ) {
      return element;
    }
  }
  return null;
}

export function snapMm(value: number, enabled: boolean, stepMm = GRID_STEP_MM): number {
  if (!enabled) return roundMm(value);
  return roundMm(Math.round(value / stepMm) * stepMm);
}

export function calculateResize(input: {
  element: LabelDesignElement;
  handle: ResizeHandle;
  deltaMm: Point;
  labelWidthMm: number;
  labelHeightMm: number;
  preserveAspectRatio?: boolean;
  snapEnabled?: boolean;
}): LabelDesignElement {
  const { element, handle, deltaMm, labelWidthMm, labelHeightMm, snapEnabled } = input;
  const minSize = element.type === 'barcode' ? 6 : 3;
  let x = element.xMm;
  let y = element.yMm;
  let width = element.widthMm;
  let height = element.heightMm;

  if (handle.includes('e')) width += deltaMm.x;
  if (handle.includes('s')) height += deltaMm.y;
  if (handle.includes('w')) {
    x += deltaMm.x;
    width -= deltaMm.x;
  }
  if (handle.includes('n')) {
    y += deltaMm.y;
    height -= deltaMm.y;
  }

  const aspect = element.widthMm / Math.max(0.1, element.heightMm);
  if (input.preserveAspectRatio) {
    if (Math.abs(deltaMm.x) >= Math.abs(deltaMm.y)) {
      height = width / aspect;
    } else {
      width = height * aspect;
    }
    if (handle.includes('w')) x = element.xMm + element.widthMm - width;
    if (handle.includes('n')) y = element.yMm + element.heightMm - height;
  }

  width = clamp(width, minSize, labelWidthMm);
  height = clamp(height, minSize, labelHeightMm);
  x = clamp(x, 0, Math.max(0, labelWidthMm - width));
  y = clamp(y, 0, Math.max(0, labelHeightMm - height));

  return {
    ...element,
    xMm: snapMm(x, Boolean(snapEnabled)),
    yMm: snapMm(y, Boolean(snapEnabled)),
    widthMm: snapMm(width, Boolean(snapEnabled)),
    heightMm: snapMm(height, Boolean(snapEnabled))
  };
}

export function calculateRotation(input: {
  center: Point;
  pointer: Point;
  snapDegrees?: number;
}): number {
  const raw = Math.atan2(input.pointer.y - input.center.y, input.pointer.x - input.center.x) * 180 / Math.PI + 90;
  const normalized = ((raw % 360) + 360) % 360;
  if (!input.snapDegrees) return Math.round(normalized);
  return Math.round(normalized / input.snapDegrees) * input.snapDegrees;
}

export function createDefaultLabelDesign(input: {
  profile: LabelProfile;
  product: ProductDoc;
  selectedBatch?: ProductBatchDoc | null;
  effectiveExpiry?: string | null;
  showPrice?: boolean;
  showBrand?: boolean;
  showLotExpiry?: boolean;
}): LabelDesign {
  const { profile, product, selectedBatch, effectiveExpiry, showPrice = true, showBrand = true, showLotExpiry = true } = input;
  const geometry = calculateLabelGeometry(profile);
  const typography = calculateLabelTypography(profile);
  const barcodeValue = (product.barcode || '').trim();
  const barcodeFit = calculateBarcodeFit(barcodeValue, profile);
  const contentWidth = geometry.contentWidthMm;
  const marginLeftMm = profile.marginLeftMm || 0;
  const marginTopMm = profile.marginTopMm || 0;
  const marginBottomMm = profile.marginBottomMm || 0;
  const x = marginLeftMm;
  let y = marginTopMm;
  const elements: LabelDesignElement[] = [];
  const placeY = (heightMm: number) => roundMm(clamp(y, marginTopMm, Math.max(marginTopMm, geometry.heightMm - marginBottomMm - heightMm)));

  if (showBrand && profile.showBrand !== false) {
    const fontSizeMm = typography.brandFontMm;
    elements.push({
      id: 'brand',
      type: 'brand',
      xMm: x,
      yMm: placeY(fontSizeMm * 1.2),
      widthMm: contentWidth,
      heightMm: fontSizeMm * 1.2,
      fontSizeMm,
      fontWeight: 'bold',
      alignment: 'center',
      lineHeightMm: fontSizeMm * 1.15,
      letterSpacingMm: 0,
      rotation: 0,
      visible: true
    });
    y += fontSizeMm * 1.2 + typography.rowGapMm * 0.45;
  }

  const productFontMm = calculateTextFit(product.name, contentWidth, typography.productFontMm, 1.6);
  const productLineHeightMm = productFontMm * 1.25;
  elements.push({
    id: 'product',
    type: 'product',
    xMm: x,
    yMm: placeY(productLineHeightMm * (product.name.length > 22 ? 2 : 1)),
    widthMm: contentWidth,
    heightMm: productLineHeightMm * (product.name.length > 22 ? 2 : 1),
    fontSizeMm: productFontMm,
    fontWeight: 'bold',
    alignment: 'center',
    lineHeightMm: productLineHeightMm,
    letterSpacingMm: 0,
    rotation: 0,
    visible: true
  });
  y += productLineHeightMm * (product.name.length > 22 ? 2 : 1) + typography.rowGapMm * 0.5;

  if (barcodeValue) {
    const rotation = profile.barcodeRotation ?? 0;
    const naturalWidthMm = Math.min(barcodeFit.displayWidthMm, contentWidth);
    const naturalHeightMm = barcodeFit.displayHeightMm;
    const isRotatedBarcode = rotation === 90 || rotation === 270;
    const widthMm = isRotatedBarcode ? Math.min(naturalHeightMm, contentWidth) : naturalWidthMm;
    const heightMm = isRotatedBarcode ? Math.min(naturalWidthMm, geometry.contentHeightMm) : naturalHeightMm;
    elements.push({
      id: 'barcode',
      type: 'barcode',
      xMm: x + Math.max(0, (contentWidth - widthMm) / 2),
      yMm: placeY(heightMm),
      widthMm,
      heightMm,
      rotation,
      visible: true,
      lockAspectRatio: true,
      autoFit: true,
      barcodeFormat: barcodeFit.format,
      moduleWidthMm: pxToMm(barcodeFit.moduleWidthPx, profile.dpi || 203),
      quietZoneModules: barcodeFit.quietZoneModules
    });
    y += heightMm + typography.rowGapMm * 0.25;

    if (profile.showBarcodeValue) {
      const fontSizeMm = typography.skuFontMm;
      elements.push({
        id: 'barcodeValue',
        type: 'barcodeValue',
        xMm: x,
        yMm: placeY(fontSizeMm * 1.15),
        widthMm: contentWidth,
        heightMm: fontSizeMm * 1.15,
        fontSizeMm,
        fontWeight: 'semibold',
        alignment: 'center',
        lineHeightMm: fontSizeMm * 1.15,
        letterSpacingMm: 0.05,
        rotation: 0,
        visible: true
      });
      y += fontSizeMm * 1.15 + typography.rowGapMm * 0.35;
    }
  }

  if (showPrice && profile.showPrice) {
    const rawPrice = product.sellingPrice || product.price || 0;
    const priceText = `₹${rawPrice.toFixed(2)}${product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}`;
    const fontSizeMm = calculateTextFit(priceText, contentWidth, typography.priceFontMm, 2.2);
    elements.push({
      id: 'price',
      type: 'price',
      xMm: x,
      yMm: placeY(fontSizeMm * 1.15),
      widthMm: contentWidth,
      heightMm: fontSizeMm * 1.15,
      fontSizeMm,
      fontWeight: 'extrabold',
      alignment: 'center',
      lineHeightMm: fontSizeMm * 1.15,
      letterSpacingMm: 0,
      rotation: 0,
      visible: true
    });
    y += fontSizeMm * 1.15 + typography.rowGapMm * 0.3;
  }

  if (showLotExpiry && selectedBatch?.lotNumber) {
    const fontSizeMm = typography.metaFontMm;
    elements.push({
      id: 'lot',
      type: 'lot',
      xMm: x,
      yMm: placeY(fontSizeMm * 1.1),
      widthMm: contentWidth,
      heightMm: fontSizeMm * 1.1,
      fontSizeMm,
      fontWeight: 'semibold',
      alignment: 'center',
      lineHeightMm: typography.metaLineHeightMm,
      letterSpacingMm: 0,
      rotation: 0,
      visible: true
    });
    y += typography.metaLineHeightMm * 0.9;
  }

  if (showLotExpiry && effectiveExpiry) {
    const fontSizeMm = typography.metaFontMm;
    elements.push({
      id: 'expiry',
      type: 'expiry',
      xMm: x,
      yMm: placeY(fontSizeMm * 1.1),
      widthMm: contentWidth,
      heightMm: fontSizeMm * 1.1,
      fontSizeMm,
      fontWeight: 'semibold',
      alignment: 'center',
      lineHeightMm: typography.metaLineHeightMm,
      letterSpacingMm: 0,
      rotation: 0,
      visible: true
    });
  }

  return {
    id: `design-${profile.id}`,
    name: `${profile.name} design`,
    profileId: profile.id,
    orientation: typeof profile.orientation === 'number' && profile.orientation === 90 ? 90 : 0,
    dpi: profile.dpi || 203,
    elements,
    snapEnabled: true,
    gridEnabled: true,
    autoReflow: true
  };
}

export function validateLabelDesign(design: LabelDesign, profile: LabelProfile): string[] {
  const geometry = calculateLabelGeometry(profile);
  const warnings: string[] = [];
  for (const element of design.elements) {
    if (element.visible === false) continue;
    if (element.xMm < 0 || element.yMm < 0) warnings.push(`${element.id} is outside the printable origin.`);
    if (element.xMm + element.widthMm > geometry.widthMm + 0.1) warnings.push(`${element.id} exceeds label width.`);
    if (element.yMm + element.heightMm > geometry.heightMm + 0.1) warnings.push(`${element.id} exceeds label height.`);
  }
  return warnings;
}

export function detectCollisions(elements: LabelDesignElement[]): Array<[string, string]> {
  const visible = elements.filter((element) => element.visible !== false);
  const collisions: Array<[string, string]> = [];
  for (let i = 0; i < visible.length; i += 1) {
    for (let j = i + 1; j < visible.length; j += 1) {
      const a = visible[i];
      const b = visible[j];
      const overlaps = a.xMm < b.xMm + b.widthMm &&
        a.xMm + a.widthMm > b.xMm &&
        a.yMm < b.yMm + b.heightMm &&
        a.yMm + a.heightMm > b.yMm;
      if (overlaps) collisions.push([a.id, b.id]);
    }
  }
  return collisions;
}

export function autoFixLabelDesign(design: LabelDesign, profile: LabelProfile): LabelDesign {
  const geometry = calculateLabelGeometry(profile);
  const visible = design.elements.filter((element) => element.visible !== false);
  const hidden = design.elements.filter((element) => element.visible === false);
  const gap = Math.max(0.6, Math.min(1.4, geometry.heightMm / 35));
  const marginLeftMm = profile.marginLeftMm || 0;
  const marginTopMm = profile.marginTopMm || 0;
  const marginBottomMm = profile.marginBottomMm || 0;
  let y = marginTopMm;
  const fixed = visible.map((element) => {
    const width = Math.min(element.widthMm, geometry.contentWidthMm);
    const height = Math.min(element.heightMm, Math.max(3, geometry.heightMm - marginTopMm - marginBottomMm));
    const next = {
      ...element,
      xMm: roundMm(marginLeftMm + Math.max(0, (geometry.contentWidthMm - width) / 2)),
      yMm: roundMm(clamp(y, marginTopMm, Math.max(marginTopMm, geometry.heightMm - marginBottomMm - height))),
      widthMm: roundMm(width),
      heightMm: roundMm(height)
    };
    y += height + gap;
    return next;
  });
  return { ...design, elements: [...fixed, ...hidden] };
}

export function alignElements(
  elements: LabelDesignElement[],
  selectedIds: string[],
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): LabelDesignElement[] {
  const selected = elements.filter((element) => selectedIds.includes(element.id));
  if (selected.length < 2) return elements;
  const left = Math.min(...selected.map((element) => element.xMm));
  const right = Math.max(...selected.map((element) => element.xMm + element.widthMm));
  const top = Math.min(...selected.map((element) => element.yMm));
  const bottom = Math.max(...selected.map((element) => element.yMm + element.heightMm));
  const center = left + (right - left) / 2;
  const middle = top + (bottom - top) / 2;

  return elements.map((element) => {
    if (!selectedIds.includes(element.id) || element.locked) return element;
    if (alignment === 'left') return { ...element, xMm: roundMm(left) };
    if (alignment === 'center') return { ...element, xMm: roundMm(center - element.widthMm / 2) };
    if (alignment === 'right') return { ...element, xMm: roundMm(right - element.widthMm) };
    if (alignment === 'top') return { ...element, yMm: roundMm(top) };
    if (alignment === 'middle') return { ...element, yMm: roundMm(middle - element.heightMm / 2) };
    return { ...element, yMm: roundMm(bottom - element.heightMm) };
  });
}

export function distributeElements(
  elements: LabelDesignElement[],
  selectedIds: string[],
  axis: 'horizontal' | 'vertical'
): LabelDesignElement[] {
  const selected = elements
    .filter((element) => selectedIds.includes(element.id) && !element.locked)
    .sort((a, b) => axis === 'horizontal' ? a.xMm - b.xMm : a.yMm - b.yMm);
  if (selected.length < 3) return elements;

  const first = selected[0];
  const last = selected[selected.length - 1];
  const span = axis === 'horizontal'
    ? (last.xMm + last.widthMm) - first.xMm
    : (last.yMm + last.heightMm) - first.yMm;
  const totalSize = selected.reduce((sum, element) => sum + (axis === 'horizontal' ? element.widthMm : element.heightMm), 0);
  const gap = (span - totalSize) / (selected.length - 1);
  let cursor = axis === 'horizontal' ? first.xMm : first.yMm;
  const positions = new Map<string, number>();

  selected.forEach((element) => {
    positions.set(element.id, roundMm(cursor));
    cursor += (axis === 'horizontal' ? element.widthMm : element.heightMm) + gap;
  });

  return elements.map((element) => {
    const position = positions.get(element.id);
    if (position === undefined) return element;
    return axis === 'horizontal' ? { ...element, xMm: position } : { ...element, yMm: position };
  });
}

export function getDesignElementText(input: {
  element: LabelDesignElement;
  product: ProductDoc;
  selectedBatch?: ProductBatchDoc | null;
  effectiveExpiry?: string | null;
}): string {
  const { element, product, selectedBatch, effectiveExpiry } = input;
  if (element.type === 'brand') return (product.brand || "VC ORGANIC'S").trim().toUpperCase();
  if (element.type === 'product') return product.name;
  if (element.type === 'barcodeValue') return (product.barcode || '').trim();
  if (element.type === 'price') {
    const rawPrice = product.sellingPrice || product.price || 0;
    return `₹${rawPrice.toFixed(2)}${product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''}`;
  }
  if (element.type === 'lot') return selectedBatch?.lotNumber ? `Lot: ${selectedBatch.lotNumber}` : '';
  if (element.type === 'expiry') return effectiveExpiry ? `EXP: ${formatDisplayDate(effectiveExpiry)}` : '';
  return '';
}

export function duplicateElement(
  design: LabelDesign,
  elementId: string,
  labelWidthMm?: number,
  labelHeightMm?: number
): { design: LabelDesign; newElementId: string | null } {
  const source = design.elements.find((el) => el.id === elementId);
  if (!source) return { design, newElementId: null };

  const newId = `${source.type}-copy-${Date.now().toString(36)}`;
  const maxX = (labelWidthMm ?? 100) - source.widthMm;
  const maxY = (labelHeightMm ?? 100) - source.heightMm;

  const clone: LabelDesignElement = {
    ...source,
    id: newId,
    xMm: roundMm(clamp(source.xMm + 2, 0, Math.max(0, maxX))),
    yMm: roundMm(clamp(source.yMm + 2, 0, Math.max(0, maxY))),
    locked: false,
    visible: true
  };

  return {
    design: {
      ...design,
      elements: [...design.elements, clone]
    },
    newElementId: newId
  };
}

export function deleteElement(
  design: LabelDesign,
  elementId: string
): LabelDesign {
  return {
    ...design,
    elements: design.elements.filter((el) => el.id !== elementId)
  };
}

export function getPrinterSupportedDpis(profile?: LabelProfile | null): number[] {
  if (!profile) return [203, 300, 600];
  if (Array.isArray((profile as any).supportedDpis) && (profile as any).supportedDpis.length > 0) {
    return (profile as any).supportedDpis;
  }
  if (profile.id === 'tvs_lp46_dlite' || profile.name?.toLowerCase().includes('tvs')) {
    return [203];
  }
  return [203, 300, 600];
}

export function isDpiSupported(dpi: number, profile?: LabelProfile | null): boolean {
  const supported = getPrinterSupportedDpis(profile);
  return supported.includes(dpi);
}

