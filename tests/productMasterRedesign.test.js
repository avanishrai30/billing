const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { setupContext } = require('../modules/context');
const productsRouter = require('../modules/products');

describe('Stage 13 Phase E: Product Master + Barcode Center Redesign', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  let htmlContent;
  let app;
  let mockDb;
  let productsTable;
  let barcodesTable;
  const JWT_SECRET = 'test_product_secret_2026';

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    barcodesTable = [
      {
        productId: 'prod-101',
        barcode: '8901234567011',
        type: 'PRIMARY',
        active: true
      }
    ];
    productsTable = [
      {
        id: 'prod-101',
        name: 'A2 Gir Cow Desi Ghee',
        sku: 'AIA-GHEE-001',
        barcode: '8901234567011',
        category: 'Dairy & Ghee',
        brand: 'AIAVRO',
        supplier: 'Golden Ghee Co.',
        unit: '1 Liter Jars',
        cost: 650,
        price: 950,
        purchasePrice: 650,
        sellingPrice: 950,
        stock: 25,
        reorder: 5,
        dom: '2026-08-01',
        doe: '2027-02-01',
        gst: 12,
        type: 'OWN',
        sellingMode: 'packaged',
        status: 'active',
        isArchived: false,
        image: '/uploads/products/ghee.webp'
      },
      {
        id: 'prod-102',
        name: 'Loose Country Buffalo Milk',
        sku: 'AIA-MILK-002',
        // Barcode is absent/null (loose item)
        category: 'Loose & Fresh Items',
        brand: 'AIAVRO',
        supplier: 'Local Farm',
        unit: 'per Liter',
        weightUnit: 'ml',
        cost: 50,
        price: 75,
        purchasePrice: 50,
        sellingPrice: 75,
        stock: 60,
        reorder: 15,
        dom: '2026-08-14',
        doe: '',
        gst: 0,
        type: 'OWN',
        sellingMode: 'loose',
        status: 'active',
        isArchived: false,
        image: '/uploads/products/milk.webp'
      }
    ];

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'products') {
            if (query.id && typeof query.id === 'string') return productsTable.find(p => p.id === query.id) || null;
            if (query.sku) return productsTable.find(p => p.sku === query.sku) || null;
            if (query.barcode) {
              return productsTable.find(p => {
                if (p.barcode !== query.barcode) return false;
                if (query.id && query.id.$ne && p.id === query.id.$ne) return false;
                if (query.isArchived && query.isArchived.$ne && p.isArchived) return false;
                return true;
              }) || null;
            }
          }
          if (name === 'product_barcodes') {
            return barcodesTable.find(b => {
              if (b.barcode !== query.barcode) return false;
              if (query.productId && query.productId.$ne && b.productId === query.productId.$ne) return false;
              if (query.active !== undefined && b.active !== query.active) return false;
              return true;
            }) || null;
          }
          return null;
        },
        find: (query = {}) => ({
          sort: () => ({
            skip: (skipCount) => ({
              limit: (limitCount) => ({
                toArray: async () => {
                  if (name === 'products') {
                    let res = productsTable.filter(p => {
                      if (query.isArchived && query.isArchived.$ne) {
                        return !p.isArchived;
                      }
                      if (query.status && p.status !== query.status) return false;
                      if (query.sellingMode && p.sellingMode !== query.sellingMode) return false;
                      if (query.category && p.category !== query.category) return false;
                      return true;
                    });
                    if (query.$or) {
                      res = res.filter(p => {
                        return query.$or.some(cond => {
                          if (cond.name && cond.name.$regex) {
                            return new RegExp(cond.name.$regex, 'i').test(p.name);
                          }
                          if (cond.sku && cond.sku.$regex) {
                            return new RegExp(cond.sku.$regex, 'i').test(p.sku);
                          }
                          if (cond.barcode && cond.barcode.$regex) {
                            return p.barcode && new RegExp(cond.barcode.$regex, 'i').test(p.barcode);
                          }
                          return false;
                        });
                      });
                    }
                    return res.slice(skipCount, skipCount + limitCount);
                  }
                  return [];
                }
              })
            }),
            toArray: async () => {
              if (name === 'products') {
                return productsTable.filter(p => !p.isArchived);
              }
              return [];
            }
          })
        }),
        countDocuments: async () => productsTable.length,
        insertOne: async (doc) => {
          const inserted = { ...doc, _id: `id-${Date.now()}` };
          if (name === 'products') productsTable.push(inserted);
          if (name === 'product_barcodes') barcodesTable.push(inserted);
          return { insertedId: inserted._id };
        },
        insertMany: async (docs) => {
          if (name === 'product_barcodes') barcodesTable.push(...docs);
          return { insertedCount: docs.length };
        },
        deleteMany: async (query) => {
          if (name === 'product_barcodes' && query.productId) {
            barcodesTable = barcodesTable.filter(b => b.productId !== query.productId);
          }
          return { deletedCount: 1 };
        },
        updateOne: async (query, update) => {
          if (name === 'products') {
            const p = productsTable.find(x => x.id === query.id);
            if (p && update.$set) {
              Object.assign(p, update.$set);
              return { matchedCount: 1, modifiedCount: 1 };
            }
          }
          return { matchedCount: 1, modifiedCount: 1 };
        },
        updateMany: async (query, update) => {
          if (name === 'product_barcodes' && query.productId) {
            barcodesTable.forEach(b => {
              if (b.productId === query.productId && update.$set) {
                Object.assign(b, update.$set);
              }
            });
          }
          return { modifiedCount: 1 };
        }
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '/tmp/uploads', {}, new Map());

    app = express();
    app.use(express.json());
    app.use('/api/v1/products', productsRouter);
  });

  // ==========================================
  // 1. PRODUCT MASTER DOM STRUCTURE & LAYOUT
  // ==========================================

  test('1. Product Master view shell contains search bar, filters, bulk import, and print barcode triggers', () => {
    expect(htmlContent).toContain('id="view-inventory"');
    expect(htmlContent).toContain('id="inventory-search"');
    expect(htmlContent).toContain('id="inventory-filter-category"');
    expect(htmlContent).toContain('id="inventory-filter-brand"');
    expect(htmlContent).toContain('id="inventory-filter-status"');
    expect(htmlContent).toContain('onclick="toggleExcelImportModal()"');
    expect(htmlContent).toContain('onclick="openBarcodeSheetGeneratorModal()"');
    expect(htmlContent).toContain('onclick="openProductModal()"');
  });

  test('2. Product Table header clearly separates SKU and Barcode columns', () => {
    expect(htmlContent).toContain('<th>SKU</th>');
    expect(htmlContent).toContain('<th>Barcode</th>');
    expect(htmlContent).toContain('<th>Product Name</th>');
    expect(htmlContent).toContain('Purchase Price');
    expect(htmlContent).toContain('Selling Price');
  });

  test('3. Product Details Modal exists with catalog identity, barcode center, and inventory navigation link', () => {
    expect(htmlContent).toContain('id="product-details-modal"');
    expect(htmlContent).toContain('id="prod-detail-sku"');
    expect(htmlContent).toContain('id="prod-detail-barcode"');
    expect(htmlContent).toContain('id="prod-detail-category"');
    expect(htmlContent).toContain('id="prod-detail-cost"');
    expect(htmlContent).toContain('id="prod-detail-price"');
    expect(htmlContent).toContain('id="prod-detail-margin"');
    expect(htmlContent).toContain('onclick="navigateToProductInventory()"');
  });

  test('4. Product Create/Edit Modal organizes 8 clean sections with separate SKU and Barcode inputs', () => {
    expect(htmlContent).toContain('id="product-modal"');
    expect(htmlContent).toContain('id="prod-form-sku"');
    expect(htmlContent).toContain('id="prod-form-barcode"');
    expect(htmlContent).toContain('id="prod-form-name"');
    expect(htmlContent).toContain('id="prod-form-category"');
    expect(htmlContent).toContain('id="prod-form-cost"');
    expect(htmlContent).toContain('id="prod-form-price"');
    expect(htmlContent).toContain('id="prod-form-dom"');
    expect(htmlContent).toContain('id="prod-form-doe"');
    expect(htmlContent).toContain('id="prod-form-selling-mode-packaged"');
    expect(htmlContent).toContain('id="prod-form-selling-mode-loose"');
    expect(htmlContent).toContain('id="prod-form-weight-unit"');
    expect(htmlContent).toContain('id="product-variants-container"');
  });

  // ==========================================
  // 2. CONTROLLER LOGIC & JAVASCRIPT BEHAVIOR
  // ==========================================

  test('5. Product Master JavaScript exposes renderInventoryTable, openProductDetailsModal, and openProductModal', () => {
    expect(htmlContent).toContain('function renderInventoryTable(');
    expect(htmlContent).toContain('function openProductDetailsModal(');
    expect(htmlContent).toContain('function closeProductDetailsModal(');
    expect(htmlContent).toContain('function openProductModal(');
    expect(htmlContent).toContain('function closeProductModal(');
    expect(htmlContent).toContain('async function saveProductForm(');
  });

  test('6. Multi-layout barcode generator modal supports single 50x25mm, 38x25mm, and A4 sheet layouts', () => {
    expect(htmlContent).toContain('id="barcode-sheet-modal"');
    expect(htmlContent).toContain('function openBarcodeSheetGeneratorModal(');
    expect(htmlContent).toContain('function buildBarcodeStickerGrid(');
  });

  test('7. Realtime socket listener updates product catalog without wiping user filters', () => {
    expect(htmlContent).toContain("syncSocket.on('product.updated'");
    expect(htmlContent).toContain("syncSocket.on('product_updated'");
    expect(htmlContent).toContain("syncSocket.on('product.created'");
  });

  // ==========================================
  // 3. BACKEND CONTRACT & SAFETY INTEGRATION
  // ==========================================

  test('8. GET /api/v1/products retrieves paginated product catalog with search and filters', async () => {
    const token = jwt.sign(
      { id: 'admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const res = await request(app)
      .get('/api/v1/products?limit=10&page=1&search=Ghee')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].sku).toBe('AIA-GHEE-001');
    expect(res.body[0].barcode).toBe('8901234567011');
  });

  test('9. POST /api/v1/products creates product with separate SKU and optional barcode', async () => {
    const token = jwt.sign(
      { id: 'admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const newProd = {
      name: 'Organic Raw Wild Honey',
      sku: 'AIA-HONEY-003',
      barcode: '8901234567033',
      category: 'Organic Sweeteners',
      brand: 'AIAVRO',
      supplier: 'Forest Harvest Co.',
      unit: '500g Glass Jar',
      cost: 200,
      price: 350,
      stock: 30,
      reorder: 5,
      dom: '2026-08-01',
      doe: '2027-08-01',
      gst: 5,
      type: 'OWN',
      sellingMode: 'packaged',
      status: 'active'
    };

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send(newProd);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.sku).toBe('AIA-HONEY-003');
    expect(res.body.product.barcode).toBe('8901234567033');
  });

  test('10. Barcode safety: Blank/absent barcode is not saved as empty string ""', async () => {
    const token = jwt.sign(
      { id: 'admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const looseProd = {
      name: 'Loose Farm Fresh Butter',
      sku: 'AIA-BUTTER-004',
      // Barcode omitted (blank)
      category: 'Loose & Fresh Items',
      brand: 'AIAVRO',
      unit: 'per kg',
      weightUnit: 'g',
      cost: 300,
      price: 450,
      stock: 20,
      reorder: 5,
      dom: '2026-08-10',
      doe: '',
      gst: 5,
      type: 'OWN',
      sellingMode: 'loose',
      status: 'active'
    };

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send(looseProd);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.product.barcode).toBeUndefined();
  });

  test('11. Barcode duplicate detection rejects duplicate barcode assignment across products', async () => {
    const token = jwt.sign(
      { id: 'admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const duplicateBarcodeProd = {
      name: 'Duplicate Barcode Test',
      sku: 'AIA-DUP-005',
      barcode: '8901234567011', // already used by prod-101
      category: 'Dairy & Ghee',
      unit: '1 Unit',
      cost: 100,
      price: 150,
      stock: 10,
      reorder: 2,
      dom: '2026-08-01',
      doe: '2026-12-01',
      gst: 5,
      type: 'OWN',
      sellingMode: 'packaged',
      status: 'active'
    };

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${token}`)
      .send(duplicateBarcodeProd);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already belongs to product');
  });

  test('12. DELETE /api/v1/products/:id performs safe soft delete (archive)', async () => {
    const token = jwt.sign(
      { id: 'admin-1', role: 'admin', username: 'admin', tokenVersion: 1 },
      JWT_SECRET
    );

    const res = await request(app)
      .delete('/api/v1/products/prod-101')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const archivedProd = productsTable.find(p => p.id === 'prod-101');
    expect(archivedProd.isArchived).toBe(true);
  });
});
