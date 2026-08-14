# Frontend Component Map & Taxonomy

**Stage:** Stage 13 — Component Taxonomy Specification  
**Goal:** Modular, Reusable UI Component Matrix with Defined Inputs, Outputs & Accessibility Contracts

---

## 1. Global Shell & Navigation Components

```mermaid
graph TD
    AppShell[AppShell]
    AppShell --> TopBar[TopBar]
    AppShell --> Sidebar[Sidebar]
    AppShell --> ViewContainer[ViewContainer]
    AppShell --> GlobalModals[GlobalModalOutlet]
    AppShell --> ToastContainer[ToastContainer]

    TopBar --> OutletSwitcher[OutletSwitcher]
    TopBar --> SearchTrigger[CommandPaletteTrigger]
    TopBar --> HardwareScannerBadge[HardwareScannerBadge]
    TopBar --> UserMenu[UserMenu]

    Sidebar --> NavItem[NavItem (Role-Aware)]
```

### Component Specifications

#### `AppShell`
- **Role:** Main application wrapper; manages layout boundaries and global hotkey listeners.
- **State Bound:** `currentUser`, `activeStoreId`, `networkStatus`.
- **Keyboard Hotkeys:**
  - `F1` or `Ctrl+B`: Switch to POS Billing.
  - `F2` or `Ctrl+I`: Open Master Inventory.
  - `Ctrl+K`: Open Command Palette / Global Search.
  - `Esc`: Close active modal or drawer.

#### `OutletSwitcher`
- **Props:** `activeStoreId: string`, `stores: Array<{ id, name, locationCode, isMain }>`
- **Events:** `@change(storeId)` $\rightarrow$ triggers `changeActiveBusiness()`, joins socket room `store_<storeId>`.

#### `SyncStatusBadge`
- **Props:** `status: 'connected' | 'syncing' | 'offline'`
- **Visuals:** Green dot (`Online`), Amber pulsing dot (`Syncing`), Slate dot (`REST Offline Fallback`).

---

## 2. Reusable Primitives & Operational Components

| Component | Props (Inputs) | Events (Outputs) | Accessibility / ARIA |
|---|---|---|---|
| `DataTable` | `columns: Array`, `rows: Array`, `loading: boolean`, `sortKey: string`, `sortOrder: 'asc'|'desc'` | `@sort(key)`, `@rowClick(row)`, `@action(type, row)` | `role="table"`, keyboard row focus, sticky headers |
| `PaginationBar` | `page: number`, `totalPages: number`, `total: number`, `limit: number` | `@pageChange(newPage)`, `@limitChange(newLimit)` | `aria-label="Pagination"`, Next/Prev button focus |
| `Modal` | `isOpen: boolean`, `title: string`, `size: 'sm'|'md'|'lg'|'xl'`, `closeOnEsc: boolean` | `@close()`, `@confirm()` | `role="dialog"`, `aria-modal="true"`, focus trap |
| `Drawer` | `isOpen: boolean`, `title: string`, `placement: 'right'`, `width: string` | `@close()` | `role="dialog"`, slide-in transition, Esc listener |
| `ConfirmDialog` | `isOpen: boolean`, `title: string`, `message: string`, `danger: boolean` | `@confirm()`, `@cancel()` | Initial focus on Cancel button for destructive actions |
| `Toast` | `id: string`, `type: 'success'|'error'|'warning'|'info'`, `message: string`, `duration: number` | `@dismiss(id)` | `role="status"`, auto-dismiss after 4000ms |
| `MetricCard` | `label: string`, `value: string|number`, `change: string`, `icon: string`, `variant: 'default'|'success'|'warning'` | None | Semantically grouped headline and numeric sub-headline |

---

## 3. Domain-Specific Component Specifications

### 3.1 POS Terminal Domain
- **`POSProductPicker`:** Grid/List of quick products with search filter, category pill tabs, price display, and image thumbnail.
- **`POSCartMatrix`:** Highly responsive table displaying line items, quantity steppers, live loose weight badges, discount inputs, and line totals.
- **`POSWeightModal`:** Modal for loose/fresh item weight entry; includes 4 quick preset buttons (e.g. `100g`, `250g`, `500g`, `1kg` or `ml`/`L`), live price calculation, and autofocus.
- **`POSPaymentDrawer`:** Checkout panel for Cash, UPI, Card, or Split Tender selection with tender change calculation and "Complete & Print" action (`Enter`).

### 3.2 Product Master Domain
- **`ProductFormDrawer`:** Form for creating/editing product details (Name, SKU, Barcode, Selling Price, Cost Price, Category, Brand, Supplier, Selling Mode, Shelf Life).
- **`BarcodeLabelSheet`:** Multi-column label sheet printer preview supporting customizable sticker layouts (e.g. 24 labels/page, 40 labels/page).

### 3.3 Inventory Domain
- **`StockSummaryCards`:** Low stock count, total valuation at cost, total valuation at retail, out of stock count.
- **`StockAdjustModal`:** Increment/decrement stock with mandatory reason notes and ledger type selection (`ADJUSTMENT_IN`, `DAMAGE_OUT`, `AUDIT_CORRECTION`).
- **`StockTransferModal`:** Cross-outlet stock relocation modal with destination outlet selection and available stock validator.

### 3.4 Invoices & Print Domain
- **`InvoiceDetailDrawer`:** Side-sheet showing complete invoice breakdown, payment mode, cashier metadata, and printable preview.
- **`InvoiceVoidModal`:** Manager authorization dialog requiring void reason notes before executing `POST /invoices/:id/void`.
- **`PrintCenterModal`:** Tabbed print dialog supporting 58mm Thermal Canvas, A4 GST Invoice, and PDF Download.

### 3.5 Bulk Import Domain
- **`ImportWizard`:** 4-step wizard:
  1. *Upload:* Drag-and-drop CSV / Excel file.
  2. *Map:* Header detection and field assignment matrix.
  3. *Review:* Validation preview highlighting safe rows (Green), warnings (Amber), and blocked rows (Red).
  4. *Commit:* Batch execution progress with summary report.
