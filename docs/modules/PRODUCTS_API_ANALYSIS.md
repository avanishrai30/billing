# Product Master Catalog: Backend API & Contract Forensic Analysis

## Executive Summary

This document details the complete forensic analysis of the backend Product Master domain in the AIAVRO Billing & ERP system (`modules/products.js`, `services/bulkImportService.js`, `modules/upload.js`, `modules/context.js`). The Product Master represents the centralized, tenant-wide product definition repository across all retail stores and franchise nodes.

---

## 1. Authoritative Backend Endpoints Matrix

| HTTP Method | Route Endpoint | Permission Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products` | `products.view` | Fetch product catalog with query filters: `search`, `category`, `brand`, `sellingMode`, `type`, `status`, `limit`, `page`. |
| `GET` | `/api/v1/products/:id` | `products.view` | Fetch single product record by primary ID or SKU. |
| `GET` | `/api/v1/products/by-sku/:sku` | `products.view` | Exact SKU lookup. |
| `GET` | `/api/v1/products/by-barcode/:barcode` | `products.view` | Multi-tier barcode resolver (primary barcode, SKU, or alternate/variant mappings). |
| `POST` | `/api/v1/products` | `products.create` / `products.update` | Create new product or update existing (switches permission based on presence of `id`). Validates uniqueness of SKU and barcodes. Emits `product_updated` via Socket.IO. |
| `DELETE` | `/api/v1/products/:id` | `products.archive` | Soft deletes/archives product (`isArchived: true, status: 'archived'`), deactivates barcode bindings, and emits `product_deleted` via Socket.IO. |
| `POST` | `/api/v1/products/import/preview` | `products.import.preview` | Generates pre-validation summary, auto-maps columns, and identifies duplicates for bulk CSV/Excel import. |
| `POST` | `/api/v1/products/import/commit` | `products.import.commit` | Executes transactional batch commit with atomic product creation and opening stock balance allocation. |
| `GET` | `/api/v1/products/import/:importId` | `products.import.preview` | Retrieves import session progress and summary status. |
| `GET` | `/api/v1/products/import/:importId/errors` | `products.import.preview` | Retrieves detailed row-level error log for an import session. |
| `POST` | `/api/v1/upload?type=products` | `verifyJWT` | Base64 media upload with server-side Sharp WebP optimization and dimensional bounds. |

---

## 2. Verified Authoritative Product Data Model

```typescript
export interface ProductBarcodeEntry {
  barcode: string;
  type?: 'PRIMARY' | 'ALTERNATE' | 'VARIANT';
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
  cost?: number;        // Canonical alias
  price?: number;       // Canonical alias
  costPrice?: number;   // Canonical alias
  gst?: number;         // GST tax rate percentage (0, 5, 12, 18, 28)
  unit?: string;        // 'kg', 'ltr', 'pack', 'pc', 'bottle', 'tin', 'gm'
  weight?: number;
  weightUnit?: string;
  sellingMode?: 'packaged' | 'loose' | 'weight_based';
  type?: 'OWN' | 'EXTERNAL';
  dom?: string;         // YYYY-MM-DD
  doe?: string;         // YYYY-MM-DD
  emoji?: string;
  status?: 'active' | 'inactive' | 'archived';
  isArchived?: boolean;
  description?: string;
  image?: string;       // Normalized path e.g. /uploads/products/image.webp
  imageId?: string;
  images?: string[];
  reorderLevel?: number;
  maxStock?: number;
  stock?: number;       // Non-authoritative fallback
  barcodes?: ProductBarcodeEntry[];
  variants?: ProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 3. Business Logic & Constraints

1. **SKU Uniqueness**: Every product must possess a unique SKU across non-archived products. Attempting to register an existing SKU returns HTTP 409 `PRODUCT_SKU_ALREADY_EXISTS`.
2. **Barcode Resolution**: Barcodes can be assigned as `PRIMARY`, `ALTERNATE`, or `VARIANT`. When scanned at POS or Inventory terminals, `/api/v1/products/by-barcode/:barcode` scans the primary product barcode, the SKU, and the secondary `product_barcodes` table.
3. **Price Normalization**: The backend standardizes `sellingPrice` and `purchasePrice` while providing backwards-compatible aliases (`price`, `cost`, `costPrice`).
4. **Soft Delete / Archival**: Products are never deleted destructively from MongoDB; they are archived (`isArchived: true`), freeing up their barcodes for potential reassignment.
5. **Multi-Store Scoping**: The Product Master catalog is **tenant-wide** (shared definition across all stores), while inventory stock quantities are **store-scoped** (`InventoryBalance` by `locationId`).
