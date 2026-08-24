export type ProductSellingMode = 'packaged' | 'loose' | 'weight_based';
export type ProductType = 'OWN' | 'EXTERNAL';
export type ProductStatus = 'active' | 'inactive' | 'archived';
export type BarcodeType = 'PRIMARY' | 'ALTERNATE' | 'VARIANT';
export type BarcodeSource = 'AIAVRO' | 'EXTERNAL' | 'MANUAL';

export interface ProductBarcodeEntry {
  barcode: string;
  type?: BarcodeType;
  source?: BarcodeSource;
  variantId?: string;
  variantName?: string;
  active?: boolean;
}

export interface ProductVariant {
  id?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  sellingPrice?: number;
  purchasePrice?: number;
  unit?: string;
  weight?: number;
  status?: string;
}

export interface ProductDoc {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  barcodeSource?: BarcodeSource | null;
  barcodeType?: BarcodeType | string;
  categoryId?: string;
  category?: string;
  brandId?: string;
  brand?: string;
  supplierId?: string;
  supplier?: string;
  purchasePrice: number;
  sellingPrice: number;
  cost?: number;        // Backend alias
  price?: number;       // Backend alias
  costPrice?: number;   // Backend alias
  gst?: number;         // GST tax rate percentage (0, 5, 12, 18, 28)
  unit?: string;        // 'kg', 'ltr', 'pack', 'pc', 'bottle', 'tin', 'gm'
  weight?: number;
  weightUnit?: string;
  sellingMode?: ProductSellingMode;
  type?: ProductType;
  dom?: string;         // YYYY-MM-DD
  doe?: string;         // YYYY-MM-DD (legacy alias)
  defaultExpiryDate?: string | null; // YYYY-MM-DD (SKU-level default expiry)
  emoji?: string;
  status?: ProductStatus;
  isArchived?: boolean;
  description?: string;
  image?: string;       // Normalized relative path /uploads/products/...
  imageId?: string;
  images?: string[];
  reorderLevel?: number;
  maxStock?: number;
  stock?: number;       // Legacy non-authoritative fallback
  barcodes?: ProductBarcodeEntry[];
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSummaryMetrics {
  totalCatalogProducts: number;
  ownBrandCount: number;
  externalBrandCount: number;
  packagedCount: number;
  looseCount: number;
  categoriesCount: number;
  brandsCount: number;
  avgMarginPercent: number;
}

export interface ProductFilterState {
  search: string;
  category: string;
  brand: string;
  type: string;        // 'all' | 'OWN' | 'EXTERNAL'
  sellingMode: string; // 'all' | 'packaged' | 'loose' | 'weight_based'
  status: string;      // 'active' | 'archived' | 'all'
}

export interface BulkImportPreviewRow {
  rowNumber: number;
  status: 'VALID' | 'WARNING' | 'ERROR';
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  brand?: string;
  purchasePrice: number;
  sellingPrice: number;
  gst?: number;
  unit?: string;
  type?: string;
  sellingMode?: string;
  openingStock?: number;
  errors?: string[];
  warnings?: string[];
}

export interface BulkImportPreviewResult {
  importId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  rows: BulkImportPreviewRow[];
  detectedColumns: string[];
}

export interface BulkImportCommitResult {
  success: boolean;
  imported: number;
  summary: {
    total: number;
    created: number;
    updated: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
  };
}

export interface ProductBatchDoc {
  id: string;
  batchId?: string;
  productId: string;
  lotNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  receivedQuantity?: number;
  remainingQuantity?: number;
  unitCost?: number;
  sellingPrice?: number;
  storeId?: string;
  notes?: string;
  status: 'active' | 'exhausted' | 'expired' | 'archived';
  isOpeningBatch?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export type BarcodeLabelTemplate =
  | 'standard_shelf' // 50mm x 30mm standard retail shelf tag
  | 'sticker_38x25'   // 38mm x 25mm barcode sticker
  | 'compact_tag';    // 25mm x 15mm compact price tag

export interface PrintBarcodeConfig {
  productId: string;
  batchId?: string | null;
  lotNumber?: string;
  expiryDate?: string;
  quantity: number;
  template: BarcodeLabelTemplate;
  showPrice: boolean;
  showLotExpiry: boolean;
  showBrand: boolean;
}
