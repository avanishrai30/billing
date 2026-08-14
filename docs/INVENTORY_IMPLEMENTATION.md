# Stage 13 — Phase F: Inventory & Transfer Command Center Implementation

## 1. Overview & Purpose
Phase F transforms the Inventory view into an authoritative operational command center. It provides complete transparency into multi-store stock levels, immutable movement audit trails, safe stock adjustments, and atomic inter-store transfers while strictly maintaining frozen backend schema boundaries and the zero fake data policy.

---

## 2. Key Architecture & Features

### A. Context Bar & Sync Liveness Indicator
- **Store / Outlet Context**: Displays the active store facility or a consolidated multi-store overview for admins (`🌐 All Outlets (Consolidated)`). Scoped employees are locked to their assigned outlet badge.
- **Sync Status**: Shows dynamic status badge (`🟢 Real-time Sync Active` or `⚪ Offline / REST Mode`) with a manual refresh button.
- **Last Updated Indicator**: Displays high-precision timestamp of the last database query.

### B. Health KPI Summary
- **Healthy Stock**: Items with on-hand quantity strictly above their configured reorder threshold.
- **Low Stock Alerts**: Items at or below the reorder threshold.
- **Out of Stock**: Depleted items ($0$ units remaining).
- **Valuation & Total Units**: Aggregates total on-hand units and total commercial value from `GET /api/v1/inventory/summary`.

### C. Master Stock Balances Table
- **Authoritative Data Source**: Connects directly to `inventory` collection balances and joins product catalog metadata.
- **Columns**: Image, SKU (`.badge-mono`), Barcode (`.badge-mono`), Product Name with selling mode icon and unit, Store Location badge, On Hand quantity (bold tabular numeric), Reserved quantity, Available quantity (green bold tabular numeric), Reorder Threshold, and Status Badge (`IN STOCK`, `LOW STOCK`, `OUT OF STOCK`).
- **Row Actions**:
  - `👁️ Details`: Opens the 360° Stock Breakdown Drawer (`#stock-detail-drawer`).
  - `⚖️ Adjust`: Opens the Stock Adjustment modal with pre-selected product and store.
  - `🔄 Transfer`: Opens the Inter-Store Stock Transfer modal with pre-selected product and source store.

### D. 360° Product Stock Detail Drawer (`#stock-detail-drawer`)
- Slide-out inspection drawer showing product thumbnail, name, SKU, and facility location.
- 3-column breakdown metric matrix: On Hand, Reserved, Available units.
- Reorder threshold, selling mode, barcode, ledger version, and last mutation timestamp.
- Quick navigation shortcuts: Adjust, Transfer, View Ledger Logs, and Product Master Details.

### E. Stock Adjustment Flow (`#stock-adjustment-modal`)
- Movement types: `ADJUSTMENT` (Audit count), `DAMAGE` (Spoilage loss), `OPENING` (Initial stock intake), `SALE_RETURN` (Customer return).
- Authoritative on-hand balance display with live Net Change preview ($\Delta$).
- Mandatory audit reason / operational notes for traceability.
- Submit button locks during execution to prevent duplicate transactions.
- Concurrency data race recovery: alerts `"Stock changed before this action completed."` if an updated version conflict is detected.

### F. Inter-Store Stock Transfer Flow (`#transfer-stock-modal`)
- Source Store and Target Store selectors with client-side validation rejecting same-store transfers.
- Realtime available stock indicator and remaining source stock preview.
- Atomic transfer execution posting dual immutable ledger records (`TRANSFER_OUT` and `TRANSFER_IN`).
- Transfer Success state card displaying Transfer ID (`TRF-xxxx`), product, dispatched quantity, routing (`Store A → Store B`), and timestamp.

### G. Immutable Movement Ledger Viewer (`#inventory-audit-container`)
- Connected to `GET /api/v1/inventory/logs`.
- Filtering by Search keyword, Movement Type (`ALL`, `PURCHASE`, `SALE`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT`, `DAMAGE`, `OPENING`, `SALE_RETURN`, `VOID`).
- Displays Movement ID, Date & Time, Product Name & SKU, Store Location, Movement Type badge, Signed Quantity Change ($+X$ in green, $-Y$ in red), Before $\rightarrow$ After balance, Reference ID, Performed By, and Notes.

### H. Real-time Socket & REST Fallback
- Granular listener for `inventory.updated` and `inventory_updated` updates in-memory `state.inventory`, recalculates POS stock, updates active detail drawer in-place, and refreshes KPI summary cards.
- Bulk update listener `inventory.bulk_updated` refreshes active store scope.
- Graceful offline / REST fallback ensures operational continuity if websocket disconnected.

---

## 3. Verification & Test Suite
- Automated test suite `tests/inventoryRedesign.test.js` covers 16 critical requirements.
- Zero fake data verified across codebase.
