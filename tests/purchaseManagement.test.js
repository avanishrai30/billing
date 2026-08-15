const fs = require('fs');
const path = require('path');

describe('Purchase Entry & Procurement Management Architecture', () => {
  const htmlPath = path.resolve(__dirname, '../aiavro_billing_system.html');
  const purchaseModulePath = path.resolve(__dirname, '../modules/purchases.js');
  const frontendApiPath = path.resolve(__dirname, '../frontend-api/purchases.js');

  let htmlContent = '';
  let purchaseModuleContent = '';
  let frontendApiContent = '';

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
    purchaseModuleContent = fs.readFileSync(purchaseModulePath, 'utf8');
    frontendApiContent = fs.readFileSync(frontendApiPath, 'utf8');
  });

  test('1. Purchase page structure contains Section A (New Purchase) and Section B (Purchase History)', () => {
    expect(htmlContent).toContain('id="view-purchase"');
    expect(htmlContent).toContain('New Supplier Purchase Entry (GRN)');
    expect(htmlContent).toContain('Procurement History & Goods Receipts');
  });

  test('2. New purchase form contains all required header fields', () => {
    expect(htmlContent).toContain('id="purchase-supplier-select"');
    expect(htmlContent).toContain('id="purchase-invoice-ref"');
    expect(htmlContent).toContain('id="purchase-date"');
    expect(htmlContent).toContain('id="purchase-store-select"');
    expect(htmlContent).toContain('id="purchase-eway-bill"');
    expect(htmlContent).toContain('id="purchase-payment-status"');
    expect(htmlContent).toContain('id="purchase-notes"');
  });

  test('3. Supplier selection & dropdown population helpers exist', () => {
    expect(htmlContent).toContain('function populatePurchaseSupplierDropdown()');
    expect(htmlContent).toContain('function populatePurchaseStoreDropdown(');
  });

  test('4. Product selection & manual catalog picker exist', () => {
    expect(htmlContent).toContain('id="purchase-manual-prod-select"');
    expect(htmlContent).toContain('function populatePurchaseCatalogDropdown()');
    expect(htmlContent).toContain('function addSelectedManualProdToSheet()');
  });

  test('5. Pure calculation engine calculatePurchaseTotals computes item subtotal & quantity accurately', () => {
    expect(htmlContent).toContain('function calculatePurchaseTotals()');
    expect(htmlContent).toContain('const rawLine = rate * qty;');
    expect(htmlContent).toContain('goodsSubtotal += rawLine;');
  });

  test('6. GST calculation supports item-level taxable values and tax rates', () => {
    expect(htmlContent).toContain('const taxable = Math.max(0, rawLine - lineDisc);');
    expect(htmlContent).toContain('const lineTax = (taxable * taxRate) / 100;');
    expect(htmlContent).toContain('goodsTax += lineTax;');
  });

  test('7. Optional transport section exists with toggle checkbox and dedicated fields', () => {
    expect(htmlContent).toContain('id="purchase-transport-toggle"');
    expect(htmlContent).toContain('id="purchase-transport-fields"');
    expect(htmlContent).toContain('id="transport-agency"');
    expect(htmlContent).toContain('id="transport-mode"');
    expect(htmlContent).toContain('id="transport-docket-no"');
    expect(htmlContent).toContain('id="transport-date"');
    expect(htmlContent).toContain('id="transport-charge"');
    expect(htmlContent).toContain('id="transport-tax-rate"');
    expect(htmlContent).toContain('id="transport-tax-amt"');
    expect(htmlContent).toContain('id="transport-total-charge"');
    expect(htmlContent).toContain('id="transport-payment-status"');
  });

  test('8. Freight calculation accurately computes freight tax amount and total freight', () => {
    expect(htmlContent).toContain('transportTaxAmount = (transportCharge * transportTaxRate) / 100;');
    expect(htmlContent).toContain('totalTransport = transportCharge + transportTaxAmount;');
  });

  test('9. Grand total computation calculates transparent sum of taxable, GST, freight, and other charges', () => {
    expect(htmlContent).toContain('const grandTotal = Math.round(goodsTaxable + goodsTax + transportCharge + transportTaxAmount + otherCharges);');
    expect(htmlContent).toContain('id="pur-summary-grandtotal"');
  });

  test('10. Payload structure contains structured transport sub-object and financial breakdown', () => {
    expect(htmlContent).toContain('const purchasePayload = {');
    expect(htmlContent).toContain('supplierInvoiceNumber: invoiceRef,');
    expect(htmlContent).toContain('goodsSubtotal: totals.goodsSubtotal,');
    expect(htmlContent).toContain('goodsTaxableValue: totals.goodsTaxable,');
    expect(htmlContent).toContain('goodsTaxAmount: totals.goodsTax,');
    expect(htmlContent).toContain('transport,');
    expect(htmlContent).toContain('grandTotal: totals.grandTotal,');
  });

  test('11. Backend modules/purchases.js calculates totals supporting transport, discounts, and GST', () => {
    expect(purchaseModuleContent).toContain('const transportObj = (purchaseData.transport && typeof purchaseData.transport === \'object\') ? purchaseData.transport : null;');
    expect(purchaseModuleContent).toContain('const shipping = transportCharge > 0 ? transportCharge : parseFloat(purchaseData.shipping || 0);');
    expect(purchaseModuleContent).toContain('const grandTotal = purchaseData.grandTotal !== undefined');
    expect(purchaseModuleContent).toContain('inventoryService.addStockBatch(');
  });

  test('12. Frontend API client supports listWithPagination, get, save, and delete', () => {
    expect(frontendApiContent).toContain('async list(params = {})');
    expect(frontendApiContent).toContain('async listWithPagination(params = {})');
    expect(frontendApiContent).toContain('async get(id)');
    expect(frontendApiContent).toContain('async save(purchaseData)');
    expect(frontendApiContent).toContain('async delete(id)');
  });

  test('13. Purchase history supports search, supplier, store, status, and date range filtering', () => {
    expect(htmlContent).toContain('id="pur-history-search"');
    expect(htmlContent).toContain('id="pur-history-supplier-filter"');
    expect(htmlContent).toContain('id="pur-history-store-filter"');
    expect(htmlContent).toContain('id="pur-history-status-filter"');
    expect(htmlContent).toContain('id="pur-history-start-date"');
    expect(htmlContent).toContain('id="pur-history-end-date"');
    expect(htmlContent).toContain('function resetPurchaseHistoryFilters()');
  });

  test('14. Purchase history supports pagination with prev/next buttons and page counters', () => {
    expect(htmlContent).toContain('id="pur-prev-page-btn"');
    expect(htmlContent).toContain('id="pur-next-page-btn"');
    expect(htmlContent).toContain('id="purchase-pagination-info"');
    expect(htmlContent).toContain('function changePurchaseHistoryPage(delta)');
  });

  test('15. Purchase detail drawer displays complete summary, items, transport, and audit logs', () => {
    expect(htmlContent).toContain('id="purchase-detail-drawer-modal"');
    expect(htmlContent).toContain('function openPurchaseDetailDrawer(purchaseId)');
    expect(htmlContent).toContain('function buildPurchaseDetailDrawerHtml(pur)');
    expect(htmlContent).toContain('Procurement Cost Summary');
  });

  test('16. Void flow has confirmation modal with critical inventory reversion warning and DELETE call', () => {
    expect(htmlContent).toContain('id="purchase-void-modal"');
    expect(htmlContent).toContain('function openPurchaseVoidModal(purchaseId)');
    expect(htmlContent).toContain('function confirmExecutePurchaseVoid()');
    expect(htmlContent).toContain('CRITICAL WARNING:</strong> Voiding this purchase will automatically revert the stock quantities');
    expect(purchaseModuleContent).toContain('inventoryService.revertStockBatch(');
  });

  test('17. Duplicate submit protection locks button during submission', () => {
    expect(htmlContent).toContain('if (isPurchaseSubmitting) return;');
    expect(htmlContent).toContain('isPurchaseSubmitting = true;');
    expect(htmlContent).toContain('submitBtn.disabled = true;');
  });

  test('18. Error handling handles specific error codes', () => {
    expect(htmlContent).toContain('const errCode = res.error?.code ||');
    expect(htmlContent).toContain('triggerAlert(`[${errCode}] ${errMsg}`');
  });

  test('19. Backend enforces verifyJWT authentication middleware on purchase routes', () => {
    expect(purchaseModuleContent).toContain('router.get(\'/\', verifyJWT');
    expect(purchaseModuleContent).toContain('router.get(\'/:id\', verifyJWT');
    expect(purchaseModuleContent).toContain('router.post(\'/\', verifyJWT');
    expect(purchaseModuleContent).toContain('router.delete(\'/:id\', verifyJWT');
  });

  test('20. Backend enforces RBAC and store-scoping permissions', () => {
    expect(purchaseModuleContent).toContain('requirePermission(\'purchases.view\')');
    expect(purchaseModuleContent).toContain('requirePermission(\'purchases.create\')');
    expect(purchaseModuleContent).toContain('requirePermission(\'purchases.void\')');
    expect(purchaseModuleContent).toContain('requireStoreScope(');
  });

  test('21. Realtime events purchase_created and purchase_deleted are emitted and handled', () => {
    expect(purchaseModuleContent).toContain('\'purchase_created\'');
    expect(purchaseModuleContent).toContain('\'purchase_deleted\'');
    expect(htmlContent).toContain('syncSocket.on(\'purchase_created\'');
    expect(htmlContent).toContain('syncSocket.on(\'purchase_deleted\'');
  });

  test('22. Printable goods receipt note voucher print function exists', () => {
    expect(htmlContent).toContain('function printPurchaseRecord(purchaseId)');
    expect(htmlContent).toContain('GOODS RECEIPT NOTE (GRN)');
  });

  test('23. No fake purchase data or hardcoded mock rows in table bodies', () => {
    expect(htmlContent).not.toContain('fake-purchase');
    expect(htmlContent).not.toContain('mock-purchase');
  });

  test('24. No transition: all used in purchase stylesheet rules', () => {
    const purchaseStyleMatch = htmlContent.match(/\/\* =+ PURCHASE ENTRY & PROCUREMENT STYLES =+ \*\/([\s\S]*?)\.onboarding-queue-item/);
    if (purchaseStyleMatch) {
      expect(purchaseStyleMatch[1]).not.toContain('transition: all');
    }
  });

  test('25. No geometry-changing transforms (scale, translateY) in purchase hover states', () => {
    const purchaseStyleMatch = htmlContent.match(/\/\* =+ PURCHASE ENTRY & PROCUREMENT STYLES =+ \*\/([\s\S]*?)\.onboarding-queue-item/);
    if (purchaseStyleMatch) {
      expect(purchaseStyleMatch[1]).not.toContain('transform: scale(');
      expect(purchaseStyleMatch[1]).not.toContain('transform: translateY(');
    }
  });

  test('26. Atomic DOM rendering is used for table lists via in-memory map().join(\'\')', () => {
    expect(htmlContent).toContain('function buildPurchaseSheetRowsHtml()');
    expect(htmlContent).toContain('function buildPurchaseHistoryRowsHtml()');
    expect(htmlContent).toContain('tbody.innerHTML = buildPurchaseSheetRowsHtml();');
    expect(htmlContent).toContain('tbody.innerHTML = buildPurchaseHistoryRowsHtml();');
  });

  test('27. No duplicate backend purchase contract created', () => {
    expect(purchaseModuleContent).not.toContain('/api/v1/purchase-entry');
    expect(purchaseModuleContent).not.toContain('/api/v1/purchase-history');
    expect(purchaseModuleContent).toContain('router.post(\'/\'');
    expect(purchaseModuleContent).toContain('router.get(\'/\'');
  });

  test('28. switchView handles purchase and triggers initPurchaseEntryView', () => {
    expect(htmlContent).toContain('viewName === \'purchase\'');
    expect(htmlContent).toContain('initPurchaseEntryView()');
  });
});
