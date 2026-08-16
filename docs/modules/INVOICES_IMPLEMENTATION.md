# Phase 8 — Invoices & Sales Ledger Implementation Specification

## 1. Executive Summary
The Invoices & Sales Ledger module has been migrated to the typed Next.js frontend architecture (`apps/web/features/invoices/` and route `apps/web/app/(protected)/invoices/page.tsx`). It provides an authoritative sales register, server-paginated ledger browsing, customer search, detailed invoice breakdown drawers, PDF generation, real-time Socket.IO synchronization, and atomic invoice voiding with automated inventory reversals.

---

## 2. API Contract Mapping (Frozen Backend)

All operations consume existing frozen backend endpoints from `modules/billing.js` without backend code modifications:

| Operation | Method | Path | RBAC Permission | Scope | Realtime Event |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Invoices** | `GET` | `/api/v1/invoices` | `invoices.view` | Store Scoped | Polled & invalidated on `invoice_created`, `invoice_voided` |
| **Get Invoice Detail** | `GET` | `/api/v1/invoices/:id` | `invoices.view` | Store Scoped | Stale time 60s |
| **Void Invoice** | `POST` | `/api/v1/invoices/:id/void` | `invoices.void` | Store Scoped | Emits `invoice_voided` to `store_${locationId}` |
| **Tax Invoice PDF** | `GET` | `/api/v1/invoices/:invoiceNumber/pdf` | `invoices.view` / `invoices.print` | Store Scoped | Direct binary stream download |

---

## 3. Financial Computations & Rules

1. **Active Sales Counting:**
   $$\text{Active Invoices} = \{ inv \in \text{Invoices} \mid inv.\text{status} \ne \text{'VOIDED'} \land \neg inv.\text{isArchived} \}$$
2. **Gross Revenue & Tax Liability:**
   $$\text{Revenue} = \sum_{inv \in \text{Active}} inv.\text{grandTotal}$$
   $$\text{Tax Liability} = \sum_{inv \in \text{Active}} inv.\text{tax}$$
3. **Average Bill Value (Ticket Size):**
   $$\text{Average Ticket} = \frac{\text{Revenue}}{|\text{Active}|}$$

---

## 4. Components & Responsibilities

- **[`InvoiceHeader`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceHeader.tsx):** Store outlet selector, real-time status badge, POS Sale trigger button.
- **[`InvoiceSummary`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceSummary.tsx):** 4 deterministic KPI cards (Total Completed Invoices, Gross Sales Revenue, GST Tax Collected, Average Ticket Value).
- **[`InvoiceFilters`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceFilters.tsx):** Search input (invoice #, customer name, phone), payment mode selector, and status filter pills (`All Invoices`, `Paid`, `Pending`, `Voided`).
- **[`InvoiceTable`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceTable.tsx):** Typed data table with customer details, item counts, tax amounts, grand totals in INR `tabular-nums`, payment method badges, status badges, and actions (View, PDF Download, Void).
- **[`InvoiceDetailDrawer`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceDetailDrawer.tsx):** Slide-out drawer with complete line items breakdown, customer GSTIN/address, cashier session, tax calculation, and PDF/void buttons.
- **[`InvoiceVoidDialog`](file:///Users/avanish/Documents/billing%20system/apps/web/features/invoices/components/InvoiceVoidDialog.tsx):** Modal dialog with inventory reversal explanation, required audit reason note, and mutation execution.

---

## 5. Anti-Flicker & Performance Guarantees

1. **Deterministic Skeletons:** Table and summary skeletons match rendered geometry exactly to eliminate layout shift.
2. **Keyed Rows:** Rows keyed by unique `id` / `invoiceNumber`.
3. **Scoped Query Invalidation:** Realtime events (`invoice_created`, `invoice_voided`) invalidate only `['invoices']`, `['inventory', 'balances']`, `['inventory', 'summary']`, and `['dashboard', 'metrics']`.
4. **Zero Layout Animation:** Zero hover scale, zero hover translate, and zero structural reflows.

---

## 6. Responsive Breakdown

- **Desktop ($\ge$ 1024px):** 4-column summary grid, full multi-column data table with inline actions.
- **Mobile (< 1024px):** 2-column stacked KPI cards, horizontal scrollable status filter pills, horizontal containment for table without window scroll, and slide-out `Drawer` modal.
