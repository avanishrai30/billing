import { encodeCode128, symbolsToModules } from './barcode';

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'AUTO';
export type MediaType = 'DIE_CUT' | 'CONTINUOUS' | 'BLACK_MARK';
export type SensorMode = 'GAP' | 'BLACK_MARK' | 'CONTINUOUS';
export type PrinterLanguage = 'TSPL' | 'TSPL-EZ' | 'ZPL' | 'EPL' | 'BROWSER';
export type PrinterInterface = 'USB' | 'NETWORK' | 'BLUETOOTH' | 'BROWSER';
export type LabelOrientation = 'portrait' | 'landscape' | 0 | 90 | 180 | 270;
export type BarcodeRotation = 0 | 90 | 180 | 270;

export type PhysicalMedia = {
  acrossPrintheadMm: number;
  alongFeedMm: number;
  gapMm: number;
};

export type PrinterCapabilities = {
  nativeBarcode: boolean;
  printerLanguages: PrinterLanguage[];
  supportsGapSensor: boolean;
  supportsBlackMark: boolean;
  supportsContinuous: boolean;
  supportsCalibration: boolean;
  supportsFeed: boolean;
  supportsUsb: boolean;
  supportsNetwork: boolean;
};

export type DetectedPrinter = {
  id?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  interface?: PrinterInterface | string;
  dpi?: number;
  languages?: string[];
};

export type LabelProfile = {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  interface?: PrinterInterface;
  printerLanguage?: PrinterLanguage;
  mediaType?: MediaType;
  sensorMode?: SensorMode;
  widthMm: number;
  heightMm: number;
  gapMm?: number;
  dpi?: number;
  marginTopMm: number;
  marginRightMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  xOffsetMm?: number;
  yOffsetMm?: number;
  orientation: LabelOrientation;
  barcodeRotation?: BarcodeRotation;
  physicalMedia?: PhysicalMedia;
  lockAspectRatio?: boolean;
  autoFit: boolean;
  barcodeFormat: BarcodeFormat;
  showBrand?: boolean;
  showProductName: boolean;
  showSku?: boolean;
  showBarcodeValue: boolean;
  showPrice: boolean;
  showLot: boolean;
  showExpiry: boolean;
  barcodeHeightRatio?: number;
  barcodeWidthRatio?: number;
  fontScale?: number;
  brandScale?: number;
  productScale?: number;
  priceScale?: number;
  metaScale?: number;
  barcodeScale?: number;
  barcodeTextScale?: number;
};

export type LabelGeometry = {
  widthMm: number;
  heightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  barcodeMaxWidthMm: number;
  barcodeMaxHeightMm: number;
  textMaxWidthMm: number;
};

export type BarcodeFitResult = {
  format: Exclude<BarcodeFormat, 'AUTO'>;
  moduleWidthPx: number;
  barHeightPx: number;
  fontSizePx: number;
  quietZoneModules: number;
  naturalWidthPx: number;
  naturalHeightPx: number;
  displayWidthMm: number;
  displayHeightMm: number;
  minModuleWidthMm: number;
  safe: boolean;
  warnings: string[];
};

export type LabelTypography = {
  brandFontMm: number;
  productFontMm: number;
  productLineHeightMm: number;
  skuFontMm: number;
  barcodeValueFontMm: number;
  priceFontMm: number;
  metaFontMm: number;
  metaLineHeightMm: number;
  rowGapMm: number;
};

export const DEFAULT_LABEL_PROFILE_ID = 'label_58x40';
export const LABEL_PROFILE_STORAGE_KEY = 'aiavro_printer_label_profile';

export const DEFAULT_DPI = 203;
export const MIN_MODULE_WIDTH_MM = 0.25;
export const DEFAULT_QUIET_ZONE_MODULES = 10;

/**
 * Built-in canonical TVS Electronics LP-46 Dlite thermal printer profile.
 * Standard configuration: 203 DPI, USB, TSPL-EZ dialect, Die-Cut media with transmissive Gap sensing.
 */
export const TVS_LP46_DLITE_PROFILE: LabelProfile = {
  id: 'tvs_lp46_dlite',
  name: 'TVS LP-46 Dlite (203 DPI)',
  manufacturer: 'TVS Electronics',
  model: 'LP-46 Dlite',
  interface: 'USB',
  printerLanguage: 'TSPL-EZ',
  mediaType: 'DIE_CUT',
  sensorMode: 'GAP',
  widthMm: 58,
  heightMm: 40,
  gapMm: 2,
  marginTopMm: 2,
  marginRightMm: 2.5,
  marginBottomMm: 2,
  marginLeftMm: 2.5,
  xOffsetMm: 0,
  yOffsetMm: 0,
  dpi: 203,
  orientation: 'portrait',
  barcodeRotation: 0,
  physicalMedia: {
    acrossPrintheadMm: 58,
    alongFeedMm: 40,
    gapMm: 2
  },
  lockAspectRatio: false,
  autoFit: true,
  barcodeFormat: 'AUTO',
  showBrand: true,
  showProductName: true,
  showSku: false,
  showBarcodeValue: true,
  showPrice: true,
  showLot: true,
  showExpiry: true,
  barcodeHeightRatio: 0.36,
  barcodeWidthRatio: 0.9,
  fontScale: 1
};

export const PRINTER_MODEL_PROFILES: {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  language: PrinterLanguage;
  dpi: number;
  defaultMediaType: MediaType;
  defaultSensor: SensorMode;
}[] = [
  {
    id: 'tvs_lp46_dlite',
    name: 'TVS LP-46 Dlite (TSPL-EZ)',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    language: 'TSPL-EZ',
    dpi: 203,
    defaultMediaType: 'DIE_CUT',
    defaultSensor: 'GAP'
  },
  {
    id: 'zebra_zpl_generic',
    name: 'Zebra Desktop (ZPL II)',
    manufacturer: 'Zebra',
    model: 'ZD/GK Series',
    language: 'ZPL',
    dpi: 203,
    defaultMediaType: 'DIE_CUT',
    defaultSensor: 'GAP'
  },
  {
    id: 'tsc_tspl_generic',
    name: 'TSC Thermal (TSPL)',
    manufacturer: 'TSC',
    model: 'TE244 / TDP-244',
    language: 'TSPL',
    dpi: 203,
    defaultMediaType: 'DIE_CUT',
    defaultSensor: 'GAP'
  },
  {
    id: 'generic_epl',
    name: 'Generic EPL Printer (EPL)',
    manufacturer: 'Generic',
    model: 'EPL Compatible',
    language: 'EPL',
    dpi: 203,
    defaultMediaType: 'DIE_CUT',
    defaultSensor: 'GAP'
  },
  {
    id: 'generic_browser',
    name: 'Standard System Printer (Browser Print)',
    manufacturer: 'Generic',
    model: 'System Printer',
    language: 'BROWSER',
    dpi: 203,
    defaultMediaType: 'DIE_CUT',
    defaultSensor: 'GAP'
  }
];

function normalizePrinterToken(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolvePrinterModelProfile(printer?: DetectedPrinter | string | null) {
  if (!printer) return null;
  const detected = typeof printer === 'string'
    ? { name: printer }
    : printer;
  const haystack = normalizePrinterToken([
    detected.manufacturer,
    detected.model,
    detected.name,
    detected.id,
    ...(detected.languages || [])
  ].filter(Boolean).join(' '));

  const hasTvs = haystack.includes('tvs') || haystack.includes('tvs electronics');
  const hasLp46 = haystack.includes('lp 46') || haystack.includes('lp46');
  const hasDlite = haystack.includes('dlite') || haystack.includes('d lite');
  if (hasTvs && hasLp46 && hasDlite) {
    return PRINTER_MODEL_PROFILES.find((profile) => profile.id === 'tvs_lp46_dlite') || null;
  }

  return PRINTER_MODEL_PROFILES.find((profile) => {
    const manufacturer = normalizePrinterToken(profile.manufacturer);
    const model = normalizePrinterToken(profile.model);
    return Boolean(manufacturer && haystack.includes(manufacturer)) ||
      Boolean(model && model !== 'system printer' && haystack.includes(model));
  }) || null;
}

export const LABEL_PROFILE_PRESETS: LabelProfile[] = [
  {
    id: 'label_58x30',
    name: '58 x 30 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 58,
    heightMm: 30,
    gapMm: 2,
    marginTopMm: 2,
    marginRightMm: 2.5,
    marginBottomMm: 2,
    marginLeftMm: 2.5,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 58,
      alongFeedMm: 30,
      gapMm: 2
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.34,
    barcodeWidthRatio: 0.9,
    fontScale: 0.92
  },
  {
    id: DEFAULT_LABEL_PROFILE_ID,
    name: '58 x 40 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 58,
    heightMm: 40,
    gapMm: 2,
    marginTopMm: 2.5,
    marginRightMm: 2.5,
    marginBottomMm: 2.5,
    marginLeftMm: 2.5,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 58,
      alongFeedMm: 40,
      gapMm: 2
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.36,
    barcodeWidthRatio: 0.9,
    fontScale: 1
  },
  {
    id: 'label_60x40',
    name: '60 x 40 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 60,
    heightMm: 40,
    gapMm: 2,
    marginTopMm: 2.5,
    marginRightMm: 3,
    marginBottomMm: 2.5,
    marginLeftMm: 3,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 60,
      alongFeedMm: 40,
      gapMm: 2
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.36,
    barcodeWidthRatio: 0.9,
    fontScale: 1
  },
  {
    id: 'label_70x40',
    name: '70 x 40 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 70,
    heightMm: 40,
    gapMm: 2,
    marginTopMm: 2.5,
    marginRightMm: 3.5,
    marginBottomMm: 2.5,
    marginLeftMm: 3.5,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 70,
      alongFeedMm: 40,
      gapMm: 2
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.38,
    barcodeWidthRatio: 0.88,
    fontScale: 1.05
  },
  {
    id: 'label_80x50',
    name: '80 x 50 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 80,
    heightMm: 50,
    gapMm: 3,
    marginTopMm: 3,
    marginRightMm: 4,
    marginBottomMm: 3,
    marginLeftMm: 4,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 80,
      alongFeedMm: 50,
      gapMm: 3
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.38,
    barcodeWidthRatio: 0.88,
    fontScale: 1.12
  },
  {
    id: 'label_100x50',
    name: '100 x 50 mm',
    manufacturer: 'TVS Electronics',
    model: 'LP-46 Dlite',
    interface: 'USB',
    printerLanguage: 'TSPL-EZ',
    mediaType: 'DIE_CUT',
    sensorMode: 'GAP',
    widthMm: 100,
    heightMm: 50,
    gapMm: 3,
    marginTopMm: 3,
    marginRightMm: 4.5,
    marginBottomMm: 3,
    marginLeftMm: 4.5,
    xOffsetMm: 0,
    yOffsetMm: 0,
    dpi: 203,
    orientation: 'portrait',
    barcodeRotation: 0,
    physicalMedia: {
      acrossPrintheadMm: 100,
      alongFeedMm: 50,
      gapMm: 3
    },
    lockAspectRatio: false,
    autoFit: true,
    barcodeFormat: 'AUTO',
    showBrand: true,
    showProductName: true,
    showSku: false,
    showBarcodeValue: true,
    showPrice: true,
    showLot: true,
    showExpiry: true,
    barcodeHeightRatio: 0.4,
    barcodeWidthRatio: 0.86,
    fontScale: 1.18
  }
];

export const CUSTOM_LABEL_PROFILE: LabelProfile = {
  ...LABEL_PROFILE_PRESETS[1],
  id: 'custom',
  name: 'Custom',
  widthMm: 58,
  heightMm: 40,
  gapMm: 2,
  mediaType: 'DIE_CUT',
  sensorMode: 'GAP',
  lockAspectRatio: false
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function mmToPx(mm: number, dpi: number = DEFAULT_DPI): number {
  return (mm / 25.4) * dpi;
}

export function pxToMm(px: number, dpi: number = DEFAULT_DPI): number {
  return (px / dpi) * 25.4;
}

export function normalizeLabelProfile(profile: LabelProfile): LabelProfile {
  const widthMm = clamp(Number(profile.widthMm) || 58, 20, 160);
  const heightMm = clamp(Number(profile.heightMm) || 40, 15, 120);
  const dpi = clamp(Number(profile.dpi) || DEFAULT_DPI, 152, 600);
  const maxHorizontalMargin = Math.max(0.5, widthMm / 2 - 1);
  const maxVerticalMargin = Math.max(0.5, heightMm / 2 - 1);

  return {
    ...profile,
    widthMm,
    heightMm,
    dpi,
    marginTopMm: clamp(Number(profile.marginTopMm) || 0, 0, maxVerticalMargin),
    marginRightMm: clamp(Number(profile.marginRightMm) || 0, 0, maxHorizontalMargin),
    marginBottomMm: clamp(Number(profile.marginBottomMm) || 0, 0, maxVerticalMargin),
    marginLeftMm: clamp(Number(profile.marginLeftMm) || 0, 0, maxHorizontalMargin),
    orientation: profile.orientation || 'portrait',
    barcodeRotation: (profile.barcodeRotation ?? 0) as BarcodeRotation,
    physicalMedia: {
      acrossPrintheadMm: clamp(
        Number(profile.physicalMedia?.acrossPrintheadMm ?? profile.widthMm) || widthMm,
        20,
        160
      ),
      alongFeedMm: clamp(
        Number(profile.physicalMedia?.alongFeedMm ?? profile.heightMm) || heightMm,
        15,
        120
      ),
      gapMm: clamp(Number(profile.physicalMedia?.gapMm ?? profile.gapMm ?? 2) || 0, 0, 20)
    },
    gapMm: clamp(Number(profile.gapMm ?? profile.physicalMedia?.gapMm ?? 2) || 0, 0, 20),
    autoFit: profile.autoFit !== false,
    barcodeFormat: profile.barcodeFormat || 'AUTO',
    fontScale: clamp(Number(profile.fontScale) || 1, 0.75, 1.4),
    brandScale: clamp(Number(profile.brandScale) || 1, 0.65, 1.8),
    productScale: clamp(Number(profile.productScale) || 1, 0.65, 1.9),
    priceScale: clamp(Number(profile.priceScale) || 1, 0.65, 2),
    metaScale: clamp(Number(profile.metaScale) || 1, 0.65, 1.9),
    barcodeScale: clamp(Number(profile.barcodeScale) || 1, 0.5, 1.45),
    barcodeTextScale: clamp(Number(profile.barcodeTextScale) || 1, 0.65, 1.8),
    barcodeHeightRatio: clamp(Number(profile.barcodeHeightRatio) || 0.4, 0.22, 0.58),
    barcodeWidthRatio: clamp(Number(profile.barcodeWidthRatio) || 0.92, 0.65, 0.98)
  };
}

export function getLabelProfileById(id?: string): LabelProfile {
  return LABEL_PROFILE_PRESETS.find((profile) => profile.id === id) || LABEL_PROFILE_PRESETS[1];
}

export function calculateLabelGeometry(inputProfile: LabelProfile): LabelGeometry {
  const profile = normalizeLabelProfile(inputProfile);
  const media = profile.physicalMedia;
  const baseWidthMm = media?.acrossPrintheadMm ?? profile.widthMm;
  const baseHeightMm = media?.alongFeedMm ?? profile.heightMm;
  const rotatesCanvas = profile.orientation === 90 || profile.orientation === 270;
  const widthMm = rotatesCanvas ? baseHeightMm : baseWidthMm;
  const heightMm = rotatesCanvas ? baseWidthMm : baseHeightMm;
  const printableWidthMm = Math.max(1, widthMm - profile.marginLeftMm - profile.marginRightMm);
  const printableHeightMm = Math.max(1, heightMm - profile.marginTopMm - profile.marginBottomMm);
  const contentInsetMm = Math.min(1.2, Math.max(0.4, printableWidthMm * 0.015));
  const contentWidthMm = Math.max(1, printableWidthMm - contentInsetMm * 2);
  const contentHeightMm = Math.max(1, printableHeightMm - contentInsetMm * 2);

  return {
    widthMm,
    heightMm,
    printableWidthMm,
    printableHeightMm,
    contentWidthMm,
    contentHeightMm,
    barcodeMaxWidthMm: Math.max(1, contentWidthMm * (profile.barcodeWidthRatio || 0.92) * (profile.barcodeScale || 1)),
    barcodeMaxHeightMm: Math.max(8, contentHeightMm * (profile.barcodeHeightRatio || 0.4) * (profile.barcodeScale || 1)),
    textMaxWidthMm: contentWidthMm
  };
}

export function resolveBarcodeFormat(value: string, format: BarcodeFormat): Exclude<BarcodeFormat, 'AUTO'> {
  if (format !== 'AUTO') return format;
  const clean = (value || '').trim();
  if (/^\d{13}$/.test(clean)) return 'EAN13';
  if (/^\d{8}$/.test(clean)) return 'EAN8';
  if (/^\d{12}$/.test(clean)) return 'UPC';
  return 'CODE128';
}

export function calculateBarcodeFit(value: string, inputProfile: LabelProfile): BarcodeFitResult {
  const profile = normalizeLabelProfile(inputProfile);
  const geometry = calculateLabelGeometry(profile);
  const dpi = profile.dpi || DEFAULT_DPI;
  const format = resolveBarcodeFormat(value, profile.barcodeFormat);
  const symbols = encodeCode128(value);
  const modules = symbolsToModules(symbols);
  const quietZoneModules = DEFAULT_QUIET_ZONE_MODULES;
  const totalModules = modules.length + quietZoneModules * 2;
  const maxWidthPx = mmToPx(geometry.barcodeMaxWidthMm, dpi);
  const maxHeightPx = mmToPx(geometry.barcodeMaxHeightMm, dpi);
  const minModuleWidthPx = mmToPx(MIN_MODULE_WIDTH_MM, dpi);

  // Maximum module width to keep short barcodes naturally proportioned and centered
  const maxModuleWidthPx = mmToPx(0.65, dpi);

  // Auto-fit module width: bounded by available maxWidthPx and maxModuleWidthPx
  let moduleWidthPx = totalModules > 0 ? maxWidthPx / totalModules : 0;
  if (moduleWidthPx > maxModuleWidthPx) {
    moduleWidthPx = maxModuleWidthPx;
  }

  const naturalWidthPx = totalModules * moduleWidthPx;
  const typography = calculateLabelTypography(profile);
  const fontSizePx = mmToPx(typography.barcodeValueFontMm, dpi);
  const textHeightPx = profile.showBarcodeValue ? fontSizePx + 4 : 0;

  // Proportional aspect ratio: barcode height is calculated from width, bounded by maxHeightPx
  const targetBarHeightPx = Math.max(mmToPx(8, dpi), naturalWidthPx * 0.32);
  let barHeightPx = Math.min(targetBarHeightPx, maxHeightPx - textHeightPx);
  if (barHeightPx < mmToPx(6, dpi)) {
    barHeightPx = Math.max(mmToPx(5, dpi), maxHeightPx - textHeightPx);
  }

  const naturalHeightPx = barHeightPx + textHeightPx;
  const displayWidthMm = pxToMm(naturalWidthPx, dpi);
  const displayHeightMm = pxToMm(naturalHeightPx, dpi);
  const warnings: string[] = [];

  if (format !== 'CODE128') {
    warnings.push(`${format} values are rendered with the current Code 128 engine until native ${format} rendering is added.`);
  }
  if (moduleWidthPx < minModuleWidthPx) {
    warnings.push('Barcode cannot safely fit on this label size. Choose a larger label or hide optional fields.');
  }
  if (!value.trim()) {
    warnings.push('No barcode value is available for this product.');
  }

  return {
    format,
    moduleWidthPx,
    barHeightPx,
    fontSizePx,
    quietZoneModules,
    naturalWidthPx,
    naturalHeightPx,
    displayWidthMm,
    displayHeightMm,
    minModuleWidthMm: MIN_MODULE_WIDTH_MM,
    safe: warnings.length === 0 || (warnings.length === 1 && warnings[0].includes('current Code 128 engine')),
    warnings
  };
}

export function calculateLabelTypography(inputProfile: LabelProfile): LabelTypography {
  const profile = normalizeLabelProfile(inputProfile);
  const geometry = calculateLabelGeometry(profile);
  const scale = profile.fontScale || 1;
  const heightFactor = clamp(geometry.printableHeightMm / 40, 0.72, 1.25);
  const widthFactor = clamp(geometry.printableWidthMm / 58, 0.78, 1.24);
  const base = scale * Math.min(heightFactor, widthFactor);

  return {
    brandFontMm: clamp(2.05 * base * (profile.brandScale || 1), 1.5, 3.4),
    productFontMm: clamp(3.05 * base * (profile.productScale || 1), 1.9, 5.4),
    productLineHeightMm: clamp(3.55 * base * (profile.productScale || 1), 2.4, 6.2),
    skuFontMm: clamp(1.65 * base, 1.3, 2.25),
    barcodeValueFontMm: clamp(2.15 * base * (profile.barcodeTextScale || 1), 1.45, 3.6),
    priceFontMm: clamp(4.1 * base * (profile.priceScale || 1), 2.6, 6),
    metaFontMm: clamp(2.15 * base * (profile.metaScale || 1), 1.45, 3.5),
    metaLineHeightMm: clamp(2.6 * base * (profile.metaScale || 1), 1.9, 4.1),
    rowGapMm: clamp(0.65 * base, 0.32, 1)
  };
}

export function calculateTextFit(text: string, maxWidthMm: number, preferredFontMm: number, minFontMm = 1.45): number {
  const clean = (text || '').trim();
  if (!clean) return preferredFontMm;
  const estimatedTextWidthMm = clean.length * preferredFontMm * 0.48;
  if (estimatedTextWidthMm <= maxWidthMm) return preferredFontMm;
  return clamp((maxWidthMm / Math.max(clean.length * 0.48, 1)), minFontMm, preferredFontMm);
}

export function calculateLabelScale(profile: LabelProfile, maxWidthPx = 300, maxHeightPx = 220): number {
  const geometry = calculateLabelGeometry(profile);
  const widthPx = mmToPx(geometry.widthMm, 96);
  const heightPx = mmToPx(geometry.heightMm, 96);
  return Math.min(maxWidthPx / widthPx, maxHeightPx / heightPx, 1.8);
}

export function formatDisplayDate(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  // Preserve the calendar date encoded by ISO/date strings (YYYY-MM-DD)
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  // Support already-formatted values (DD/MM/YYYY or DD-MM-YYYY)
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(raw)) {
    return raw.replace(/-/g, '/');
  }

  // Safe fallback for other valid date values with UTC timezone
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parsed);
}

export function formatInputDate(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }
  return raw;
}
