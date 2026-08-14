# Stage 13 Phase H - Customer + Supplier CRM Implementation

## Scope

Phase H redesigns the existing customer screen into a unified CRM workspace for customer and supplier records. It preserves the frozen backend contracts and only changes frontend presentation, state handling, realtime consumption, tests, and documentation.

No fake customers, suppliers, invoices, purchases, products, payments, inventory, categories, or brands are introduced.

## Customer UX

- The CRM workspace opens with a customer directory tab.
- The table prioritizes name, phone, email, store context, invoice count, last invoice activity, status, and actions.
- Search, store, and status filters operate over the authorized records returned by the existing customer API.
- Pagination is handled in the workspace state with a fixed page size of 25 because the frozen customer endpoint currently returns the authorized customer array.
- Create and edit use the existing customer modal and `api.customers.save` endpoint. The form keeps backend-required identity fields only: customer name and phone.
- The customer detail drawer shows identity, phone, email, GSTIN, address, store context, status, and recent invoices already present in application state.

## Supplier UX

- A supplier tab sits beside customers in the same CRM workspace.
- The table prioritizes supplier name, phone/contact, email, store context, purchase activity count, last purchase activity, status, and actions.
- Search, store, and status filters share the same CRM filtering and pagination primitives.
- Create and edit use the existing supplier modal and `api.suppliers.save` endpoint. The form requires only supplier name and contact, matching the backend.
- The supplier detail drawer shows identity, phone/contact, email, GSTIN, address, store context, status, and recent purchases already present in application state.

## Transaction Links

- Customer details can hand off to the POS workspace through `createSaleForCustomer`.
- Customer details can open the invoice workspace filtered to the selected customer through `viewInvoicesForCustomer`.
- Supplier details can open the purchase workspace filtered to the selected supplier through `viewPurchasesForSupplier`.
- Drawer transaction rows call existing Phase G detail drawers:
  - `openInvoiceDetailDrawer`
  - `openPurchaseDetailDrawer`

## Store Context

- The CRM hero displays the current outlet/store through `#crm-current-store-label`.
- Store filters are populated from the existing store/business helpers.
- Scoped users with an assigned store see a locked store filter.
- Backend RBAC remains authoritative through existing `customers.view`, `customers.create`, `customers.update`, `suppliers.view`, `suppliers.create`, and `suppliers.update` permissions.

## Realtime Behavior

Phase H consumes existing socket events without changing event names or payload contracts:

- `customer_updated`
- `customer_deleted`
- `supplier_updated`
- `supplier_deleted`

Dot-case aliases are also registered for compatibility with the existing frontend socket pattern:

- `customer.updated`
- `customer.deleted`
- `supplier.updated`
- `supplier.deleted`

Incoming updates call `upsertCRMCustomer` or `upsertCRMSupplier`, updating only the relevant row and active drawer. Delete events remove the record locally and close the matching drawer if it is open. The workspace preserves active tab, filters, pagination, and drawer context.

## Financial And Activity Hierarchy

- CRM records do not calculate balances or financial rules in the frontend.
- Customer activity is derived from authorized invoice records already loaded into application state.
- Supplier activity is derived from authorized purchase records already loaded into application state.
- Invoice and purchase totals are displayed only through existing normalized Phase G detail functions.

## Error, Loading, And Empty States

- `mapCRMError` differentiates validation, permission, store access, session, not found, and network failures.
- Empty states render as:
  - `No customers found.`
  - `No suppliers found.`
  - `No invoices for customer.`
  - `No purchases for supplier.`
- No placeholder records are seeded to fill tables or drawers.

## Responsive And Accessibility

- CRM tables reuse the existing responsive finance table pattern and `data-label` cells for mobile cards.
- Detail drawers and create/edit dialogs use `role="dialog"`, `aria-modal="true"`, and explicit labels.
- Actions are native buttons and remain keyboard reachable.
- Destructive CRM delete UI was not added in Phase H, avoiding unsupported frontend-only deletion paths.

## Performance

- CRM rendering paginates before row creation.
- Search input is debounced.
- Realtime updates are incremental and avoid full dataset refreshes.
- Transaction detail links reuse already loaded invoice and purchase state and do not download entire history from the CRM screen.

## API Contracts Used

Existing contracts only:

- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `DELETE /api/v1/customers/:id` remains in the existing client but is not surfaced by the Phase H workspace.
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`
- `DELETE /api/v1/suppliers/:id` remains in the existing client but is not surfaced by the Phase H workspace.

Phase H does not modify customer, supplier, invoice, purchase, inventory, payment, tax, RBAC, store authorization, print, PDF, or socket contracts.
