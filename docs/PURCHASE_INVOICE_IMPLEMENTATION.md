# Purchase + Invoice Workspace Implementation

**Stage:** 13  
**Phase:** G  
**Status:** Complete

## Purchase UX

The purchase workspace now presents a paginated supplier purchase ledger with store context, supplier/store/status/date filters, totals, and a focused `New Purchase` action. The purchase entry flow is implemented as a drawer:

`Select Store -> Select Supplier -> Add Products -> Set Quantity -> Set Cost -> Review -> Save Purchase`

The form uses the existing `api.purchases.save()` client and submits the existing backend payload fields only. It preserves `transactionId` by using the purchase reference as the idempotency key.

## Invoice UX

The invoice workspace now presents a paginated sales invoice ledger with customer/store/status/payment/date filters, prioritized invoice number, total, status, payment, and date. Invoice detail opens in a drawer that shows customer, store, line items, subtotal, tax, discount, roundoff, grand total, payment mode, and status.

## Financial Hierarchy

Totals use tabular INR formatting through the shared component formatter when available. Purchase Total and Invoice Grand Total are visually dominant, with subtotal, tax, discount, and roundoff shown as supporting values.

## Store Context

Both workspaces show the current outlet/store context. Global users can use the existing store/business architecture to filter by store. Scoped users receive locked store dropdowns in the frontend, while the backend remains authoritative through existing RBAC and store-scope middleware.

## Realtime Behavior

The workspace listens to existing events only:

- `purchase_created`
- `purchase_deleted`
- `invoice_created`
- `invoice_voided`

Incoming events update the relevant row/detail state incrementally. The implementation avoids unnecessary full data reloads and preserves current filters, pagination, and open drawer state.

## Print Integration

Invoice detail actions hand off to the existing print center:

- 58mm thermal receipt
- A4 invoice
- Server PDF download

The existing print/PDF contracts, store branding, GSTIN, phone, invoice items, payment information, and logo behavior remain unchanged.

## Void Behavior

Purchase and invoice void actions are RBAC-aware and require confirmation. The frontend does not restore stock itself; it calls the existing backend void endpoints and displays the backend transaction-flow effect after success.

## Responsive + Accessibility

Desktop uses dense financial tables. Mobile collapses rows into priority label/value blocks so invoice and purchase totals remain readable at narrow widths. Detail drawers include dialog roles, labels, focus handoff, and accessible destructive confirmations.

## Performance

The workspaces use existing backend pagination and filter parameters. They do not download full purchase or invoice history. Realtime updates are incremental row/detail updates.

## Contracts Used

- `GET /api/v1/purchases`
- `POST /api/v1/purchases`
- `DELETE /api/v1/purchases/:id`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/void`
- `GET /api/v1/invoices/:invoiceNumber/pdf`

No backend/API/realtime contract was modified.
