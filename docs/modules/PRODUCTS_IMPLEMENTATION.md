# Product Master Architecture & React Implementation Specification

## 1. Feature Architecture Overview

The Product Master Catalog feature is implemented in `apps/web/features/products/` and routed at `apps/web/app/(protected)/products/page.tsx`.

```
apps/web/features/products/
├── types.ts                    # TypeScript types, filters, and import summary models
├── schemas.ts                  # Zod validation schemas for forms, variants, and barcodes
├── calculations.ts            # Profit margin, tax calculation, and summary aggregators
├── api.ts                      # Authoritative API client for /api/v1/products, /import, and /upload
├── hooks.ts                    # TanStack Query & Mutation hooks with Realtime cache invalidations
├── components/
│   ├── ProductHeader.tsx       # Semantic header with Add SKU & Bulk Import triggers
│   ├── ProductSummaryCards.tsx # 4-card enterprise KPI overview (SKUs, types, formats, margins)
│   ├── ProductFilters.tsx      # Multi-dimensional filter bar (Search, Category, Brand, Type, Status)
│   ├── ProductTable.tsx        # High-density, accessible tabular data grid with action triggers
│   ├── ProductModal.tsx        # React Hook Form + Zod create/edit modal
│   ├── ProductDetailDrawer.tsx # Specifications drawer with pricing breakdown and barcode inspector
│   ├── ProductArchiveDialog.tsx# Confirmation dialog for soft-deleting/archiving SKUs
│   ├── ProductImportDialog.tsx # Intelligent bulk import wizard with pre-validation and commit
│   ├── ProductBarcodeManager.tsx # Multi-barcode mapper (Primary, Alternate, Variant packs)
│   ├── ProductImageUploader.tsx # Base64 media uploader with Sharp WebP normalization
│   └── index.ts                # Component barrel export
└── index.ts                    # Feature barrel export
```

---

## 2. Multi-Store Scoping vs Tenant-Wide Catalog Semantics

- **Product Master Catalog**: Global/tenant-wide catalog definition repository across all outlets (`/products`). All stores share the same SKU codes, barcodes, descriptions, and default prices.
- **Inventory Ledger**: Store-scoped stock balance repository (`/inventory`). Quantities and reorder warnings are strictly partitioned by `locationId`.

---

## 3. Realtime Synchronization & Query Lifecycle

The Product Master listens for two Socket.IO events on the global channel:
- `product_updated` -> Triggers targeted invalidation of `['products']`, `['inventory']`, and `['dashboard']`.
- `product_deleted` -> Triggers targeted invalidation of `['products']`, `['inventory']`, and `['dashboard']`.

---

## 4. RBAC Permission Guards

- `products.view`: Guard for viewing `/products` route and inspecting specifications.
- `products.create`: Enables Add Product button and POST operations.
- `products.update`: Enables Edit Product actions.
- `products.archive` / `products.delete`: Enables Soft-Delete / Archive dialog.
- `products.import` / `products.import.preview` / `products.import.commit`: Enables Bulk Import dialog and pipeline.
