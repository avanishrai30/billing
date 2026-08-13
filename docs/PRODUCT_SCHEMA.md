# Product Master Architecture & Schema Specifications (Stage 06)

This document specifies the authoritative Product Master catalog architecture for the VC Organic ERP system.

---

## 1. Architectural Principles

1. **Product Master is NOT Inventory**:
   - Product Master defines **WHAT** a product is (identity, specifications, classification, barcodes, pricing baselines).
   - Real-time stock counts, location balances, and warehouse reserves are managed exclusively by the Inventory Domain (`services/inventoryService.js` and `inventory_ledger` collection).
   - Fields such as `stock` and `store` in the product document are designated as **legacy/non-authoritative** and preserved strictly for UI backward compatibility.
2. **Unified Product Types**:
   - Both `OWN` (manufactured / internal brand, e.g., VC Organic) and `EXTERNAL` (third-party products) utilize the same Product Master schema without splintered collections.

---

## 2. Product Master Document Schema (`products`)

```typescript
interface ProductMaster {
  // === REQUIRED IDENTITY & STATUS ===
  id: string;                      // Unique identifier (e.g., 'prd-1723650000000')
  name: string;                    // Full display title (e.g., 'Organic A2 Gir Cow Ghee')
  sku: string;                     // Unique stock keeping unit (e.g., 'AIA-GHEE-001')
  sellingMode: 'packaged' | 'loose'; // Selling format
  type: 'OWN' | 'EXTERNAL';        // Ownership/sourcing classification
  status: 'active' | 'inactive' | 'archived'; // Lifecycle status

  // === CANONICAL PRICING & TAXATION ===
  purchasePrice?: number;          // Standard buying / procurement unit cost
  sellingPrice?: number;           // Standard customer retail unit price
  gst?: number;                    // GST percentage slab (0, 5, 12, 18, 28)

  // === BARCODES & CLASSIFICATION ===
  barcode?: string;                // Primary scan barcode
  categoryId?: string;             // Reference to category catalog
  category?: string;               // Display category name (e.g., 'Dairy & Ghee')
  brandId?: string;                // Reference to brand catalog
  brand?: string;                  // Display brand name (e.g., 'VC Organic')
  supplierId?: string;             // Default preferred supplier reference
  supplier?: string;               // Display supplier name

  // === PACKAGING & PHYSICAL ATTRIBUTES ===
  unit?: string;                   // Unit label (e.g., 'per kg', '500ml Jar')
  weightUnit?: 'g' | 'kg' | 'ml' | 'L'; // Metric unit for loose/weight-based items
  emoji?: string;                  // UI category/product icon
  description?: string;            // Detailed product summary

  // === SHELF LIFE & QUALITY ===
  dom?: string;                    // Date of Manufacturing (YYYY-MM-DD)
  doe?: string;                    // Date of Expiry (YYYY-MM-DD)

  // === IMAGES & MEDIA ===
  image?: string;                  // Main optimized WebP path (e.g., '/uploads/products/ghee-123.webp')
  images?: string[];               // Gallery array of image paths
  imageId?: string;                // Primary image metadata ID

  // === VARIANTS & MULTI-BARCODE LOOKUPS ===
  barcodes?: BarcodeMapping[];     // Alternate/secondary scan barcodes
  variants?: ProductVariant[];     // Optional variant matrix (sizes, packings)

  // === INVENTORY THRESHOLD BASELINES ===
  reorderLevel?: number;           // Threshold to trigger purchase alerts (default: 10)
  maxStock?: number;               // Maximum capacity target (default: 100)

  // === AUDIT & TIMESTAMPS ===
  isArchived: boolean;             // Soft delete flag (default: false)
  createdAt: string;               // ISO 8601 creation timestamp
  updatedAt: string;               // ISO 8601 last update timestamp

  // === LEGACY NON-AUTHORITATIVE ALIASES ===
  price?: number;                  // Alias for sellingPrice
  cost?: number;                   // Alias for purchasePrice
  costPrice?: number;              // Alias for purchasePrice
  stock?: number;                  // Legacy snapshot; NOT authoritative inventory
  store?: string;                  // Legacy default store name
  reorder?: number;                // Legacy alias for reorderLevel
}
```

---

## 3. Barcode Mapping Schema (`product_barcodes`)

Secondary, alternate, and variant barcodes are indexed in the dedicated `product_barcodes` collection for high-throughput scanner resolution:

```typescript
interface ProductBarcodeMapping {
  _id?: ObjectId;
  productId: string;               // Reference to products.id
  barcode: string;                 // Scannable barcode string (Unique index)
  type: 'PRIMARY' | 'ALTERNATE' | 'VARIANT'; // Barcode classification
  variantId?: string | null;       // Associated variant ID if applicable
  variantName?: string;            // Descriptive label (e.g., '500ml Glass Jar')
  active: boolean;                 // Active status (false when product archived)
  createdAt: string;               // ISO 8601 timestamp
  updatedAt: string;               // ISO 8601 timestamp
}
```

### Barcode Uniqueness & Conflict Rules
1. **Uniqueness Enforcement**: No active product or barcode mapping may share a barcode with another active product.
2. **Conflict Response**: If a duplicate barcode is submitted on creation or edit, the API rejects the request with HTTP `409 Conflict`:
   ```json
   {
     "success": false,
     "code": "PRODUCT_BARCODE_ALREADY_EXISTS",
     "message": "Barcode '8901234567890' is already registered to another active product"
   }
   ```
3. **Atomic Synchronization**: On product save, existing barcode mappings for `productId` are cleaned and re-inserted consistently.

---

## 4. Product Variant Schema

Variants allow grouping different package sizes or weights under a single master product:

```typescript
interface ProductVariant {
  id: string;                      // Unique variant identifier
  name: string;                    // Variant label (e.g., '1kg Pet Jar')
  sku?: string;                    // Optional variant SKU
  barcode?: string;                // Variant-specific scannable barcode
  sellingPrice?: number;           // Variant retail price
  purchasePrice?: number;          // Variant cost price
  unit?: string;                   // Unit label (e.g., '1kg')
  weight?: number;                 // Numeric weight value
  status: 'active' | 'inactive';   // Variant availability status
}
```

---

## 5. REST Endpoints

| Endpoint | Method | Purpose | Auth |
| :--- | :--- | :--- | :--- |
| `/api/v1/products` | `GET` | Fetch products with search, category, brand, type, and pagination filters | `verifyJWT` |
| `/api/v1/products/:id` | `GET` | Fetch single product by ID (fallback to SKU/barcode) | `verifyJWT` |
| `/api/v1/products/by-sku/:sku` | `GET` | Explicit lookup by exact SKU | `verifyJWT` |
| `/api/v1/products/by-barcode/:barcode` | `GET` | Explicit lookup by barcode (checks primary & `product_barcodes`) | `verifyJWT` |
| `/api/v1/products` | `POST` | Create or update product master with barcode sync | `verifyJWT` |
| `/api/v1/products/:id` | `DELETE` | Soft-delete product (`isArchived = true`, deactivates barcodes) | `verifyJWT` |
| `/api/v1/products/import` | `POST` | Bulk import products with barcode sync & audit logging | `verifyJWT` |

---

## 6. Database Indexes

| Collection | Index Key | Options | Purpose |
| :--- | :--- | :--- | :--- |
| `products` | `{ sku: 1 }` | `{ unique: true, sparse: true }` | SKU uniqueness |
| `products` | `{ barcode: 1 }` | `{ sparse: true }` | Fast primary barcode lookups |
| `products` | `{ name: "text", category: "text", brand: "text" }` | — | Text search performance |
| `products` | `{ isArchived: 1, status: 1 }` | — | Active catalog filtering |
| `product_barcodes` | `{ barcode: 1 }` | — | High-speed scanner emulator lookups |
| `product_barcodes` | `{ productId: 1 }` | — | Cascading updates / sync |
