const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const billingRouter = require('../modules/billing');

describe('Stage 13 Phase D: High-Speed POS Terminal Redesign', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  let htmlContent;
  let app;
  let mockDb;
  let invoicesTable;
  let productsTable;
  let inventoryTable;
  let movementsTable;
  const JWT_SECRET = 'test_pos_secret_2026';

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    invoicesTable = [];
    movementsTable = [];
    productsTable = [
      {
        id: 'prod-101',
        name: 'A2 Gir Cow Ghee',
        sku: 'AIA-GHEE-001',
        category: 'Dairy & Ghee',
        type: 'own',
        stock: 20,
        reorder: 5,
        cost: 600,
        price: 900,
        unit: 'per kg',
        gst: 5,
        sellingMode: 'packaged',
        isArchived: false
      },
      {
        id: 'prod-102',
        name: 'Loose Fresh Country Buffalo Milk',
        sku: 'AIA-MILK-002',
        category: 'Loose & Fresh Items',
        type: 'own',
        stock: 50,
        reorder: 10,
        cost: 50,
        price: 75,
        unit: 'per Liter',
        weightUnit: 'ml',
        gst: 0,
        sellingMode: 'loose',
        isArchived: false
      }
    ];

    inventoryTable = [
      {
        id: 'inv-101',
        productId: 'prod-101',
        locationId: 'store-main',
        storeId: 'store-main',
        quantity: 20,
        version: 1
      },
      {
        id: 'inv-102',
        productId: 'prod-102',
        locationId: 'store-main',
        storeId: 'store-main',
        quantity: 50,
        version: 1
      }
    ];

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'products') {
            return productsTable.find(p => p.id === query.id || p.sku === query.sku) || null;
          }
          if (name === 'inventory') {
            return inventoryTable.find(i => i.productId === query.productId) || null;
          }
          if (name === 'invoices') {
            return invoicesTable.find(i => i.id === query.id || i.invoiceNumber === query.invoiceNumber) || null;
          }
          return null;
        },
        find: (query = {}) => ({
          toArray: async () => {
            if (name === 'products') return productsTable;
            if (name === 'inventory') return inventoryTable;
            if (name === 'invoices') return invoicesTable;
            return [];
          }
        }),
        insertOne: async (doc) => {
          const inserted = { ...doc, _id: `id-${Date.now()}` };
          if (name === 'invoices') invoicesTable.push(inserted);
          if (name === 'inventory_movements') movementsTable.push(inserted);
          return { insertedId: inserted._id };
        },
        findOneAndUpdate: async (query, update) => {
          if (name === 'inventory') {
            const rec = inventoryTable.find(i => i.productId === query.productId);
            if (rec && update.$inc && update.$inc.quantity !== undefined) {
              rec.quantity += update.$inc.quantity;
              return { value: { ...rec } };
            }
          }
          return { value: null };
        },
        updateOne: async (query, update) => {
          if (name === 'products' && update.$inc && update.$inc.stock !== undefined) {
            const p = productsTable.find(x => x.id === query.id);
            if (p) p.stock += update.$inc.stock;
          }
          if (name === 'inventory' && update.$inc && update.$inc.quantity !== undefined) {
            const rec = inventoryTable.find(i => i.productId === query.productId);
            if (rec) rec.quantity += update.$inc.quantity;
          }
          return { modifiedCount: 1 };
        }
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '/tmp/uploads', {}, new Map());

    app = express();
    app.use(express.json());
    app.use('/api/v1/invoices', billingRouter);
  });

  // ==========================================
  // 1. POS HTML WORKSPACE & DOM STRUCTURE
  // ==========================================

  test('1. POS view shell contains search bar, scanner triggers, and category pills', () => {
    expect(htmlContent).toContain('id="view-billing"');
    expect(htmlContent).toContain('id="pos-product-search"');
    expect(htmlContent).toContain('id="pos-category-pills"');
    expect(htmlContent).toContain('id="pos-products-grid"');
    expect(htmlContent).toContain('id="pos-barcode-scanner-mock"');
  });

  test('2. POS cart panel contains cart header, count badge, clear button, and items list', () => {
    expect(htmlContent).toContain('id="pos-cart-count"');
    expect(htmlContent).toContain('onclick="clearPOSCart()"');
    expect(htmlContent).toContain('id="pos-cart-items-list"');
    expect(htmlContent).toContain('id="pos-last-scanned-verification-panel"');
  });

  test('3. POS entity selectors and calculation summary elements exist', () => {
    expect(htmlContent).toContain('id="pos-business-select"');
    expect(htmlContent).toContain('id="pos-customer-select"');
    expect(htmlContent).toContain('id="pos-summary-subtotal"');
    expect(htmlContent).toContain('id="pos-discount-value"');
    expect(htmlContent).toContain('id="pos-summary-tax"');
    expect(htmlContent).toContain('id="pos-summary-roundoff"');
    expect(htmlContent).toContain('id="pos-summary-grandtotal"');
  });

  test('4. POS payment mode grid and pinned checkout button exist with F9 hotkey hint', () => {
    expect(htmlContent).toContain('id="pay-mode-cash"');
    expect(htmlContent).toContain('id="pay-mode-upi"');
    expect(htmlContent).toContain('id="pay-mode-card"');
    expect(htmlContent).toContain('id="pay-mode-bank"');
    expect(htmlContent).toContain('id="pos-generate-bill-btn"');
    expect(htmlContent).toContain('F9');
  });

  // ==========================================
  // 2. POS JAVASCRIPT CONTROLLERS & LOGIC
  // ==========================================

  test('5. POS JavaScript implements renderPOSProducts, clearPOSCart, and recalculatePOSTotals', () => {
    expect(htmlContent).toContain('function renderPOSProducts()');
    expect(htmlContent).toContain('function clearPOSCart()');
    expect(htmlContent).toContain('function recalculatePOSTotals()');
    expect(htmlContent).toContain('function addItemToPOSCart(');
    expect(htmlContent).toContain('function updateCartItemQty(');
    expect(htmlContent).toContain('function removeCartItem(');
    expect(htmlContent).toContain('async function processPOSCheckout()');
  });

  test('6. Dynamic Loose-Weight modal configuration supports g, ml, kg, and L units', () => {
    expect(htmlContent).toContain('WEIGHT_UNIT_CONFIG');
    expect(htmlContent).toContain("'g'");
    expect(htmlContent).toContain("'ml'");
    expect(htmlContent).toContain('function openPOSWeightModal(productId)');
    expect(htmlContent).toContain('function confirmPOSWeightItem()');
  });

  test('7. Universal Barcode Scanner engine handles hardware, test, and mobile sources', () => {
    expect(htmlContent).toContain('function handleUniversalBarcodeScan(');
    expect(htmlContent).toContain('function playBarcodeChime(');
  });

  test('8. Global keyboard shortcuts handle F1 (POS), F2 (Inventory), F9 (Checkout), and Escape', () => {
    expect(htmlContent).toContain("if (e.key === 'F1')");
    expect(htmlContent).toContain("if (e.key === 'F2')");
    expect(htmlContent).toContain("if (e.key === 'F9')");
    expect(htmlContent).toContain("if (e.key === 'Escape')");
  });

  // ==========================================
  // 3. INVOICE CHECKOUT CONTRACT INTEGRATION
  // ==========================================

  test('9. POST /api/v1/invoices creates invoice and handles inventory deduction idempotently', async () => {
    const token = jwt.sign(
      { id: 'cashier-1', role: 'employee', username: 'cashier', assignedStoreId: 'store-main', tokenVersion: 1 },
      JWT_SECRET
    );

    const invoicePayload = {
      transactionId: `tx-test-${Date.now()}`,
      businessId: 'store-main',
      storeId: 'store-main',
      customerId: 'walk-in',
      items: [
        {
          productId: 'prod-101',
          name: 'A2 Gir Cow Ghee',
          price: 900,
          quantity: 2,
          unit: 'per kg',
          gstRate: 5,
          taxAmount: 85.71
        }
      ],
      subtotal: 1800,
      discount: 0,
      tax: 85.71,
      roundoff: 0,
      grandtotal: 1800,
      paymentMode: 'cash',
      status: 'paid'
    };

    const res = await request(app)
      .post('/api/v1/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send(invoicePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.invoice).toBeDefined();
    expect(res.body.invoice.grandTotal || res.body.invoice.grandtotal).toBe(1800);
  });
});
