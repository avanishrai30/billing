# Phase 15A — Tax, GST & Financial Reporting Contract Analysis

## 1. Executive Summary & Domain Scope

This document provides the authoritative forensic analysis of the **Tax, GST (Goods & Services Tax), and Financial Reporting** domain across the AIAVRO Billing OS.

### Critical Forensic Findings:
1. **No Standalone Tax Module/Table:** The backend does **not** maintain a separate dedicated `/api/v1/tax` or `/api/v1/gst` endpoint router. Instead, tax amounts, GST slabs, and financial turnovers are calculated and persisted directly within transactional domains:
   - **Sales / Outward Supply:** [`modules/billing.js`](file:///Users/avanish/Documents/billing%20system/modules/billing.js) (`invoices` collection).
   - **Procurement / Inward Supply:** [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js) (`purchases` collection).
   - **Franchise B2B Supply:** [`modules/franchise.js`](file:///Users/avanish/Documents/billing%20system/modules/franchise.js) (`franchise_supply_orders` collection).
   - **Financial Analytics & Aggregates:** [`modules/dashboard.js`](file:///Users/avanish/Documents/billing%20system/modules/dashboard.js) (`GET /api/v1/dashboard/metrics`).
2. **Indian GST Compliance Model:**
   - **Intra-State Standard Split:** Transactions are processed under standard intra-state rules where total GST is divided 50/50 into **Central GST (CGST)** and **State GST (SGST)**.
   - **Inter-State IGST:** *NOT VERIFIED IN CURRENT BACKEND* (current backend does not differentiate state codes for automated IGST splitting).
   - **B2B vs B2C Segmentation:** Invoices linked to customers possessing a valid `gstin` string are classified as **B2B Registered Invoices**; all other invoices are classified as **B2C Consumer Bills**.
3. **Accounting Authority:**
   - All persisted financial values (`subtotal`, `tax`, `discount`, `grandTotal`, line item `tax` and `gst`) in `invoices` and `purchases` are **backend authoritative**.
   - The frontend acts purely as a reporting, presentation, and reconciliation ledger and must **never** recalculate or override stored historical invoices.

---

## 2. Verified Backend Transactional Endpoints & Data Sources

| Domain / Concept | HTTP Method | Endpoint | Permission | Query Parameters | Authoritative Tax Fields |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Sales Tax Ledger** | `GET` | `/api/v1/invoices` | `invoices.view` | `limit`, `skip`, `search`, `status`, `storeId`, `startDate`, `endDate` | `subtotal`, `tax`, `discount`, `grandTotal`, `items[].gst`, `items[].tax` |
| **Inward Purchase Tax** | `GET` | `/api/v1/purchases` | `purchases.view` | `limit`, `skip`, `storeId`, `status`, `startDate`, `endDate` | `subtotal`, `taxAmount`, `shipping`, `grandTotal`, `items[].cost` |
| **Franchise Supply Tax** | `GET` | `/api/v1/franchise-supply-orders` | `franchise.view` | *None (full array)* | `subtotal`, `tax`, `grandTotal`, `paymentStatus` |
| **Tax Turnover & KPIs** | `GET` | `/api/v1/dashboard/metrics` | `dashboard.view` | `storeId` / `locationId` | `totalSales`, `subtotal`, `tax`, `discount`, `totalCost`, `netProfit` |
| **Customer GSTINs (B2B)** | `GET` | `/api/v1/customers` | `customers.view` | `search`, `limit` | `gstin`, `companyName`, `tradeName` |
| **Supplier GSTINs (ITC)** | `GET` | `/api/v1/suppliers` | `suppliers.view` | `search`, `limit` | `gstin`, `companyName`, `taxNumber` |
| **Store GSTIN / Header** | `GET` | `/api/v1/stores` | `stores.view` | `limit` | `gstin`, `gst`, `taxNumber`, `address` |

> [!IMPORTANT]
> There are **no** endpoints for `/api/v1/tax-slabs` or `/api/v1/tax-settings`. Tax rates (`0%`, `5%`, `12%`, `18%`) are defined at the catalog product level and captured per line item during transaction checkout.

---

## 3. Authoritative Tax & Financial Data Models

### 3.1 Invoice Document Model (`invoices` collection)
```typescript
export interface InvoiceLineItem {
  productId: string;
  variantId?: string | null;
  name: string;
  unit?: string;
  quantity: number;
  price: number;            // Selling price per unit
  sellingPrice: number;     // Alias
  cost?: number;            // Purchase cost for margin calculations
  tax: number;              // Authoritative computed line tax amount: (quantity * price * gst) / 100
  gst: number;              // GST percentage rate: 0, 5, 12, 18, etc.
  lineTotal: number;        // Gross line total: Math.round(quantity * price * 100) / 100
}

export interface InvoiceDoc {
  _id?: string;
  id: string;                 // e.g. "INV-1723812345"
  invoiceNumber: string;      // Canonical invoice number
  transactionId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  storeId: string;            // Outlet store branch ID
  locationId: string;
  businessId: string;
  items: InvoiceLineItem[];
  subtotal: number;           // Sum of item gross totals: round(sum(qty * price), 2)
  tax: number;                // Sum of item tax amounts: round(sum(lineTax), 2)
  discount: number;           // Absolute discount applied to invoice
  grandTotal: number;         // round((subtotal + tax - discount), 2)
  paymentMode: 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | 'SPLIT';
  status: 'COMPLETED' | 'PAID' | 'VOIDED';
  createdAt: string;          // ISO timestamp
}
```

### 3.2 Purchase Document Model (`purchases` collection)
```typescript
export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  cost: number;               // Unit purchase cost
  purchasePrice: number;
  unit: string;
}

export interface PurchaseDoc {
  _id?: string;
  id: string;                 // e.g. "PUR-1723812000"
  purchaseId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;     // Supplier's original invoice number
  storeId: string;
  locationId: string;
  subtotal: number;           // Base taxable cost sum: sum(cost * qty)
  taxAmount: number;          // Total inward GST paid (Input Tax Credit eligible)
  shipping: number;           // Freight / Transport charge
  grandTotal: number;         // subtotal + taxAmount + shipping
  items: PurchaseItem[];
  transportDetails?: {
    transporterName?: string;
    vehicleNumber?: string;
    lrNumber?: string;
    eWayBillNumber?: string;
    freightAmount?: number;
    freightGstRate?: number;
  };
  status: 'RECEIVED' | 'VOIDED';
  createdAt: string;
}
```

### 3.3 Franchise Supply Order Model (`franchise_supply_orders` collection)
```typescript
export interface FranchiseSupplyOrderDoc {
  _id?: string;
  id: string;                 // e.g. "fso-1723812000"
  franchiseId: string;
  franchiseName?: string;
  storeId?: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    gstRate?: number;
  }>;
  subtotal: number;
  tax: number;                // Outward GST on franchise supplies
  grandTotal: number;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  createdAt: string;
}
```

---

## 4. GST Semantics & Mathematical Formulas

### 4.1 Supported GST Slabs in Catalog & Billing
The system standardizes on 4 canonical Indian GST tax brackets:
- **`0% (Exempt)`:** Fresh milk, loose agricultural produce, raw grains, unbranded farm items.
- **`5% (Essential)`:** Packaged paneer, branded curd, butter, ghee, tea, spices, edible oils.
- **`12% (Standard Food & Dairy)`:** Processed dairy goods, cheese spreads, packaged juices.
- **`18% (Commercial Standard)`:** Packaged confectionery, branded beverages, commercial equipment.

### 4.2 Tax Calculation Formulas (POS / Billing Engine)
In [`modules/billing.js:176-199`](file:///Users/avanish/Documents/billing%20system/modules/billing.js):
1. **Line Gross:**
   $$\text{lineGross} = \text{quantity} \times \text{unitPrice}$$
2. **Line Tax Amount:**
   $$\text{lineTax} = \frac{\text{lineGross} \times \text{taxRate}}{100}$$
3. **Invoice Subtotal:**
   $$\text{subtotal} = \sum \text{lineGross}$$
4. **Invoice Tax Total:**
   $$\text{tax} = \sum \text{lineTax}$$
5. **Invoice Grand Total:**
   $$\text{grandTotal} = \max(0, \text{round}(\text{subtotal} + \text{tax} - \text{discount}, 2))$$

### 4.3 CGST / SGST Splitting Rules
For all standard transactions:
$$\text{CGST} = \text{round}\left(\frac{\text{tax}}{2}, 2\right)$$
$$\text{SGST} = \text{round}\left(\frac{\text{tax}}{2}, 2\right)$$
$$\text{IGST} = 0.00 \quad (\text{Not verified / standard intra-state})$$

### 4.4 B2B vs B2C Segmentation Logic
- **B2B Registered:** If `customer.gstin` is present and non-empty ($\ge 15$ alphanumeric chars).
  - Tax liability is reported under B2B Outward Supplies (eligible for recipient Input Tax Credit).
- **B2C Retail:** If `customer.gstin` is empty, missing, or unregistered.
  - Tax liability is reported under B2C Consumer Sales.

---

## 5. Transport / Freight Tax Semantics

In [`modules/purchases.js`](file:///Users/avanish/Documents/billing%20system/modules/purchases.js):
- **Freight Charge (`shipping`):** Stored as a separate top-level field on the purchase document.
- **Freight GST:** Can be captured within `transportDetails.freightGstRate` or folded into `taxAmount`.
- **Authoritative Inward Total:**
  $$\text{grandTotal} = \text{subtotal} + \text{taxAmount} + \text{shipping}$$
- Inward tax on freight and purchases forms the total **Input Tax Credit (ITC)** pool.

---

## 6. Multi-Tenant Store Scoping & Role Access

### 6.1 Store Scope Rules
1. **Restricted Employees & Cashiers:**
   - Invoices and purchases are strictly constrained to their assigned outlet (`storeId: req.user.assignedStoreId`).
   - Tax reporting ledger displays only their store's liability.
2. **Super Admin & Central Management:**
   - Can inspect global enterprise tax liability across all stores (`storeId: 'all'`) or filter by individual branch.

### 6.2 RBAC Permission Mapping
- **View Tax Ledger & GST Breakdown:** `invoices.view` and `dashboard.view`.
- **View Inward Purchase Tax (ITC):** `purchases.view`.
- **View Franchise Partner Tax Ledger:** `franchise.view`.
- **Role Assignment:**
  - `SUPER ADMIN`: Full unrestricted enterprise tax access.
  - `ADMIN` / `AUDITOR`: Full tax reconciliation and ledger inspection.
  - `EMPLOYEE` / `CASHIER`: Scoped to assigned store sales.

---

## 7. Legacy Tax UI Risk Audit (`aiavro_billing_system.html:8819-9060`)

1. **Imperative Layout Thrashing:**
   - `initAuditorDashboard()` reads the entire `state.invoices` array in memory and iterates over every line item, performing DOM manipulations (`innerHTML += ...`) and rebuilding SVG charts.
2. **Client-Side Discount Proration Discrepancy:**
   - Legacy frontend attempted to prorate invoice-level discounts backwards across line items (`lineGross / (1 + gstRate/100)`), causing subtle rounding drift from the backend's authoritative `invoice.tax` value.
3. **Zero Pagination / Unbounded Memory:**
   - Rendered all sales transactions directly into table rows without pagination, freezing the browser on high-volume datasets.

---

## 8. Proposed Phase 15B Frontend Blueprint (`features/tax/`)

```
apps/web/features/tax/
├── types.ts                   # GstSummaryMetrics, GstSlabBreakdown, B2BSegmentation, TaxLedgerEntry
├── schemas.ts                 # Validation schemas for tax date filters & store scopes
├── calculations.ts            # Authoritative aggregation helpers, CGST/SGST split, slab distribution
├── api.ts                     # Aggregated data fetching using verified invoice/purchase endpoints
├── hooks.ts                   # TanStack Query hooks for tax ledger and compliance metrics
├── components/
│   ├── TaxHeader.tsx          # Title, compliance badge, period selector, export controls
│   ├── TaxSummaryCards.tsx    # KPIs: Gross Turnover, Taxable Value, Total GST, CGST, SGST, ITC
│   ├── GstComplianceMatrix.tsx# B2B vs B2C Segmentation, Central vs State Revenue share
│   ├── GstSlabDistribution.tsx# Interactive 0%, 5%, 12%, 18% slab contribution cards & stacked bar
│   ├── TaxLedgerTable.tsx     # Paginated invoice sales tax ledger with GSTIN, rates, and taxes
│   ├── FranchiseTaxLedger.tsx # Franchise wholesale tax and supply liabilities table
│   └── index.ts
└── page.tsx
```

### Protected Route:
- [`apps/web/app/(protected)/tax/page.tsx`](file:///Users/avanish/Documents/billing%20system/apps/web/app/%28protected%29/tax/page.tsx) — Tax & GST Compliance Dashboard.

---

## 9. Verification & Test Strategy for Phase 15B

1. **Unit Tests:**
   - `tests/unit/taxCalculations.test.ts`: Test CGST/SGST 50/50 division, GST slab grouping (0%, 5%, 12%, 18%), B2B vs B2C segmentation by GSTIN presence, and discount handling.
   - `tests/unit/taxSchemas.test.ts`: Validate query filters and date ranges.
   - `tests/unit/taxComponents.test.tsx`: Test `TaxSummaryCards`, `GstComplianceMatrix`, `GstSlabDistribution`, and `TaxLedgerTable`.
2. **E2E Tests:**
   - `tests/e2e/tax.spec.ts`:
     - Login $\to$ Navigate to `/tax`.
     - Verify KPI summary cards render (Gross Turnover, Taxable Value, Total GST, CGST, SGST).
     - Verify GST Slab cards render (0%, 5%, 12%, 18% splits).
     - Verify B2B vs B2C counts and values based on customer GSTIN.
     - Test date range filtering and store scope dropdown.
     - Test mobile responsiveness (`430x932` and `390x844`) with zero horizontal overflow.
     - Return to Dashboard $\to$ verify Dashboard stability.
