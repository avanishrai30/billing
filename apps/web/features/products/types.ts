export type ProductSellingMode = 'packaged' | 'loose' | 'weight_based';
export type ProductType = 'OWN' | 'EXTERNAL';
export type ProductStatus = 'active' | 'inactive' | 'archived';
export type BarcodeType = 'PRIMARY' | 'ALTERNATE' | 'VARIANT';

export interface ProductBarcodeEntry {
  barcode: string;
  type?: BarcodeType;
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
  doe?: string;         // YYYY-MM-DD
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
