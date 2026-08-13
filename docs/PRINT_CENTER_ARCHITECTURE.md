# Print Center Architecture & Invoice Data Normalization

This document defines the print architecture, canonical invoice data model, store/outlet branding resolution, and rendering flows for 58mm thermal receipts and A4 tax invoices.

---

## 1. Print Data Flow

```
POS Sale Checkout (or Invoice Log "Preview")
        ↓
POST /api/v1/invoices -> response.invoice
        ↓
normalizeInvoiceForPrint(invoice)
        ↓
resolveInvoiceBranding(normalizedInvoice)
        ↓
resolveInvoiceCustomer(normalizedInvoice)
        ↓
openInvoicePreviewModal(invoiceId)
        ↓
├── 58mm Thermal Receipt DOM Renderer (#receipt-58mm-container)
├── A4 Tax Invoice DOM Renderer (#invoice-print-container)
└── Authenticated Server PDF Generator (api.invoices.getPdf -> GET /api/v1/invoices/:id/pdf)
```

---

## 2. Canonical Print Invoice Object

The print renderer consumes a single normalized invoice model:

```javascript
{
  id: "INV-1786523910",
  invoiceNumber: "INV-1786523910",
  date: "2026-08-14T02:00:00.000Z",
  storeId: "store-banaswadi",
  locationId: "store-banaswadi",
  businessId: "store-banaswadi",
  customerName: "Walk-in Customer",
  customerId: null,
  items: [
    {
      productId: "prod-1",
      variantId: null,
      name: "A2 Gir Cow Ghee",
      sku: "8901234567001",
      barcode: "8901234567001",
      unit: "500ml",
      quantity: 1,
      price: 850.00,
      unitPrice: 850.00,
      cost: 600.00,
      gstRate: 5,
      taxAmount: 40.48,
      discount: 0,
      lineTotal: 850.00
    }
  ],
  subtotal: 809.52,
  discount: 0,
  tax: 40.48,
  roundoff: 0,
  grandtotal: 850.00,
  grandTotal: 850.00,
  paymentMode: "UPI",
  status: "COMPLETED",
  createdBy: "cashier1"
}
```

---

## 3. Store / Outlet Branding Resolution

Branding resolution follows a strict priority chain to ensure invoices and receipts always display the **exact store/outlet where the transaction took place**:

1. `invoice.storeId` / `invoice.locationId` against `state.stores`
2. `invoice.storeId` / `invoice.locationId` against `state.businesses`
3. `invoice.businessId` against `state.businesses`
4. Current selected active business (`state.activeBusinessId`)
5. First available enterprise business record
6. Safe fallback object

```javascript
function resolveInvoiceBranding(inv) {
  // Returns { name, subtitle, owner, logo, address, phone, email, gstin, website, terms, upiId }
}
```

---

## 4. 58mm Thermal Receipt Layout

- **Width**: Standard 58mm roll (270px container max-width).
- **Typography**: Compact, high-contrast monospace (`Courier New`, monospace).
- **Structure**:
  - Store Logo (if configured)
  - Store Name (uppercase, bold)
  - Store Address, GSTIN, Phone
  - Receipt #, Date & Time
  - Buyer info (Walk-in or customer name/phone)
  - Items table: Product name, size, quantity, unit rate, line total
  - Financial summary: Subtotal, Discount, GST Tax, Net Total
  - Savings banner (when discount > 0)
  - Payment details (Paid via CASH / UPI / CARD / BANK)
  - Dynamic UPI QR Code (for UPI payments)
  - Store terms & conditions
  - Clean footer

---

## 5. A4 Tax Invoice Layout

- **Width**: Standard 210mm A4 page with `@media print` rules.
- **Sections**:
  - Header: Outlet Logo, Seller Brand, Subtitle, Full Address, GSTIN, Phone
  - Invoice Meta: Invoice ID, Date, Payment Mode, Stamp
  - Buyer Details: Customer Name, Address, GSTIN, Phone
  - Itemized Table: S.No, Description with Unit & GST rate, Unit Rate, Quantity, Discount, Tax, Line Total
  - Summary: Subtotal, Discount, Tax, Roundoff, Grand Total in Numerals and Words
  - Footer: Terms, Payment details, Authorized Signatory Seal

---

## 6. PDF Generation & Authentication

- Server route: `GET /api/v1/invoices/:invoiceNumber/pdf`
- Authenticated client fetch via `api.invoices.getPdf(id)` passing `Authorization: Bearer <jwt>`
- Avoids exposing long-lived JWTs in URL query parameters (`?token=...`)
- Employs blob object URL creation (`URL.createObjectURL(blob)`) for secure direct file download.
- PDF generation in `modules/billing.js` resolves the store's actual branding, address, GSTIN, and line items.

---

## 7. Print Customization & Legacy Compatibility

- **Toggles**: Logo, Seller Info, Buyer Info, Savings Banner, Payment Widget, Terms, and Signatory can be toggled in the Print Customizer without affecting core line items.
- **Legacy Invoices**: Historical invoices with field variants (such as `grandTotal` vs `grandtotal`, `lineItems` vs `items`, `unitPrice` vs `price`, `businessId` vs `storeId`) are automatically normalized on-the-fly without database mutation.
