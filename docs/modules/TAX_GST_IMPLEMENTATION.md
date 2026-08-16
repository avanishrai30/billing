# Phase 15B — Tax, GST & Financial Reporting Implementation Specification

## 1. Executive Summary & Domain Scope

Phase 15B delivers the typed **Tax, GST & Financial Reporting Ledger** module in `apps/web/features/tax/` and [`apps/web/app/(protected)/tax/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/tax/page.tsx).

### Key Architectural Pillars:
1. **Zero Tax Engine Duplication / Absolute Persisted Financial Authority:**
   - The frontend acts purely as a reporting, reconciliation, and presentation ledger.
   - Authoritative financial values (`subtotal`, `tax`, `discount`, `grandTotal`, line item `tax`, line item `gst`) are persisted by the backend in `invoices`, `purchases`, and `franchise_supply_orders` and are **never** mutated or overridden by the frontend.
2. **Standard Indian GST Semantics:**
   - **Intra-State Supply (Default POS):** Central GST (50%) and State GST (50%):
     $$\text{CGST} = \text{round}\left(\frac{\text{tax}}{2}, 2\right), \quad \text{SGST} = \text{round}\left(\frac{\text{tax}}{2}, 2\right)$$
   - **Inter-State IGST:** *NOT VERIFIED IN CURRENT BACKEND* (treated as standard retail intra-state).
3. **Statutory GST Slabs:**
   - Supported verified rates: `0% (Exempt)`, `5% (Essential Foods)`, `12% (Dairy & Oils Standard)`, `18% (Enterprise Standard)`. Unknown/future backend rates render safely.
4. **B2B vs B2C Segmentation:**
   - **B2B Registered:** Invoices linked to customers possessing a verified non-empty `gstin` string ($\ge 10$ characters).
   - **B2C Consumer Bills:** Invoices without a valid customer GSTIN.
5. **Input Tax Credit (ITC) & Net Liability:**
   - Inward GST from supplier purchases represents Input Tax Credit (ITC).
   - Net Tax Liability is derived as: $\text{Outward GST} - \text{Inward ITC}$.

---

## 2. Source APIs & Transactional Data Flow

| Section | Data Source | Method | Verified Endpoint | Authoritative Fields |
| :--- | :--- | :---: | :--- | :--- |
| **Outward Sales GST** | Invoices API | `GET` | `/api/v1/invoices` | `subtotal`, `tax`, `discount`, `grandTotal`, `items[].gst`, `items[].tax` |
| **Inward Purchase GST** | Purchases API | `GET` | `/api/v1/purchases` | `subtotal`, `taxAmount`, `shipping`, `grandTotal` |
| **Franchise Supplies** | Franchise API | `GET` | `/api/v1/franchise-supply-orders` | `subtotal`, `tax`, `grandTotal` |
| **B2B Identification** | Customers API | `GET` | `/api/v1/customers` | `gstin`, `companyName`, `tradeName` |
| **Store Scope & Names** | Stores API | `GET` | `/api/v1/stores` | `id`, `name`, `code`, `gstin` |

---

## 3. UI Component Architecture (`features/tax/components/`)

```
apps/web/features/tax/
├── types.ts                   # TaxFilterValues, TaxSummaryMetrics, GSTSlabMetrics, B2B/B2C entries
├── schemas.ts                 # Zod validation schema for filters
├── calculations.ts            # Pure helper functions: groupByTaxRate, calculateTaxSummaryMetrics, classifyB2BOrB2C
├── api.ts                     # Multi-source data loader (taxApi.getTaxSourceData)
├── hooks.ts                   # useTaxSourceDataQuery
├── components/
│   ├── TaxHeader.tsx          # Title, 100% reconciliation badge, refresh trigger
│   ├── TaxSummaryCards.tsx    # KPIs: Gross Sales, Outward GST, Inward ITC, Net Tax Liability
│   ├── GSTBreakdown.tsx       # B2B vs B2C sales + CGST (50%) & SGST (50%) split matrix
│   ├── GSTSlabBreakdown.tsx   # Stacked distribution bar & 0%, 5%, 12%, 18% slab cards
│   ├── OutwardGSTTable.tsx    # Paginated outward invoice sales tax ledger
│   ├── InwardGSTTable.tsx     # Inward purchase bills & ITC ledger
│   ├── B2BSalesTable.tsx      # Verified B2B registered client sales
│   ├── B2CSalesTable.tsx      # Walk-in consumer retail bills
│   ├── TaxFilters.tsx         # Date range, store scope, and segmented tab switcher
│   └── index.ts
└── page.tsx
```

---

## 4. Multi-Tenant Store Scoping & Role Access

- **Restricted Users (Cashiers/Store Managers):** Store selector is disabled and query is automatically scoped to `req.user.assignedStoreId`.
- **Super Admins & Auditors:** Can inspect global enterprise reports (`storeId: 'all'`) or filter by individual store.
- **Permissions:** `invoices.view`, `purchases.view`, `franchise.view`, `dashboard.view`.
