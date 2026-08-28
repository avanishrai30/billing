import { test, expect } from '@playwright/test';

const mockDashboardResponse = {
  success: true,
  metrics: {
    totalSales: 15000,
    netProfit: 4500,
    totalPurchases: 8000,
    franchiseEarnings: 0,
    stockAssetValuationCost: 35000,
    stockAssetValuationRetail: 55000,
    totalProducts: 10,
    ownProducts: 8,
    externalProducts: 2,
    lowStockCount: 1,
    outOfStockCount: 0,
    categoriesCount: 3,
    brandsCount: 2,
    suppliersCount: 2,
    expiryWarningsCount: 0,
    invoiceCount: 45,
    purchaseCount: 12
  },
  lowStockWatchlist: [],
  recentInvoices: [],
  recentPurchases: [],
  activeStoreId: 'all'
};

const mockProducts = [
  {
    id: 'prod-101',
    name: 'A2 Pure Cow Ghee 1L',
    sku: 'AIA-GHEE-1L',
    barcode: '8901234567890',
    price: 650,
    sellingPrice: 650,
    cost: 450,
    category: 'Dairy',
    unit: 'tin',
    gst: 5,
    stock: 25,
    status: 'active'
  },
  {
    id: 'prod-102',
    name: 'Farm Fresh Paneer 500g',
    sku: 'AIA-PAN-500',
    barcode: '8901234567891',
    price: 220,
    sellingPrice: 220,
    cost: 160,
    category: 'Dairy',
    unit: 'pack',
    gst: 5,
    stock: 40,
    status: 'active'
  }
];

const mockCustomers = [
  {
    id: 'cust-1',
    name: 'Rajesh Sharma',
    phone: '9822011223',
    email: 'rajesh@example.com'
  }
];

const mockStores = [
  { id: 'store-1', name: 'VC Flagship Outlet' }
];

test.describe('POS Phone-First Customer, Thermal Receipt & Return/Exchange Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiavro_jwt_token', 'mock-valid-token');
      localStorage.setItem(
        'aiavro_logged_in_user',
        JSON.stringify({
          id: 'usr-1',
          name: 'Super Admin',
          username: 'admin',
          role: 'SUPER ADMIN',
          category: 'super admin',
          assignedStoreId: 'all',
          status: 'active'
        })
      );
    });

    await page.route('**/api/v1/auth/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/v1/public/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'VC Organic Billing',
          logo: '/uploads/logos/brand-logo.webp'
        })
      });
    });

    await page.route('**/uploads/logos/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        )
      });
    });

    await page.route('**/api/v1/dashboard/metrics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardResponse)
      });
    });

    await page.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProducts)
      });
    });

    await page.route('**/api/v1/customers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCustomers)
      });
    });

    await page.route('**/api/v1/stores*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStores)
      });
    });
  });

  test('1. Phone-First Customer Input instantly resolves matching customer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    await page.getByRole('link', { name: 'POS Terminal' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();
    const cartPanel = page.getByTestId('pos-cart-panel').first();
    await expect(cartPanel).toBeVisible();

    const phoneInput = cartPanel.getByTestId('customer-phone-input');
    await expect(phoneInput).toBeVisible();

    // Type 9822011223
    await phoneInput.fill('9822011223');

    // Should resolve to Rajesh Sharma
    await expect(cartPanel.getByText('Rajesh Sharma')).toBeVisible();
    await expect(cartPanel.getByText('Verified Account')).toBeVisible();
  });

  test('2. Phone-First Customer Input allows unregistered walk-in continuation without modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    await page.getByRole('link', { name: 'POS Terminal' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();
    const cartPanel = page.getByTestId('pos-cart-panel').first();
    await expect(cartPanel).toBeVisible();

    const phoneInput = cartPanel.getByTestId('customer-phone-input');
    await expect(phoneInput).toBeVisible();

    // Type new phone number
    await phoneInput.fill('9988776655');

    // Shows inline Walk-in Customer with phone and optional name input
    await expect(cartPanel.getByText('New Customer (Walk-in)')).toBeVisible();
    const inlineName = cartPanel.getByPlaceholder(/customer name \(optional\)/i);
    await expect(inlineName).toBeVisible();

    await inlineName.fill('Vikram Malhotra');

    // Add item to cart
    const gheeCard = page.getByTestId('product-card-prod-101');
    const addGheeBtn = gheeCard.getByRole('button', { name: /add a2 pure cow ghee 1l to cart/i });
    await addGheeBtn.click();

    // Open Checkout
    const payBtn = cartPanel.getByRole('button', { name: /pay & settle/i });
    await payBtn.click();
    await expect(page.getByText('Vikram Malhotra', { exact: true })).toBeVisible();
  });

  test('3. Successful Sale triggers Auto-Print and displays Success Modal with Print Again', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    let checkoutBody: any = null;
    await page.route('**/api/v1/invoices*', async (route) => {
      if (route.request().method() === 'POST') {
        checkoutBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invoice: {
              ...checkoutBody,
              id: 'INV-2026-AUTO-1',
              invoiceNumber: 'INV-2026-AUTO-1',
              status: 'COMPLETED',
              createdAt: new Date().toISOString()
            }
          })
        });
      }
    });

    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    await page.getByRole('link', { name: 'POS Terminal' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();
    const cartPanel = page.getByTestId('pos-cart-panel').first();
    await expect(cartPanel).toBeVisible();

    // Add product to cart
    const gheeCard = page.getByTestId('product-card-prod-101');
    const addGheeBtn = gheeCard.getByRole('button', { name: /add a2 pure cow ghee 1l to cart/i });
    await addGheeBtn.click();

    // Proceed to Pay
    const payBtn = cartPanel.getByRole('button', { name: /pay & settle/i });
    await payBtn.click();

    // Submit Payment
    const paymentModal = page.getByRole('dialog');
    await expect(paymentModal).toBeVisible();
    const completeSaleBtn = paymentModal.getByRole('button', { name: /complete sale/i });
    await completeSaleBtn.click();

    // POS Success Modal appears
    await expect(page.getByText('Sale Completed Successfully')).toBeVisible();
    await expect(page.getByText('#INV-2026-AUTO-1', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /print again/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /new sale/i })).toBeVisible();
    expect(checkoutBody.receiptTemplateId).toBe('vc-organic-signature');
    expect(checkoutBody.receiptTemplate.paperWidthMm).toBe(80);
    expect(checkoutBody.items[0].sku).toBe('AIA-GHEE-1L');
    expect(checkoutBody.items[0].barcode).toBe('8901234567890');

    // Click View Receipt to verify receipt preview
    await page.getByRole('button', { name: /view receipt/i }).click();
    const receiptFrame = page.frameLocator('[data-testid="pos-receipt-preview-frame"]');
    await expect(receiptFrame.getByText('GRAND TOTAL', { exact: true })).toBeVisible();
    await expect(receiptFrame.getByText('Invoice # INV-2026-AUTO-1')).toBeVisible();
    await expect(receiptFrame.getByText('Rajesh Sharma')).not.toBeVisible();
    await expect(receiptFrame.getByText('9822011223')).not.toBeVisible();

    // Click New Sale resets the cart
    await page.getByRole('button', { name: /new sale/i }).click();
    await expect(page.getByText('Sale Completed Successfully')).not.toBeVisible();
  });

  test('4. Return Studio searches original sales by receipt number and processes return', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const originalInvoice = {
      id: 'INV-2026-RET-01',
      invoiceNumber: 'INV-2026-RET-01',
      customerId: 'cust-1',
      customerName: 'Rajesh Sharma',
      customerPhone: '9822011223',
      grandTotal: 1365,
      createdAt: '2026-08-20T10:00:00Z',
      items: [
        {
          productId: 'prod-101',
          name: 'A2 Pure Cow Ghee 1L',
          price: 650,
          sellingPrice: 650,
          quantity: 2,
          soldQuantity: 2,
          alreadyReturnedQuantity: 0,
          returnableQuantity: 2,
          gst: 5
        }
      ]
    };

    await page.route('**/api/v1/invoices/search-returns**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          invoices: [originalInvoice]
        })
      });
    });

    let returnBody: any = null;
    await page.route('**/api/v1/invoices/*/return', async (route) => {
      returnBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          return: {
            returnId: 'RET-2026-001',
            originalInvoiceNumber: 'INV-2026-RET-01',
            refundAmount: 682.5,
            refundMethod: 'CASH',
            returnedItems: returnBody.returnedItems
          }
        })
      });
    });

    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    await page.getByRole('link', { name: 'POS Terminal' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();

    // Open Return Studio
    const returnBtn = page.getByTestId('return-exchange-btn');
    await returnBtn.click();
    await expect(page.getByText('POS Return & Exchange Studio')).toBeVisible();

    // Search for original receipt
    const searchInput = page.getByPlaceholder(/search by receipt #/i);
    await searchInput.fill('INV-2026-RET-01');
    await page.getByRole('button', { name: /search sales/i }).click();

    // Select invoice
    await expect(page.getByText('#INV-2026-RET-01')).toBeVisible();
    await page.getByText(/select to return/i).click();

    // Increment return quantity to 1
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill('1');

    // Check refund total
    await expect(page.getByText('Total Return Credit')).toBeVisible();
    await expect(page.getByText('₹682.50', { exact: true })).toBeVisible();

    // Click Refund
    await page.getByRole('button', { name: /refund ₹682.50/i }).click();

    // Expect success message
    await expect(page.getByText(/Return #RET-2026-001 processed/i)).toBeVisible();
  });
});
