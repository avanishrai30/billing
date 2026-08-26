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
  },
  {
    id: 'prod-103',
    name: 'Artisan Sourdough Loaf',
    sku: 'AIA-BREAD-01',
    barcode: '8901234567892',
    price: 180,
    sellingPrice: 180,
    cost: 110,
    category: 'Bakery',
    unit: 'loaf',
    gst: 0,
    stock: 15,
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
  { id: 'store-1', name: 'VC Flagship Outlet' },
  { id: 'store-2', name: 'Bandra West Store' }
];

test.describe('Phase 6 POS Terminal Migration E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate
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

    await page.route('**/api/v1/invoices*', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invoice: {
              ...payload,
              id: `INV-${Date.now()}`,
              invoiceNumber: `INV-2026-${Date.now()}`,
              status: 'COMPLETED',
              createdAt: new Date().toISOString()
            }
          })
        });
      }
    });
  });

  test('1. Complete POS Terminal Lifecycle: Search, Filter, Cart Manipulations, Discount, Settlement, and Isolation', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Start on Dashboard
    await page.goto('/dashboard');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();

    // 2. Navigate to POS Terminal
    await page.getByRole('link', { name: 'POS Terminal' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();
    await expect(page.getByText('Current Sale Cart')).toBeVisible();
    await expect(page.getByText('Cart is Empty')).toBeVisible();

    // 3. Search Product
    const searchInput = page.getByPlaceholder(/search by product name, sku, or scan barcode/i);
    await searchInput.fill('Paneer');
    await expect(page.getByText('Farm Fresh Paneer 500g')).toBeVisible();
    await expect(page.getByText('Artisan Sourdough Loaf')).not.toBeVisible();

    // Clear search
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.getByText('Artisan Sourdough Loaf')).toBeVisible();

    // 4. Category Filter Switching
    await page.getByRole('tab', { name: 'Bakery' }).click();
    await expect(page.getByText('Artisan Sourdough Loaf')).toBeVisible();
    await expect(page.getByText('Farm Fresh Paneer 500g')).not.toBeVisible();

    await page.getByRole('tab', { name: 'All Products' }).click();
    await expect(page.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();

    // 5. Add Product to Cart
    const addGheeBtn = page.getByRole('button', { name: /add a2 pure cow ghee 1l to cart/i });
    await addGheeBtn.click();

    // Verify Cart item added
    const cartPanel = page.getByTestId('pos-cart-panel');
    await expect(cartPanel.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();
    const gheeCard = page.getByTestId('product-card-prod-101');
    await expect(gheeCard.getByText('1 in cart')).toBeVisible();

    // Add same product again using card stepper to verify quantity increments to 2
    const incGheeBtn = gheeCard.getByRole('button', { name: /increase quantity/i });
    await incGheeBtn.click();
    await expect(gheeCard.getByText('2 in cart')).toBeVisible();

    // Add another product (Paneer)
    const addPaneerBtn = page.getByRole('button', { name: /add farm fresh paneer 500g to cart/i });
    await addPaneerBtn.click();
    await expect(cartPanel.getByText('Farm Fresh Paneer 500g')).toBeVisible();

    // 6. Quantity Controls inside Cart
    // Increment Paneer
    const paneerCartItem = page.getByTestId('cart-item-prod-102');
    await paneerCartItem.getByRole('button', { name: /increase quantity/i }).click();
    await expect(paneerCartItem.getByText('2', { exact: true })).toBeVisible();

    // Decrement Paneer back to 1
    await paneerCartItem.getByRole('button', { name: /decrease quantity/i }).click();
    await expect(paneerCartItem.getByText('1', { exact: true })).toBeVisible();

    // Remove Paneer from Cart
    await paneerCartItem.getByRole('button', { name: /remove farm fresh paneer 500g from cart/i }).click();
    await expect(cartPanel.getByText('Farm Fresh Paneer 500g')).not.toBeVisible();

    // 7. Apply Cart Discount
    await page.getByText(/apply cart discount/i).click();
    await page.getByRole('button', { name: '₹50', exact: true }).click();

    // 8. Capture Visual Baseline Screenshot (1440x900)
    await page.screenshot({ path: 'test-results/desktop-pos.png', fullPage: true });

    // 9. Open Checkout / Settlement
    const payBtn = page.getByRole('button', { name: /pay & settle/i });
    await payBtn.click();

    const paymentModal = page.getByRole('dialog');
    await expect(paymentModal).toBeVisible();
    await expect(paymentModal.getByText(/pos settlement & checkout/i)).toBeVisible();

    // Select Payment Method: UPI / QR
    await paymentModal.getByText('UPI / QR').click();

    // Complete Checkout
    const confirmPayBtn = paymentModal.getByRole('button', { name: /complete sale/i });
    await confirmPayBtn.click();

    // Verify Cart is Reset
    await expect(cartPanel.getByText('Cart is Empty')).toBeVisible();

    // 10. Cross-Module Isolation: Navigate back to Dashboard and verify integrity
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /business intelligence & operational kpis/i })
    ).toBeVisible();
  });

  test('2. Mobile Responsive Viewport (430x932) has zero horizontal overflow and operational cart drawer', async ({
    page
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'POS Terminal' })).toBeVisible();

    // Verify Zero Horizontal Overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Add item to cart
    const addBtn = page.getByRole('button', { name: /add a2 pure cow ghee 1l to cart/i });
    await addBtn.click();

    // Open Mobile Cart Drawer
    await page.getByRole('button', { name: /view cart/i }).click();

    const cartDrawer = page.getByRole('dialog');
    await expect(cartDrawer).toBeVisible();
    await expect(cartDrawer.getByText('A2 Pure Cow Ghee 1L')).toBeVisible();

    // Capture Mobile Visual Baseline Screenshot (430x932)
    await page.screenshot({ path: 'test-results/mobile-pos.png', fullPage: true });

    // Close Drawer
    await page.getByLabel('Close drawer').click();
    await expect(cartDrawer).not.toBeVisible();
  });

  test('3. Large Catalog (100+ items) Split-Scroll: Independent Catalog Scroll, Sticky Search, and Fixed Cart Checkout Panel', async ({
    page
  }) => {
    // Generate 120 mock products
    const largeProductList = Array.from({ length: 120 }, (_, idx) => ({
      id: `prod-bulk-${idx + 1}`,
      name: `Catalog Item #${idx + 1} Organic Special Grain`,
      sku: `SKU-BULK-${1000 + idx}`,
      barcode: `89090000${1000 + idx}`,
      price: 45 + (idx % 10) * 5,
      sellingPrice: 45 + (idx % 10) * 5,
      cost: 30,
      category: idx % 3 === 0 ? 'Grains' : idx % 3 === 1 ? 'Spices' : 'Oils',
      unit: 'pack',
      gst: 5,
      stock: 50,
      status: 'active'
    }));

    await page.route('**/api/v1/products*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeProductList)
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');

    // 1. Verify First and Far Down items exist
    await expect(page.getByText('Catalog Item #1 Organic Special Grain')).toBeVisible();

    // Verify Desktop Viewport does NOT scroll vertically at document level
    const pageScrollMetrics = await page.evaluate(() => ({
      documentScrollHeight: document.documentElement.scrollHeight,
      windowInnerHeight: window.innerHeight,
      documentScrollTop: document.documentElement.scrollTop
    }));
    expect(pageScrollMetrics.documentScrollHeight).toBeLessThanOrEqual(pageScrollMetrics.windowInnerHeight + 5);

    // 2. Add Item #1 to Cart
    const firstCard = page.getByTestId('product-card-prod-bulk-1');
    const addBtn = firstCard.getByRole('button', { name: /add catalog item #1 organic special grain to cart/i });
    await addBtn.click();

    // Verify stepper appears on card with quantity 1
    await expect(firstCard.getByText('1 in cart')).toBeVisible();

    // Increment via stepper
    await firstCard.getByRole('button', { name: /increase quantity/i }).click();
    await expect(firstCard.getByText('2 in cart')).toBeVisible();

    // Decrement via stepper back to 1
    await firstCard.getByRole('button', { name: /decrease quantity/i }).click();
    await expect(firstCard.getByText('1 in cart')).toBeVisible();

    // Verify Catalog Scroll Container owns the vertical scroll
    const catalogScrollContainer = page.getByTestId('pos-product-scroll');
    const scrollInfoBefore = await catalogScrollContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop
    }));
    expect(scrollInfoBefore.scrollHeight).toBeGreaterThan(scrollInfoBefore.clientHeight);

    // Scroll catalog down
    await catalogScrollContainer.evaluate((el) => {
      el.scrollTop = 500;
    });

    const scrollInfoAfter = await catalogScrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollInfoAfter).toBeGreaterThan(0);

    // 3. Scroll catalog area down to Item #50
    const catalogItem50 = page.getByText('Catalog Item #50 Organic Special Grain');
    await catalogItem50.scrollIntoViewIfNeeded();
    await expect(catalogItem50).toBeVisible();

    // 4. Verify Search & Category Bar remains visible (fixed toolbar) while scrolled
    const searchInput = page.getByPlaceholder(/search by product name, sku, or scan barcode/i);
    await expect(searchInput).toBeVisible();
    const allTab = page.getByRole('tab', { name: 'All Products' });
    await expect(allTab).toBeVisible();

    // 5. Verify Right Cart Panel and Pay & Settle button remain fully visible (pinned/fixed)
    const cartPanel = page.getByTestId('pos-cart-panel');
    await expect(cartPanel).toBeVisible();
    const payBtn = page.getByRole('button', { name: /pay & settle/i });
    await expect(payBtn).toBeVisible();

    // 6. Test search filter while scrolled
    await searchInput.fill('Item #100');
    await expect(page.getByText('Catalog Item #100 Organic Special Grain')).toBeVisible();
    await expect(catalogItem50).not.toBeVisible();

    // 7. Add 10 different products to cart to verify internal cart scrolling
    await page.getByRole('button', { name: /clear search/i }).click();
    for (let i = 2; i <= 12; i++) {
      const card = page.getByTestId(`product-card-prod-bulk-${i}`);
      const btn = card.getByRole('button', { name: new RegExp(`add catalog item #${i}`, 'i') });
      await btn.click();
    }

    // Verify Cart Panel header and Pay & Settle are still visible even with 12 items
    await expect(cartPanel.getByText('Current Sale Cart')).toBeVisible();
    await expect(payBtn).toBeVisible();

    // Capture Visual Screenshot of large catalog split scroll
    await page.screenshot({ path: 'test-results/desktop-pos-split-pane.png', fullPage: true });
  });
});
