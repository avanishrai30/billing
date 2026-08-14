# Product Master & Barcode Center Implementation Guide

**Stage:** Stage 13 — Phase E  
**Status:** COMPLETE  
**Reference Architecture:** `docs/FRONTEND_ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/PRODUCT_SCHEMA.md`, `docs/BULK_IMPORT_ARCHITECTURE.md`

---

## 1. Overview & Architectural Boundaries

Phase E delivers a comprehensive redesign of the enterprise Product Master and Barcode Center within `aiavro_billing_system.html`.

### Catalog Identity vs. Inventory Boundary
* **Product Master Ownership:**
  - Catalog Identity: Name, SKU (internal identifier), Barcode (retail scan code), Alternate Barcodes/Variants.
  - Classification: Category, Brand, Supplier.
  - Commercial Pricing: Purchase Price (`cost`/`purchasePrice`), Selling Price (`price`/`sellingPrice`), GST rate metadata.
  - Packaging & Measurement: Unit (`per kg`, `per Liter`, `1 Unit`), Selling Mode (`packaged` vs `loose`), Weight Unit (`g`, `ml`, `kg`, `L`).
  - Shelf-Life: Date of Manufacturing (`dom`), Date of Expiry (`doe`).
  - Media & Status: Image asset path, Catalog lifecycle status (`active`, `inactive`, `pending_review`).
* **Inventory Authority:**
  - Product Master does **not** manage stock ledger adjustments directly; it provides navigation to the authoritative inventory module while displaying current stock status for operational awareness.

---

## 2. Key Components & Layouts

### 2.1 Product Catalog Directory Table
* **Structure:**
  - Image Thumbnail (48px rounded preview with SVG fallback).
  - SKU Badge (`.badge-mono` with monospace green accent).
  - Primary Barcode (`.badge-mono` or `—` when null/empty).
  - Product Name & Measurement metadata.
  - Category & Brand from authoritative catalog data.
  - Purchase Price & Selling Price with `AppUI.formatCurrency` and tabular numerals.
  - Selling Mode indicator (`⚖️ Loose` vs `Packaged`).
  - Catalog Status badge (`Active`, `Inactive`, `Onboarding`).
  - Quick Actions (`👁️ Details`, `Edit`, `🗑️ Archive` with RBAC guardrails).

### 2.2 Product Details Modal (`#product-details-modal`)
* Comprehensive 360° overview dialog:
  - Header with large product image, name, lifecycle status badge, selling mode badge, and product type badge (`OWN` vs `EXTERNAL`).
  - Primary Identifiers (SKU, Primary Retail Barcode, Alternate Barcodes list).
  - Classification (Category, Brand, Supplier, Measurement Unit, Weight Unit, GST rate).
  - Commercial Hierarchy (Purchase Cost, Selling Price, Gross Profit Margin % with color coding).
  - Freshness & Shelf-Life Tracker (DOM, DOE, and real-time days-to-expiry metric).
  - Action footer: Quick Barcode Print trigger (`openBarcodeSheetGeneratorModal(productId)`), Edit Product trigger (`openProductModal(productId)`), and authoritative Inventory link (`navigateToProductInventory()`).

### 2.3 Product Create / Edit Dialog (`#product-modal`)
* Streamlined 8-section layout:
  1. **Core Identity:** Product Name, Emoji Icon, Product Type (`Own Production` vs `External Procurement`), Auto-generated internal SKU (`AIAxxxxxx`) with override lock on edit.
  2. **Primary Retail Barcode:** Dedicated optional barcode input with duplicate detection feedback.
  3. **Catalog Classification:** Category selector, Brand datalist, Supplier datalist dynamically populated from real system catalog.
  4. **Commercial Pricing:** Purchase Cost (₹), Selling Price (₹), Tax Rate (GST %).
  5. **Packaging & Selling Mode:** Mode toggle (`Packaged Product` vs `Loose / By Weight`), Weight Unit selector (`g`, `ml`, `kg`, `L`), Package size description.
  6. **Shelf Life & Freshness:** Manufacturing Date (`dom`), Expiry Date (`doe` — required for packaged, optional for loose).
  7. **Product Media:** Image file selector with 5MB validation, automatic 800x800 canvas resizing, WEBP 70% compression, and immediate preview/removal.
  8. **Alternate Barcodes & Variants:** Dynamic variant rows for multi-pack and alternative barcode mapping.

### 2.4 Multi-Layout Barcode Label Generator (`#barcode-sheet-modal`)
* Formats supported:
  - Single Label 50×25mm (Standard retail adhesive).
  - Single Label 38×25mm (Compact jewelry/bottle sticker).
  - A4 24-Up Sheet (3×8 grid on standard A4 paper).
  - A4 40-Up Sheet (4×10 grid for high-density printing).
* Interactive product selector with quantity overrides and live SVG vector rendering.

---

## 3. Barcode Safety & Data Integrity Rules

1. **Barcode vs. SKU Separation:**
   - Internal `SKU` (e.g. `AIA-GHEE-001`) is never automatically copied into `barcode`.
   - Retail `barcode` remains null/undefined if absent.
2. **No Empty String Barcode Persistence:**
   - Empty input fields evaluate to `undefined` on save, preventing empty string `""` collisions.
3. **Duplicate Barcode Prevention:**
   - Server returns `409 Conflict` (`PRODUCT_BARCODE_ALREADY_EXISTS`) if a barcode is already assigned to another active product or alternate barcode mapping.
4. **Soft Deletion / Archive Safety:**
   - Product deletion performs a soft archive (`status: 'inactive'`, `isArchived: true`), releasing barcode mappings safely.

---

## 4. Realtime Socket Sync

* Listens to `product.created` and `product.updated` socket events.
* In-place update of `state.products` array without resetting user's active search query, category filter, or pagination offset.
* Auto-triggers KPI refresh when executive dashboard view is active.

---

## 5. Verification & Test Coverage

* Test Suite: `tests/productMasterRedesign.test.js` (12 automated tests covering layout, DOM elements, CRUD operations, barcode safety, duplicate checks, soft archive, and search/filter queries).
* Full Test Suite: 16/16 test suites passing (140/140 automated tests).
* Inline Script Syntax: Validated via Node.js syntax parsing.
