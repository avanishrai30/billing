const fs = require('fs');
const path = require('path');

describe('Stage 13 Phase H: Customer + Supplier CRM Redesign', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  const customerApiPath = path.join(__dirname, '..', 'frontend-api', 'customers.js');
  const supplierApiPath = path.join(__dirname, '..', 'frontend-api', 'suppliers.js');
  const customerModulePath = path.join(__dirname, '..', 'modules', 'customers.js');
  const supplierModulePath = path.join(__dirname, '..', 'modules', 'suppliers.js');

  let html;
  let customerApi;
  let supplierApi;
  let customerModule;
  let supplierModule;

  beforeAll(() => {
    html = fs.readFileSync(htmlPath, 'utf8');
    customerApi = fs.readFileSync(customerApiPath, 'utf8');
    supplierApi = fs.readFileSync(supplierApiPath, 'utf8');
    customerModule = fs.readFileSync(customerModulePath, 'utf8');
    supplierModule = fs.readFileSync(supplierModulePath, 'utf8');
  });

  test('1. customer list workspace exposes a dense relationship table', () => {
    expect(html).toContain('id="crm-customer-panel"');
    expect(html).toContain('id="customers-table-body"');
    expect(html).toContain('Customer Directory');
    expect(html).toContain('Transactions');
    expect(html).toContain('Last Activity');
    expect(customerApi).toContain("'/api/v1/customers'");
  });

  test('2. customer pagination is bounded to the authorized CRM result set', () => {
    expect(html).toContain('customerPage: 1');
    expect(html).toContain('pageSize: 25');
    expect(html).toContain('id="customer-prev-page"');
    expect(html).toContain("changeCRMPage('customers', -1)");
    expect(html).toContain('function paginateCRMRows(rows, page)');
  });

  test('3. customer filters support search, store context, status, and page reset', () => {
    expect(html).toContain('id="customer-search"');
    expect(html).toContain('id="customer-filter-store"');
    expect(html).toContain('id="customer-filter-status"');
    expect(html).toContain('function scheduleCustomerCRMRender()');
    expect(html).toContain("filterCRMRows(state.customers, search, storeId, status, 'customer')");
  });

  test('4. customer detail drawer shows identity, contact, store context, status, and invoice links', () => {
    expect(html).toContain('id="customer-detail-drawer"');
    expect(html).toContain('function openCustomerDetailDrawer(id)');
    expect(html).toContain('Recent invoices for customer');
    expect(html).toContain("openInvoiceDetailDrawer('${escapeHTML(n.invoiceNumber)}')");
    expect(html).toContain('View Invoices');
  });

  test('5. customer create and edit flow uses the frozen customer save endpoint', () => {
    expect(html).toContain('id="customer-modal"');
    expect(html).toContain('function openCustomerModal(id = null)');
    expect(html).toContain('async function saveCustomerForm(e)');
    expect(html).toContain('api.customers.save(cust)');
    expect(html).toContain('upsertCRMCustomer(result.customer || cust)');
    expect(html).toMatch(/id="cust-form-address" placeholder="Address, City, State"(?! required)/);
  });

  test('6. supplier list workspace exposes vendor contact and purchase activity columns', () => {
    expect(html).toContain('id="crm-supplier-panel"');
    expect(html).toContain('id="suppliers-table-body"');
    expect(html).toContain('Supplier Directory');
    expect(html).toContain('Purchase Activity');
    expect(html).toContain('Store / Context');
    expect(supplierApi).toContain("'/api/v1/suppliers'");
  });

  test('7. supplier pagination is independent from customer pagination', () => {
    expect(html).toContain('supplierPage: 1');
    expect(html).toContain('id="supplier-prev-page"');
    expect(html).toContain("changeCRMPage('suppliers', -1)");
    expect(html).toContain('renderSuppliersTable()');
  });

  test('8. supplier filters support search, store context, status, and page reset', () => {
    expect(html).toContain('id="supplier-search"');
    expect(html).toContain('id="supplier-filter-store"');
    expect(html).toContain('id="supplier-filter-status"');
    expect(html).toContain('function scheduleSupplierCRMRender()');
    expect(html).toContain("filterCRMRows(state.suppliers, search, storeId, status, 'supplier')");
  });

  test('9. supplier detail drawer shows identity, contact, store context, status, and purchase links', () => {
    expect(html).toContain('id="supplier-detail-drawer"');
    expect(html).toContain('function openSupplierDetailDrawer(id)');
    expect(html).toContain('Recent purchases for supplier');
    expect(html).toContain("openPurchaseDetailDrawer('${escapeHTML(n.id)}')");
    expect(html).toContain('View Purchases');
  });

  test('10. supplier create and edit flow requires only backend-required fields', () => {
    expect(html).toContain('id="supplier-modal"');
    expect(html).toContain('function openSupplierModal(id = null)');
    expect(html).toContain('async function saveSupplierForm(e)');
    expect(html).toContain('api.suppliers.save(supplierData)');
    expect(html).toContain('Please fill in supplier name and contact number.');
    expect(html).toMatch(/id="sup-form-address" placeholder="Address, City, State"(?! required)/);
  });

  test('11. store context is visible while backend RBAC remains authoritative', () => {
    expect(html).toContain('id="crm-current-store-label"');
    expect(html).toContain('function populateCRMStoreDropdown(selectId)');
    expect(html).toContain('assignedStoreId');
    expect(customerModule).toContain("requirePermission('customers.view')");
    expect(supplierModule).toContain("requirePermission('suppliers.view')");
  });

  test('12. transaction navigation reuses existing invoice, purchase, and POS workspaces', () => {
    expect(html).toContain('function createSaleForCustomer(customerId)');
    expect(html).toContain("switchView('billing')");
    expect(html).toContain('function viewInvoicesForCustomer(customerId)');
    expect(html).toContain('loadInvoiceWorkspacePage(1)');
    expect(html).toContain('function viewPurchasesForSupplier(supplierId)');
    expect(html).toContain('loadPurchaseWorkspacePage(1)');
  });

  test('13. realtime CRM updates are incremental and preserve the active workspace', () => {
    expect(html).toContain('function upsertCRMCustomer(customer)');
    expect(html).toContain('function upsertCRMSupplier(supplier)');
    expect(html).toContain("syncSocket.on('customer_updated'");
    expect(html).toContain("syncSocket.on('supplier_updated'");
    expect(customerModule).toContain("emit('customer_updated'");
    expect(supplierModule).toContain("emit('supplier_updated'");
  });

  test('14. CRM error states distinguish actual backend failure classes', () => {
    expect(html).toContain('function mapCRMError(err)');
    expect(html).toContain('INVALID_INPUT');
    expect(html).toContain('FORBIDDEN');
    expect(html).toContain('STORE_ACCESS_DENIED');
    expect(html).toContain('SESSION_EXPIRED');
    expect(html).toContain('NETWORK_ERROR');
  });

  test('15. loading and empty states avoid seeded placeholder CRM records', () => {
    expect(html).toContain('Loading customers...');
    expect(html).toContain('Loading suppliers...');
    expect(html).toContain('No customers found.');
    expect(html).toContain('No suppliers found.');
    expect(html).toContain('No invoices for customer.');
    expect(html).toContain('No purchases for supplier.');
  });

  test('16. Phase H does not introduce fake customer, supplier, or transaction data', () => {
    const phaseHStart = html.indexOf('PHASE H CUSTOMER + SUPPLIER CRM');
    const phaseHEnd = html.indexOf('/* ==================== POS BILLING TERMINAL', phaseHStart);
    const phaseHArea = html.slice(phaseHStart, phaseHEnd);
    expect(phaseHArea).not.toContain('DEFAULT_CUSTOMER');
    expect(phaseHArea).not.toContain('sampleCustomer');
    expect(phaseHArea).not.toContain('sampleSupplier');
    expect(phaseHArea).not.toContain('fake customer');
    expect(phaseHArea).not.toContain('fake supplier');
    expect(phaseHArea).not.toContain('fake invoice');
    expect(phaseHArea).not.toContain('fake purchase');
  });
});
