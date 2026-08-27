import {
  calculateBarcodeFit,
  calculateLabelGeometry,
  calculateLabelTypography,
  calculateTextFit,
  formatDisplayDate,
  type BarcodeFormat,
  type LabelProfile,
  type LabelGeometry
} from './labelProfiles';
import {
  getDesignElementText,
  type LabelDesign
} from './labelDesign';
import type { ProductDoc, ProductBatchDoc } from '../../features/products/types';

export type LabelElementType = 'text' | 'barcode' | 'line';

export type LabelTextElement = {
  type: 'text';
  id?: string;
  value: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSizeMm: number;
  lineHeightMm?: number;
  align: 'left' | 'center' | 'right';
  weight?: 'normal' | 'bold' | 'bolder' | number;
  maxLines?: number;
};

export type LabelBarcodeElement = {
  type: 'barcode';
  id?: string;
  value: string;
  format: Exclude<BarcodeFormat, 'AUTO'> | 'CODE128' | 'EAN13' | 'EAN8' | 'UPC';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  showHumanReadableText: boolean;
  quietZoneModules?: number;
  moduleWidthMm?: number;
  rotation?: 0 | 90 | 180 | 270;
};

export type LabelLineElement = {
  type: 'line';
  id?: string;
  x1Mm: number;
  y1Mm: number;
  x2Mm: number;
  y2Mm: number;
  thicknessMm: number;
};

export type LabelElement = LabelTextElement | LabelBarcodeElement | LabelLineElement;

export type LabelDocument = {
  widthMm: number;
  heightMm: number;
  dpi: number;
  orientation: 0 | 90 | 180 | 270;
  elements: LabelElement[];
};

export type BoundingBoxValidation = {
  valid: boolean;
  violations: string[];
};

/**
 * Convert millimeters to printer dots at target DPI with integer precision.
 */
export function mmToDots(mm: number, dpi: number = 203): number {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * Convert printer dots back to millimeters at target DPI.
 */
export function dotsToMm(dots: number, dpi: number = 203): number {
  return (dots / dpi) * 25.4;
}

/**
 * Validates that every element fits within the physical printable boundaries of the label media.
 */
export function validateDocumentBounds(
  doc: LabelDocument,
  geometry: LabelGeometry
): BoundingBoxValidation {
  const violations: string[] = [];
  const printableWidth = geometry.printableWidthMm;
  const printableHeight = geometry.printableHeightMm;

  for (const el of doc.elements) {
    if (el.type === 'text' || el.type === 'barcode') {
      const rightEdge = el.xMm + el.widthMm;
      const bottomEdge = el.yMm + el.heightMm;

      if (el.xMm < 0 || el.yMm < 0) {
        violations.push(
          `Element "${el.type === 'text' ? el.value : el.type}" has negative offset (${el.xMm}mm, ${el.yMm}mm)`
        );
      }
      if (rightEdge > printableWidth + 0.1) {
        violations.push(
          `Element "${el.type === 'text' ? el.value : el.type}" exceeds printable width (${rightEdge.toFixed(1)}mm > ${printableWidth.toFixed(1)}mm)`
        );
      }
      if (bottomEdge > printableHeight + 0.1) {
        violations.push(
          `Element "${el.type === 'text' ? el.value : el.type}" exceeds printable height (${bottomEdge.toFixed(1)}mm > ${printableHeight.toFixed(1)}mm)`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

export type BuildLabelDocumentOptions = {
  product: ProductDoc;
  profile: LabelProfile;
  design?: LabelDesign | null;
  selectedBatch?: ProductBatchDoc | null;
  effectiveExpiry?: string | null;
  showPrice?: boolean;
  showBrand?: boolean;
  showLotExpiry?: boolean;
};

/**
 * Universal canonical label document builder.
 * Constructs device-independent layout elements with exact mm coordinates.
 */
export function buildProductLabelDocument(options: BuildLabelDocumentOptions): LabelDocument {
  const {
    product,
    profile,
    selectedBatch,
    effectiveExpiry,
    showPrice = true,
    showBrand = true,
    showLotExpiry = true,
    design = null
  } = options;

  const geometry = calculateLabelGeometry(profile);
  const typography = calculateLabelTypography(profile);
  const barcodeValue = (product.barcode || '').trim();
  const barcodeFit = calculateBarcodeFit(barcodeValue, profile);

  if (design) {
    const designElements: LabelElement[] = design.elements
      .filter((element) => element.visible !== false)
      .map((element) => {
        if (element.type === 'barcode') {
          return {
            type: 'barcode',
            id: element.id,
            value: barcodeValue,
            format: element.barcodeFormat || barcodeFit.format,
            xMm: element.xMm,
            yMm: element.yMm,
            widthMm: element.widthMm,
            heightMm: element.heightMm,
            showHumanReadableText: false,
            quietZoneModules: element.quietZoneModules ?? barcodeFit.quietZoneModules,
            moduleWidthMm: element.moduleWidthMm ?? dotsToMm(barcodeFit.moduleWidthPx, profile.dpi || 203),
            rotation: (Math.round(element.rotation / 90) * 90 % 360) as 0 | 90 | 180 | 270
          } satisfies LabelBarcodeElement;
        }

        const value = getDesignElementText({
          element,
          product,
          selectedBatch,
          effectiveExpiry
        });

        return {
          type: 'text',
          id: element.id,
          value,
          xMm: element.xMm,
          yMm: element.yMm,
          widthMm: element.widthMm,
          heightMm: element.heightMm,
          fontSizeMm: element.fontSizeMm || typography.metaFontMm,
          lineHeightMm: element.lineHeightMm || (element.fontSizeMm || typography.metaFontMm) * 1.15,
          align: element.alignment || 'center',
          weight: element.fontWeight === 'extrabold' ? 800 : element.fontWeight === 'bold' ? 'bold' : element.fontWeight === 'semibold' ? 600 : 'normal',
          maxLines: element.type === 'product' ? 2 : 1
        } satisfies LabelTextElement;
      });

    return {
      widthMm: geometry.widthMm,
      heightMm: geometry.heightMm,
      dpi: design.dpi || profile.dpi || 203,
      orientation: design.orientation,
      elements: designElements
    };
  }

  const elements: LabelElement[] = [];
  const contentWidth = geometry.contentWidthMm;
  const startX = 0;
  let currentY = 0;

  // 1. Brand Header
  if (showBrand && profile.showBrand !== false) {
    const brandText = (product.brand || "VC ORGANIC'S").trim();
    if (brandText) {
      elements.push({
        type: 'text',
        id: 'brand',
        value: brandText.toUpperCase(),
        xMm: startX,
        yMm: currentY,
        widthMm: contentWidth,
        heightMm: typography.brandFontMm * 1.15,
        fontSizeMm: typography.brandFontMm,
        lineHeightMm: typography.brandFontMm * 1.15,
        align: 'center',
        weight: 'bold',
        maxLines: 1
      });
      currentY += typography.brandFontMm * 1.15 + typography.rowGapMm * 0.4;
    }
  }

  // 2. Product Name (wrapped up to 2 lines)
  const productFontMm = calculateTextFit(
    product.name,
    contentWidth,
    typography.productFontMm,
    1.6
  );
  const productLineHeightMm = productFontMm * 1.25;
  const productLines = product.name.length > 22 ? 2 : 1;
  const productBlockHeight = productLines * productLineHeightMm;

  elements.push({
    type: 'text',
    id: 'product-name',
    value: product.name,
    xMm: startX,
    yMm: currentY,
    widthMm: contentWidth,
    heightMm: productBlockHeight,
    fontSizeMm: productFontMm,
    lineHeightMm: productLineHeightMm,
    align: 'center',
    weight: 'bold',
    maxLines: 2
  });
  currentY += productBlockHeight + typography.rowGapMm * 0.5;

  // 3. Barcode (Centered with preserved quiet zone)
  if (barcodeValue) {
    const barcodeWidthMm = Math.min(barcodeFit.displayWidthMm, contentWidth);
    const barcodeHeightMm = barcodeFit.displayHeightMm;
    const barcodeXMm = Math.max(0, (contentWidth - barcodeWidthMm) / 2);

    elements.push({
      type: 'barcode',
      id: 'barcode',
      value: barcodeValue,
      format: barcodeFit.format,
      xMm: barcodeXMm,
      yMm: currentY,
      widthMm: barcodeWidthMm,
      heightMm: barcodeHeightMm,
      showHumanReadableText: profile.showBarcodeValue,
      quietZoneModules: barcodeFit.quietZoneModules,
      moduleWidthMm: dotsToMm(barcodeFit.moduleWidthPx, profile.dpi || 203),
      rotation: profile.barcodeRotation ?? 0
    });
    currentY += barcodeHeightMm + typography.rowGapMm * 0.5;
  }

  // 4. Selling Price
  if (showPrice && profile.showPrice) {
    const rawPrice = product.sellingPrice || product.price || 0;
    const priceText = `₹${rawPrice.toFixed(2)}${
      product.sellingMode === 'loose' ? ` / ${product.unit || 'kg'}` : ''
    }`;
    const priceFontMm = calculateTextFit(
      priceText,
      contentWidth,
      typography.priceFontMm,
      2.2
    );

    elements.push({
      type: 'text',
      id: 'price',
      value: priceText,
      xMm: startX,
      yMm: currentY,
      widthMm: contentWidth,
      heightMm: priceFontMm * 1.15,
      fontSizeMm: priceFontMm,
      lineHeightMm: priceFontMm * 1.15,
      align: 'center',
      weight: 'bold',
      maxLines: 1
    });
    currentY += priceFontMm * 1.15 + typography.rowGapMm * 0.3;
  }

  // 5. Lot & Expiry Metadata (Cleanly stacked)
  if (showLotExpiry && (selectedBatch?.lotNumber || effectiveExpiry)) {
    const metaFont = typography.metaFontMm;
    const metaLineHeight = typography.metaLineHeightMm;

    if (selectedBatch?.lotNumber) {
      elements.push({
        type: 'text',
        id: 'lot-number',
        value: `Lot: ${selectedBatch.lotNumber}`,
        xMm: startX,
        yMm: currentY,
        widthMm: contentWidth,
        heightMm: metaFont * 1.1,
        fontSizeMm: metaFont,
        lineHeightMm: metaLineHeight,
        align: 'center',
        weight: 'normal',
        maxLines: 1
      });
      currentY += metaLineHeight * 0.9;
    }

    if (effectiveExpiry) {
      elements.push({
        type: 'text',
        id: 'expiry-date',
        value: `EXP: ${formatDisplayDate(effectiveExpiry)}`,
        xMm: startX,
        yMm: currentY,
        widthMm: contentWidth,
        heightMm: metaFont * 1.1,
        fontSizeMm: metaFont,
        lineHeightMm: metaLineHeight,
        align: 'center',
        weight: 'normal',
        maxLines: 1
      });
    }
  }

  return {
    widthMm: geometry.printableWidthMm,
    heightMm: geometry.printableHeightMm,
    dpi: profile.dpi || 203,
    orientation: typeof profile.orientation === 'number' ? profile.orientation : 0,
    elements
  };
}
