const bulkImportService = require('../services/bulkImportService');

describe('Stage 09 Patch: Empty Barcode Unique Index Collision & Normalization', () => {
  let mockDb;
  let productsTable;
  let barcodesTable;

  beforeEach(() => {
    productsTable = new Map();
    barcodesTable = new Map();

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'products') {
            for (const p of productsTable.values()) {
              if (query.id && p.id === query.id) return p;
              if (query.sku && p.sku === query.sku) return p;
              if (query.barcode && p.barcode && p.barcode === query.barcode) return p;
            }
            return null;
          }
          if (name === 'product_barcodes') {
            for (const b of barcodesTable.values()) {
              if (query.barcode && b.barcode === query.barcode) return b;
            }
            return null;
          }
          return null;
        },
        updateOne: async (filter, update, options) => {
          if (name === 'products') {
            let doc = productsTable.get(filter.id);
            if (!doc && options && options.upsert) {
              doc = { id: filter.id };
            }
            if (doc) {
              if (update.$set) {
                // Mimic MongoDB sparse unique index behavior:
                // If barcode is an empty string, throw duplicate key error if another document also has barcode: ""
                if (update.$set.barcode === '') {
                  for (const [otherId, otherDoc] of productsTable.entries()) {
                    if (otherId !== filter.id && otherDoc.barcode === '') {
                      const err = new Error('E11000 duplicate key error collection: vc_organic.products index: barcode_1 dup key: { barcode: "" }');
                      err.code = 11000;
                      throw err;
                    }
                  }
                }
                Object.assign(doc, update.$set);
              }
              if (update.$unset) {
                for (const k of Object.keys(update.$unset)) {
                  delete doc[k];
                }
              }
              productsTable.set(filter.id, doc);
            }
          }
        },
        deleteMany: async () => ({ deletedCount: 0 }),
        insertMany: async (items) => {
          if (name === 'product_barcodes') {
            for (const item of items) {
              barcodesTable.set(item.barcode, item);
            }
          }
        },
        insertOne: async (doc) => {
          if (name === 'import_sessions') return { insertedId: doc.importId };
          if (name === 'audit_logs') return { insertedId: 'aud-1' };
        }
      })
    };
  });

  test('1, 2, 3 & 4. Multiple products with missing, empty, or whitespace barcodes can coexist without duplicate barcode collision', async () => {
    const rawRows = [
      { 'Item Name': 'PINK POWDER SALT', 'Selling Price': 40, 'Purchase Price': 25, 'Barcode': '' },
      { 'Item Name': 'CASTROL OIL 1L', 'Selling Price': 450, 'Purchase Price': 380, 'Barcode': '   ' },
      { 'Item Name': 'KORALE MILLETS 500G', 'Selling Price': 85, 'Purchase Price': 60 } // missing Barcode column
    ];

    const mapping = {
      'Item Name': 'productName',
      'Selling Price': 'sellingPrice',
      'Purchase Price': 'purchasePrice',
      'Barcode': 'barcode'
    };

    // 1. Preview
    const preview = await bulkImportService.validateAndPreview(mockDb, rawRows, {
      columnMapping: mapping,
      defaultLocationId: 'store-1'
    });

    const safeCount = preview.summary.readyRows + preview.summary.warningRows;
    expect(safeCount).toBe(3);
    for (const row of preview.rows) {
      expect(row.normalizedData.barcode).toBeNull();
      // Has warning that barcode was not supplied
      expect(row.warnings.some(w => w.field === 'barcode' && w.code === 'BARCODE_OPTIONAL')).toBe(true);
    }

    // 2. Commit
    const commitResult = await bulkImportService.commitImport(
      mockDb,
      null,
      'imp-test-empty-barcodes',
      preview.rows,
      { defaultLocationId: 'store-1' },
      { id: 'usr-1', username: 'admin' },
      null
    );

    expect(commitResult.success).toBe(true);
    expect(commitResult.summary.imported).toBe(3);

    // Verify all 3 products were saved in DB without barcode field (omitted)
    const stored = Array.from(productsTable.values());
    expect(stored.length).toBe(3);
    for (const p of stored) {
      expect(p.barcode).toBeUndefined(); // Omitted!
    }
  });

  test('5. Duplicate real barcode within import or database is still rejected', async () => {
    const rawRows = [
      { 'Item Name': 'Ghee 1L Jar A', 'Selling Price': 850, 'Barcode': '8901234567890' },
      { 'Item Name': 'Ghee 1L Jar B', 'Selling Price': 850, 'Barcode': '8901234567890' }
    ];

    const preview = await bulkImportService.validateAndPreview(mockDb, rawRows, {
      columnMapping: { 'Item Name': 'productName', 'Selling Price': 'sellingPrice', 'Barcode': 'barcode' }
    });

    expect(preview.summary.blockedRows).toBe(1);
    const blockedRow = preview.rows.find(r => r.status === 'BLOCKED');
    expect(blockedRow).toBeDefined();
    expect(blockedRow.blockReasons.some(b => b.code === 'DUPLICATE_BARCODE_IN_BATCH')).toBe(true);
  });

  test('6. Existing product with valid barcode preserves its barcode when incoming row has blank barcode', async () => {
    // Pre-populate product with valid barcode
    productsTable.set('prd-existing-ghee', {
      id: 'prd-existing-ghee',
      name: 'Organic Desi Ghee 1L',
      sku: 'SKU-GHEE-001',
      barcode: '8901112223334',
      sellingPrice: 800,
      purchasePrice: 650
    });

    const updateRows = [
      { 'Item Name': 'Organic Desi Ghee 1L', 'SKU': 'SKU-GHEE-001', 'Selling Price': 820, 'Barcode': '' }
    ];

    const preview = await bulkImportService.validateAndPreview(mockDb, updateRows, {
      columnMapping: { 'Item Name': 'productName', 'SKU': 'sku', 'Selling Price': 'sellingPrice', 'Barcode': 'barcode' }
    });

    expect(preview.rows[0].classification).toBe('UPDATE');
    expect(preview.rows[0].normalizedData.matchedProductId).toBe('prd-existing-ghee');

    await bulkImportService.commitImport(
      mockDb,
      null,
      'imp-test-preserve-barcode',
      preview.rows,
      {},
      { id: 'usr-1', username: 'admin' },
      null
    );

    const updatedProduct = productsTable.get('prd-existing-ghee');
    expect(updatedProduct.sellingPrice).toBe(820);
    // Real barcode MUST be preserved, not overwritten with blank/null!
    expect(updatedProduct.barcode).toBe('8901112223334');
  });

  test('7. No product_barcodes record is created when product has no barcode', async () => {
    const rawRows = [
      { 'Item Name': 'Loose Rice 1kg', 'Selling Price': 60, 'Barcode': '' }
    ];

    const preview = await bulkImportService.validateAndPreview(mockDb, rawRows, {
      columnMapping: { 'Item Name': 'productName', 'Selling Price': 'sellingPrice', 'Barcode': 'barcode' }
    });

    await bulkImportService.commitImport(
      mockDb,
      null,
      'imp-test-no-barcode-table',
      preview.rows,
      {},
      { id: 'usr-1', username: 'admin' },
      null
    );

    expect(barcodesTable.size).toBe(0);
  });

  test('8. Full HEMA-style spreadsheet import with multiple unbarcoded items succeeds cleanly', async () => {
    const hemaRows = [
      { 'SL NO': 1, 'PRODUCT NAME': 'A2 COW MILK', 'PRICE': 90, 'QTY': 50 },
      { 'SL NO': 2, 'PRODUCT NAME': 'BUFFALO MILK', 'PRICE': 80, 'QTY': 40 },
      { 'SL NO': 3, 'PRODUCT NAME': 'ORGANIC PANEER', 'PRICE': 350, 'QTY': 20 },
      { 'SL NO': 4, 'PRODUCT NAME': 'COUNTRY EGGS 6PK', 'PRICE': 75, 'QTY': 30 }
    ];

    const preview = await bulkImportService.validateAndPreview(mockDb, hemaRows, {
      defaultLocationId: 'store-hema'
    });

    const safeCount = preview.summary.readyRows + preview.summary.warningRows;
    expect(safeCount).toBe(4);

    const commitResult = await bulkImportService.commitImport(
      mockDb,
      null,
      'imp-hema-clean-run',
      preview.rows,
      { defaultLocationId: 'store-hema' },
      { id: 'usr-1', username: 'admin' },
      null
    );

    expect(commitResult.success).toBe(true);
    expect(commitResult.summary.imported).toBe(4);
    expect(productsTable.size).toBe(4);
  });
});
