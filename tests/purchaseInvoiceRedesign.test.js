const fs = require('fs');
const path = require('path');

describe('Stage 13 Phase G: Purchases + Sales Invoices Workspace Redesign', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  const purchasesApiPath = path.join(__dirname, '..', 'frontend-api', 'purchases.js');
  const invoicesApiPath = path.join(__dirname, '..', 'frontend-api', 'invoices.js');
  const purchasesModulePath = path.join(__dirname, '..', 'modules', 'purchases.js');
  const invoicesModulePath = path.join(__dirname, '..', 'modules', 'billing.js');

  let html;
  let purchasesApi;
  let invoicesApi;
  let purchasesModule;
  let invoicesModule;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
    purchasesApi = fs.readFileSync(purchasesApiPath, 'utf8');
    invoicesApi = fs.readFileSync(invoicesApiPath, 'utf8');
    purchasesModule = fs.readFileSync(purchasesModulePath, 'utf8');
    invoicesModule = fs.readFileSync(invoicesModulePath, 'utf8');
  });

  test('1. purchase list pagination uses the existing paginated purchases API', () => {
    expect(html).toContain('function loadPurchaseWorkspacePage(page = 1)');
    expect(html).toContain('api.purchases.listWithPagination(params)');
    expect(purchasesApi).toContain('async listWithPagination(params = {})');
    expect(purchasesModule).toContain('pagination:');
    expect(purchasesModule).toContain('limit = Math.min(100');
  });

  test('2. purchase filters expose search, supplier, store, status, and date range controls', () => {
    expect(html).toContain('id="purchase-search"');
    expect(html).toContain('id="purchase-filter-supplier"');
    expect(html).toContain('id="purchase-filter-store"');
    expect(html).toContain('id="purchase-filter-status"');
    expect(html).toContain('id="purchase-filter-from-date"');
    expect(html).toContain('id="purchase-filter-to-date"');
    expect(html).toContain('function getPurchaseQueryParams(page)');
  });

  test('3. purchase detail drawer displays supplier, store, reference, date, items, totals, status, created by, and void status', () => {
    expect(html).toContain('id="purchase-detail-drawer"');
    expect(html).toContain('function openPurchaseDetailDrawer(purchaseId)');
    expect(html).toContain('Supplier');
    expect(html).toContain('Created By');
    expect(html).toContain('Void status');
    expect(html).toContain('Purchase Total');
  });

  test('4. purchase creation UI follows store, supplier, product, quantity, cost, review, save flow', () => {
    expect(html).toContain('id="purchase-form-drawer"');
    expect(html).toContain('id="purchase-store-select"');
    expect(html).toContain('id="purchase-supplier-select"');
    expect(html).toContain('id="purchase-barcode-scanner"');
    expect(html).toContain('id="purchase-invoice-sheet-body"');
    expect(html).toContain('id="purchase-review-store"');
    expect(html).toContain('id="purchase-submit-btn"');
  });

  test('5. duplicate purchase submission prevention locks the form while backend idempotency handles retries', () => {
    expect(html).toContain('purchaseWorkspaceState.submitLocked');
    expect(html).toContain('if (purchaseWorkspaceState.submitLocked) return');
    expect(html).toContain('transactionId: refId');
    expect(html).toContain('result.duplicate');
  });

  test('6. purchase void authorization uses existing permission and backend delete endpoint', () => {
    expect(html).toContain("canUserPerformFinanceAction('purchases.void', 'purchase')");
    expect(html).toContain('async function confirmVoidPurchaseFromDrawer()');
    expect(html).toContain('api.purchases.delete(purchaseId)');
    expect(purchasesModule).toContain("requirePermission('purchases.void')");
    expect(purchasesModule).toContain('revertStockBatch');
  });

  test('7. invoice list pagination uses the existing paginated invoice API', () => {
    expect(html).toContain('function loadInvoiceWorkspacePage(page = 1)');
    expect(html).toContain('api.invoices.listWithPagination(params)');
    expect(invoicesApi).toContain('async listWithPagination(params = {})');
    expect(invoicesModule).toContain('pagination:');
    expect(invoicesModule).toContain('limit = Math.min(100');
  });

  test('8. invoice filters expose search, customer, store, status, payment, and date range controls', () => {
    expect(html).toContain('id="invoice-search"');
    expect(html).toContain('id="invoice-filter-customer"');
    expect(html).toContain('id="invoice-filter-store"');
    expect(html).toContain('id="invoice-filter-status"');
    expect(html).toContain('id="invoice-filter-payment"');
    expect(html).toContain('function getInvoiceQueryParams(page)');
  });

  test('9. invoice detail drawer displays invoice metadata, items, totals, payment, and status', () => {
    expect(html).toContain('id="invoice-detail-drawer"');
    expect(html).toContain('function openInvoiceDetailDrawer(invoiceId)');
    expect(html).toContain('Invoice Grand Total');
    expect(html).toContain('Payment Mode');
    expect(html).toContain('Financial hierarchy');
  });

  test('10. invoice print handoff preserves existing 58mm, A4, and PDF functions', () => {
    expect(html).toContain("openInvoicePrintFromDrawer('receipt58')");
    expect(html).toContain("openInvoicePrintFromDrawer('a4')");
    expect(html).toContain('downloadServerInvoicePDF()');
    expect(html).toContain('setInvoicePrintFormat(currentInvoicePrintFormat)');
    expect(invoicesApi).toContain('async getPdf(id)');
  });

  test('11. invoice void authorization uses existing backend invoice void endpoint', () => {
    expect(html).toContain("canUserPerformFinanceAction('invoices.void', 'refunds')");
    expect(html).toContain('async function confirmVoidInvoiceFromDrawer()');
    expect(html).toContain('api.invoices.void(invoiceId)');
    expect(invoicesModule).toContain("requirePermission('invoices.void')");
    expect(invoicesModule).toContain('revertStockBatch');
  });

  test('12. realtime purchase update preserves page state with incremental row updates', () => {
    expect(html).toContain('function upsertRealtimePurchaseRow(purchase)');
    expect(html).toContain('function markRealtimePurchaseVoided(purchaseId)');
    expect(html).toContain("syncSocket.on('purchase_created'");
    expect(html).toContain("syncSocket.on('purchase_deleted'");
  });

  test('13. realtime invoice update preserves page state with incremental row updates', () => {
    expect(html).toContain('function upsertRealtimeInvoiceRow(invoice)');
    expect(html).toContain('function markRealtimeInvoiceVoided(invoiceId)');
    expect(html).toContain("syncSocket.on('invoice_created'");
    expect(html).toContain("syncSocket.on('invoice_voided'");
  });

  test('14. store scope is exposed in UI and remains backend-authoritative', () => {
    expect(html).toContain('id="purchase-current-store-label"');
    expect(html).toContain('id="invoice-current-store-label"');
    expect(html).toContain('function populateFinanceStoreDropdown');
    expect(purchasesModule).toContain('requireStoreScope');
    expect(invoicesModule).toContain('getStoreScopeFilter');
  });

  test('15. error states differentiate backend codes without generic-only messaging', () => {
    expect(html).toContain('function mapFinanceError(err)');
    expect(html).toContain('STORE_ACCESS_DENIED');
    expect(html).toContain('SESSION_EXPIRED');
    expect(html).toContain('INSUFFICIENT_STOCK');
    expect(html).toContain('PURCHASE_ALREADY_VOIDED');
    expect(html).toContain('TRANSACTION_ALREADY_VOIDED');
  });

  test('16. no fake data is added by Phase G workspace', () => {
    const phaseGArea = html.slice(html.indexOf('Stage 13 Phase G'));
    expect(phaseGArea).not.toContain('DEFAULT_PURCHASE');
    expect(phaseGArea).not.toContain('samplePurchase');
    expect(phaseGArea).not.toContain('fake invoice');
    expect(phaseGArea).not.toContain('fake inventory');
    expect(phaseGArea).not.toContain('placeholder records');
  });
});
