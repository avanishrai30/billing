const bulkImportService = require('../services/bulkImportService');
const { setupContext } = require('../modules/context');

describe('Stage 09: Intelligent Bulk Import Engine', () => {

  describe('1. Header Normalization & Alias Mapping', () => {
    test('1. Normalizes headers with BOM, spaces, case, underscores, and hyphens', () => {
      expect(bulkImportService.cleanHeaderKey('\uFEFFProduct Name')).toBe('productname');
      expect(bulkImportService.cleanHeaderKey('Item_Description')).toBe('itemdescription');
      expect(bulkImportService.cleanHeaderKey('BUYING-PRICE')).toBe('buyingprice');
      expect(bulkImportService.cleanHeaderKey('  Selling Price (INR)  ')).toBe('sellingpriceinr');
      expect(bulkImportService.cleanHeaderKey('Opening_Stock_Qty')).toBe('openingstockqty');
    });

    test('2. Matches common aliases to canonical fields', () => {
      expect(bulkImportService.detectCanonicalField('Item Description')).toBe('productName');
      expect(bulkImportService.detectCanonicalField('Particulars')).toBe('productName');
      expect(bulkImportService.detectCanonicalField('Product / Service')).toBe('productName');
      expect(bulkImportService.detectCanonicalField('Buying Price')).toBe('purchasePrice');
      expect(bulkImportService.detectCanonicalField('Cost Price')).toBe('purchasePrice');
      expect(bulkImportService.detectCanonicalField('Sale Price')).toBe('sellingPrice');
      expect(bulkImportService.detectCanonicalField('MRP')).toBe('sellingPrice');
      expect(bulkImportService.detectCanonicalField('Qty')).toBe('openingStock');
      expect(bulkImportService.detectCanonicalField('Opening Stock')).toBe('openingStock');
      expect(bulkImportService.detectCanonicalField('Outlet')).toBe('store');
      expect(bulkImportService.detectCanonicalField('EAN')).toBe('barcode');
      expect(bulkImportService.detectCanonicalField('Item Code')).toBe('sku');
      expect(bulkImportService.detectCanonicalField('Product Type')).toBe('type');
    });

    test('3. Auto-maps spreadsheet headers', () => {
      const headers = ['Item Description', 'Barcode', 'Category', 'Buying Price', 'Selling Price', 'Qty', 'Outlet'];
      const mapping = bulkImportService.autoMapHeaders(headers);

      expect(mapping['Item Description']).toBe('productName');
      expect(mapping['Barcode']).toBe('barcode');
      expect(mapping['Category']).toBe('category');
      expect(mapping['Buying Price']).toBe('purchasePrice');
      expect(mapping['Selling Price']).toBe('sellingPrice');
      expect(mapping['Qty']).toBe('openingStock');
      expect(mapping['Outlet']).toBe('store');
    });

    test('4. Correctly normalizes a single raw row object', () => {
      const rawRow = {
        'Item Description': 'A2 Gir Cow Ghee 500ml',
        'Barcode': '8901234567001',
        'Buying Price': '650.00',
        'Selling Price': '850.00',
        'Qty': '25',
        'GST': '5',
        'Type': 'OWN'
      };

      const normalized = bulkImportService.normalizeRowData(rawRow);
      expect(normalized.productName).toBe('A2 Gir Cow Ghee 500ml');
      expect(normalized.barcode).toBe('8901234567001');
      expect(normalized.sku).toBe('8901234567001');
      expect(normalized.purchasePrice).toBe(650);
      expect(normalized.sellingPrice).toBe(850);
      expect(normalized.openingStock).toBe(25);
      expect(normalized.gst).toBe(5);
      expect(normalized.type).toBe('OWN');
    });
  });

  describe('2. Validation, Classification & Conflict Detection (Simulation / Preview)', () => {
    let mockDb;
    let productsCollection;
    let barcodesCollection;
    let storesCollection;

    beforeEach(() => {
      productsCollection = [
        { id: 'prd-101', name: 'Organic Cow Ghee', sku: 'SKU-GHEE-1', barcode: '8901111111111', purchasePrice: 500, sellingPrice: 700 },
        { id: 'prd-102', name: 'Mustard Oil 1L', sku: 'SKU-OIL-1', barcode: '8902222222222', purchasePrice: 150, sellingPrice: 220 }
      ];

      barcodesCollection = [
        { barcode: '8901111111111', productId: 'prd-101' },
        { barcode: '8902222222222', productId: 'prd-102' }
      ];

      storesCollection = [
        { id: 'store-blr-1', name: 'Banaswadi Store' },
        { id: 'store-blr-2', name: 'Indiranagar Store' }
      ];

      mockDb = {
        collection: (name) => ({
          findOne: async (query) => {
            if (name === 'products') {
              if (query.id) return productsCollection.find(p => p.id === query.id) || null;
              if (query.barcode) return productsCollection.find(p => p.barcode === query.barcode) || null;
              if (query.sku) return productsCollection.find(p => p.sku === query.sku) || null;
              if (query.name && query.name.$regex) {
                return productsCollection.find(p => query.name.$regex.test(p.name)) || null;
              }
              return null;
            }
            if (name === 'product_barcodes') {
              if (query.barcode) return barcodesCollection.find(b => b.barcode === query.barcode) || null;
              return null;
            }
            if (name === 'stores') {
              if (query.$or) {
                const idVal = query.$or[0].id;
                const nameRegex = query.$or[1].name?.$regex;
                return storesCollection.find(s => s.id === idVal || (nameRegex && nameRegex.test(s.name))) || null;
              }
              return null;
            }
            if (name === 'businesses') return null;
            return null;
          }
        })
      };
    });

    test('5. Correctly classifies brand new product as NEW', async () => {
      const rows = [
        { 'Name': 'Fresh Paneer 250g', 'Barcode': '8903333333333', 'Cost': 80, 'Price': 120, 'Stock': 10 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.totalRows).toBe(1);
      expect(preview.summary.newRows).toBe(1);
      expect(preview.rows[0].classification).toBe('NEW');
      expect(preview.rows[0].status).toBe('READY');
      expect(preview.rows[0].normalizedData.productName).toBe('Fresh Paneer 250g');
    });

    test('6. Correctly matches existing product by exact Barcode', async () => {
      const rows = [
        { 'Name': 'Organic Cow Ghee', 'Barcode': '8901111111111', 'Cost': 500, 'Price': 700, 'Stock': 5 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.existingRows).toBe(1);
      expect(preview.rows[0].classification).toBe('EXISTING');
      expect(preview.rows[0].normalizedData.matchedProductId).toBe('prd-101');
    });

    test('7. Detects price change on existing product and classifies as UPDATE', async () => {
      const rows = [
        { 'Name': 'Organic Cow Ghee', 'Barcode': '8901111111111', 'Cost': 550, 'Price': 750, 'Stock': 5 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.existingRows).toBe(1);
      expect(preview.rows[0].classification).toBe('UPDATE');
      expect(preview.rows[0].warnings.some(w => w.code === 'PRICE_CHANGE')).toBe(true);
    });

    test('8. Rejects cross-product conflict when barcode belongs to product A but SKU belongs to product B', async () => {
      const rows = [
        { 'Name': 'Conflicting Item', 'Barcode': '8901111111111', 'SKU': 'SKU-OIL-1', 'Cost': 100, 'Price': 200 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.conflictRows).toBe(1);
      expect(preview.rows[0].status).toBe('CONFLICT');
      expect(preview.rows[0].issues.some(i => i.code === 'SKU_CROSS_PRODUCT_CONFLICT')).toBe(true);
    });

    test('9. Flags intra-batch duplicate barcode within spreadsheet as INVALID', async () => {
      const rows = [
        { 'Name': 'Item 1', 'Barcode': '8909999999999', 'Cost': 100, 'Price': 200 },
        { 'Name': 'Item 2', 'Barcode': '8909999999999', 'Cost': 150, 'Price': 250 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.invalidRows).toBe(1);
      expect(preview.rows[1].status).toBe('INVALID');
      expect(preview.rows[1].issues.some(i => i.code === 'DUPLICATE_BARCODE_IN_BATCH')).toBe(true);
    });

    test('10. Does NOT silently merge product with similar name under a new barcode', async () => {
      const rows = [
        { 'Name': 'Organic Cow Ghee', 'Barcode': '8907777777777', 'Cost': 500, 'Price': 700 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.newRows).toBe(1);
      expect(preview.rows[0].classification).toBe('NEW');
      expect(preview.rows[0].warnings.some(w => w.code === 'POSSIBLE_NAME_MATCH')).toBe(true);
    });

    test('11. Resolves store location to store ID when store name is provided', async () => {
      const rows = [
        { 'Name': 'Fresh Butter', 'Barcode': '8908888888888', 'Cost': 200, 'Price': 280, 'Stock': 15, 'Outlet': 'Banaswadi Store' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.rows[0].normalizedData.resolvedLocationId).toBe('store-blr-1');
    });

    test('12. Enforces ADD_NEW_ONLY strategy by skipping existing products', async () => {
      const rows = [
        { 'Name': 'Organic Cow Ghee', 'Barcode': '8901111111111', 'Cost': 500, 'Price': 700 },
        { 'Name': 'New Item', 'Barcode': '8905555555555', 'Cost': 50, 'Price': 100 }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows, { strategy: 'ADD_NEW_ONLY' });
      expect(preview.rows[0].status).toBe('SKIPPED');
      expect(preview.rows[1].status).toBe('READY');
      expect(preview.summary.readyRows).toBe(1);
    });
  });

  describe('3. Transactional Batch Commit & Authoritative Inventory Integration', () => {
    let mockDb;
    let productsTable;
    let inventoryLedgerTable;
    let importSessionsTable;
    let inventoryTable;

    beforeEach(() => {
      productsTable = new Map();
      inventoryLedgerTable = [];
      importSessionsTable = new Map();
      inventoryTable = new Map();

      mockDb = {
        collection: (name) => ({
          findOne: async (query) => {
            if (name === 'import_sessions') return importSessionsTable.get(query.importId) || null;
            if (name === 'products') return productsTable.get(query.id || query.sku) || null;
            if (name === 'product_barcodes') return null;
            if (name === 'inventory') {
              const key = `${query.productId}_${query.locationId}`;
              return inventoryTable.get(key) || null;
            }
            return null;
          },
          findOneAndUpdate: async (filter, update, opts = {}) => {
            const key = `${filter.productId}_${filter.locationId}`;
            let current = inventoryTable.get(key) || {
              productId: filter.productId,
              locationId: filter.locationId,
              quantity: 0,
              reservedQuantity: 0
            };
            if (update.$inc) {
              current.quantity += (update.$inc.quantity || 0);
            }
            if (update.$set) {
              Object.assign(current, update.$set);
            }
            inventoryTable.set(key, current);
            return current;
          },
          updateOne: async (query, update, opts = {}) => {
            if (name === 'import_sessions') {
              const current = importSessionsTable.get(query.importId) || {};
              const setFields = update.$set || {};
              const insertFields = update.$setOnInsert || {};
              importSessionsTable.set(query.importId, { ...insertFields, ...current, ...setFields });
            }
            if (name === 'products') {
              const current = productsTable.get(query.id) || {};
              const setFields = update.$set || {};
              const insertFields = update.$setOnInsert || {};
              productsTable.set(query.id, { ...insertFields, ...current, ...setFields });
            }
          },
          insertOne: async (doc) => {
            if (name === 'inventory_ledger') {
              inventoryLedgerTable.push(doc);
            }
          },
          deleteMany: async () => ({ deletedCount: 0 }),
          insertMany: async () => ({ insertedCount: 0 }),
          find: () => ({
            toArray: async () => []
          })
        })
      };

      setupContext(mockDb, null, 'secret', '', {}, {});
    });

    test('13. Commits new product and writes opening stock to Authoritative Inventory via InventoryService', async () => {
      const validatedRows = [
        {
          rowNumber: 1,
          status: 'READY',
          classification: 'NEW',
          normalizedData: {
            productName: 'A2 Gir Cow Milk 1L',
            sku: 'SKU-MILK-1',
            barcode: '8901234567890',
            purchasePrice: 60,
            sellingPrice: 90,
            openingStock: 40,
            resolvedLocationId: 'store-blr-1',
            type: 'OWN',
            unit: '1L',
            gst: 0
          }
        }
      ];

      const result = await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-test-001',
        validatedRows,
        { defaultLocationId: 'store-blr-1' },
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(result.summary.imported).toBe(1);
      expect(result.summary.inventoryMovements).toBe(1);

      // Verify Product Master document
      const savedProducts = Array.from(productsTable.values());
      expect(savedProducts.length).toBe(1);
      expect(savedProducts[0].name).toBe('A2 Gir Cow Milk 1L');
      expect(savedProducts[0].sku).toBe('SKU-MILK-1');
      expect(savedProducts[0].sellingPrice).toBe(90);
      expect(savedProducts[0].purchasePrice).toBe(60);
      expect(savedProducts[0].type).toBe('OWN');
    });

    test('14. Idempotency: Reject duplicate execution of already completed importId', async () => {
      importSessionsTable.set('imp-dup-test', {
        importId: 'imp-dup-test',
        status: 'COMPLETED',
        summary: { imported: 5, updated: 0 }
      });

      const result = await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-dup-test',
        [],
        {},
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.summary.imported).toBe(5);
    });

    test('15. Skips invalid and conflict rows during commit without crashing valid rows', async () => {
      const validatedRows = [
        {
          rowNumber: 1,
          status: 'INVALID',
          classification: 'INVALID',
          issues: [{ message: 'Missing product name' }],
          normalizedData: { productName: '', barcode: '8900000000001' }
        },
        {
          rowNumber: 2,
          status: 'READY',
          classification: 'NEW',
          normalizedData: {
            productName: 'Valid Honey 500g',
            sku: 'SKU-HONEY-1',
            barcode: '8900000000002',
            purchasePrice: 200,
            sellingPrice: 350,
            openingStock: 10,
            resolvedLocationId: 'store-blr-1'
          }
        }
      ];

      const result = await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-partial-test',
        validatedRows,
        { defaultLocationId: 'store-blr-1' },
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.summary.skipped).toBe(1);
      expect(result.summary.imported).toBe(1);
    });
  });
});
