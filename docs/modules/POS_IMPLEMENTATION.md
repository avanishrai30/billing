# Phase 6 — POS Terminal Implementation & Migration Specification

## 1. Executive Summary
The POS Terminal module provides a high-throughput retail checkout experience migrated to the modern typed frontend architecture. It integrates server-authoritative product catalogs, real-time inventory synchronization, sub-millisecond local cart calculations, and zero-flicker declarative rendering.

---

## 2. API Contract Mapping (Frozen Backend)

All endpoints utilize existing frozen backend contracts without backend modification:

| Action | Method | Path | Auth / Permission | Store Scoped |
| :--- | :--- | :--- | :--- | :--- |
| **Product Catalog** | `GET` | `/api/v1/products` | `verifyJWT`, `products.view` | Global / Filtered |
| **Barcode Lookup** | `GET` | `/api/v1/products/by-barcode/:barcode` | `verifyJWT`, `products.view` | Global |
| **SKU Lookup** | `GET` | `/api/v1/products/by-sku/:sku` | `verifyJWT`, `products.view` | Global |
| **Customer Lookup** | `GET` | `/api/v1/customers` | `verifyJWT`, `customers.view` | Global |
| **Customer Quick-Add** | `POST` | `/api/v1/customers` | `verifyJWT`, `customers.create` | Global |
| **Invoice Checkout** | `POST` | `/api/v1/invoices` | `verifyJWT`, `invoices.create` | Enforced (`locationId`) |
| **Store Locations** | `GET` | `/api/v1/stores` | `verifyJWT`, `stores.view` | Global |

---

## 3. Financial & Accounting Formulas (Pure Functions)

All financial computations are isolated in [`apps/web/features/pos/calculations.ts`](file:///Users/avanish/Documents/billing%20system/apps/web/features/pos/calculations.ts):

1. **Line Item Gross:**
   $$\text{Gross} = \text{Price} \times \text{Quantity}$$
2. **Item Discount:**
   $$\text{Discount}_{\text{item}} = \text{DiscountAmount} > 0 \;?\;\min(\text{Gross}, \text{DiscountAmount}) : \left(\text{Gross} \times \frac{\text{DiscountPercent}}{100}\right)$$
3. **Line Taxable Base & GST:**
   $$\text{TaxableBase} = \max(0, \text{Gross} - \text{Discount}_{\text{item}})$$
   $$\text{LineGST} = \text{TaxableBase} \times \frac{\text{GSTRate}}{100}$$
   $$\text{LineTotal} = \text{TaxableBase} + \text{LineGST}$$
4. **Grand Total:**
   $$\text{GrandTotal} = \max\left(0, \; (\sum \text{TaxableBase} - \text{CartDiscount}) + \sum \text{LineGST}\right)$$

---

## 4. Anti-Flicker & Performance Guarantees

1. **Deterministic Component Geometry:** Product cards use fixed image container heights with object-fit containment.
2. **Zero Layout Shifts:** No hover scale, no hover translations, no progressive DOM mutations.
3. **Stable Keyed List Rendering:** Cards use persistent `product.id` keys rather than array indexes.
4. **Feature-Local Cart State:** State is isolated to the POS route preventing unnecessary AppShell or Dashboard re-renders.
5. **Real-time Query Invalidation:** Subscribes to `product_updated` and `inventory_updated` with targeted invalidation rather than global socket reconnections.

---

## 5. Responsive Behavior

- **Desktop ($\ge$ 1024px):** Split layout with fixed-ratio product catalog (left) and sticky cart sidebar (right).
- **Tablet / Mobile (< 1024px):** Catalog grid with floating cart bar and accessible slide-out `Drawer` modal for checkout.
- **Zero Horizontal Overflow:** Verified across standard breakpoints (`1440x900`, `1280x800`, `1024x768`, `768x1024`, `430x932`, `390x844`).
