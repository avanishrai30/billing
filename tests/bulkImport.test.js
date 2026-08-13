const bulkImportService = require('../services/bulkImportService');
const { setupContext } = require('../modules/context');

describe('Stage 09: Intelligent File Understanding & Flexible Product Import', () => {

  describe('1. Multi-Row Header Extraction & Normalization', () => {
    test('1. Extracts 2-row hierarchical header from HEMA reference structure', () => {
      const matrix = [
        ['SL.No', 'Products', '', '', '', 'PURCHASE'],
        ['', '', 'WEIGHT', 'COST', 'QTY', ''],
        ['1', 'SESAME OIL', '1 LTR', '459', '3', '350'],
        ['2', 'MUSTARD OIL', '1LTR', '339', '3', '250']
      ];

      const extracted = bulkImportService.extractHeadersAndRowsFromMatrix(matrix);
      expect(extracted.isMultiRow).toBe(true);
      expect(extracted.headers).toContain('Products');
      expect(extracted.headers).toContain('WEIGHT');
      expect(extracted.headers).toContain('COST');
      expect(extracted.headers).toContain('QTY');
      expect(extracted.headers).toContain('PURCHASE');
      expect(extracted.rows.length).toBe(2);
      expect(extracted.rows[0]['Products']).toBe('SESAME OIL');
      expect(extracted.rows[0]['WEIGHT']).toBe('1 LTR');
    });

    test('2. Extracts standard single-row header matrix', () => {
      const matrix = [
        ['Product Name', 'Barcode', 'Selling Price', 'Cost Price', 'Qty'],
        ['A2 Cow Ghee 500ml', '8901234567890', '750', '550', '10']
      ];

      const extracted = bulkImportService.extractHeadersAndRowsFromMatrix(matrix);
      expect(extracted.isMultiRow).toBe(false);
      expect(extracted.rows.length).toBe(1);
      expect(extracted.rows[0]['Product Name']).toBe('A2 Cow Ghee 500ml');
    });

    test('3. Handles BOM character and cleans header keys', () => {
      expect(bulkImportService.cleanHeaderKey('\uFEFFProduct Name')).toBe('productname');
      expect(bulkImportService.cleanHeaderKey('  Item_Description (INR)  ')).toBe('itemdescriptioninr');
    });
  });

  describe('2. Data Profiling & Safe Derivations', () => {
    test('4. Safe weight & unit derivation from volume/weight strings', () => {
      const ltr = bulkImportService.parseWeightAndUnit('1 LTR');
      expect(ltr).toEqual({ weight: 1, weightUnit: 'L', unit: '1L' });

      const ml = bulkImportService.parseWeightAndUnit('500 ML');
      expect(ml).toEqual({ weight: 500, weightUnit: 'ml', unit: '500ml' });

      const kg = bulkImportService.parseWeightAndUnit('1KG');
      expect(kg).toEqual({ weight: 1, weightUnit: 'kg', unit: '1kg' });

      const g = bulkImportService.parseWeightAndUnit('250g');
      expect(g).toEqual({ weight: 250, weightUnit: 'g', unit: '250g' });
    });

    test('5. Profiles column data candidates based on sample values', () => {
      const weightProfile = bulkImportService.profileColumnData(['1 LTR', '1LTR', '500 ML', '250g']);
      expect(weightProfile.type).toBe('WEIGHT_UNIT');

      const nameProfile = bulkImportService.profileColumnData(['SESAME OIL', 'MUSTARD OIL', 'GROUNDNUT OIL']);
      expect(nameProfile.type).toBe('PRODUCT_NAME_CANDIDATE');

      const qtyProfile = bulkImportService.profileColumnData(['3', '3', '5', '10', '2']);
      expect(qtyProfile.type).toBe('QUANTITY_CANDIDATE');
    });
  });

  describe('3. Smart Field Mapping with Confidence & Ambiguity Handling', () => {
    test('6. Detects smart field mapping and flags ambiguous "PURCHASE" header as REVIEW_REQUIRED candidate', () => {
      const headers = ['Products', 'WEIGHT', 'COST', 'QTY', 'PURCHASE'];
      const sampleRows = [
        { 'Products': 'SESAME OIL', 'WEIGHT': '1 LTR', 'COST': '459', 'QTY': '3', 'PURCHASE': '350' }
      ];

      const detection = bulkImportService.detectSmartFieldMapping(headers, sampleRows);
      expect(detection.mapping['Products']).toBe('productName');
      expect(detection.mapping['WEIGHT']).toBe('unit');
      expect(detection.mapping['COST']).toBe('purchasePrice');
      expect(detection.mapping['QTY']).toBe('openingStock');
      expect(detection.mapping['PURCHASE']).toBe('sellingPrice');
      expect(detection.fieldExplanations['PURCHASE'].confidence).toBe('MEDIUM');
      expect(detection.fieldExplanations['PURCHASE'].state).toBe('AMBIGUOUS');
    });

    test('7. Ignores unused/unknown columns without invalidating sheet', () => {
      const headers = ['Products', 'COST', 'PURCHASE', 'Random Internal Notes', 'Employee Shift'];
      const sampleRows = [
        { 'Products': 'Sunflower Oil', 'COST': '100', 'PURCHASE': '150', 'Random Internal Notes': 'Note 1', 'Employee Shift': 'Morning' }
      ];

      const detection = bulkImportService.detectSmartFieldMapping(headers, sampleRows);
      expect(detection.mapping['Random Internal Notes']).toBe('ignore');
      expect(detection.mapping['Employee Shift']).toBe('ignore');
      expect(detection.fieldExplanations['Random Internal Notes'].state).toBe('IGNORED');
    });
  });

  describe('4. Simulation Preview & Flexible Business Rules', () => {
    let mockDb;
    let productsCollection;

    beforeEach(() => {
      productsCollection = [
        { id: 'prd-exist-1', name: 'Existing Mustard Oil', sku: 'SKU-MUSTARD-1', barcode: '8901111111111', sellingPrice: 200, purchasePrice: 150 }
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
              if (query.barcode) {
                const p = productsCollection.find(p => p.barcode === query.barcode);
                return p ? { barcode: p.barcode, productId: p.id } : null;
              }
              return null;
            }
            if (name === 'stores') return { id: 'store-blr-1', name: 'Main Store' };
            return null;
          }
        })
      };
    });

    test('8. HEMA.xlsx full structure preview runs cleanly with 0 Missing Product Name errors', async () => {
      const hemaMatrix = [
        ['SL.No', 'Products', '', '', '', 'PURCHASE'],
        ['', '', 'WEIGHT', 'COST', 'QTY', ''],
        ['1', 'SESAME OIL', '1 LTR', '459', '3', '350'],
        ['2', 'MUSTARD OIL', '1LTR', '339', '3', '250'],
        ['3', 'GROUNDNUT OIL', '500 ML', '180', '5', '140'],
        ['4', 'COCONUT OIL', '1 LTR', '350', '2', '280'],
        ['5', 'SUNFLOWER OIL', '1 LTR', '180', '4', '150'],
        ['6', 'CASTOR OIL', '200 ML', '120', '2', '90'],
        ['7', 'ALMOND OIL', '100 ML', '250', '1', '200']
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, hemaMatrix, { defaultStore: 'store-blr-1' });

      expect(preview.success).toBe(true);
      expect(preview.summary.totalRows).toBe(7);
      expect(preview.summary.blockedRows).toBe(0);
      expect(preview.summary.warningRows).toBe(7);
      expect((preview.summary.readyRows + preview.summary.warningRows)).toBe(7);

      // Verify row 1 safe derivations
      const row1 = preview.rows[0];
      expect(row1.status).toBe('WARNING');
      expect(row1.normalizedData.productName).toBe('SESAME OIL');
      expect(row1.normalizedData.unit).toBe('1L');
      expect(row1.normalizedData.weight).toBe(1);
      expect(row1.normalizedData.weightUnit).toBe('L');
      expect(row1.normalizedData.purchasePrice).toBe(459);
      expect(row1.normalizedData.openingStock).toBe(3);
    });

    test('9. Missing Product Name on EXISTING product SKU is allowed and inherits catalog name', async () => {
      const rows = [
        { 'Barcode': '8901111111111', 'Cost': '160', 'Price': '220', 'Stock': '5' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.blockedRows).toBe(0);
      expect(preview.rows[0].status).toBe('WARNING');
      expect(preview.rows[0].normalizedData.productName).toBe('Existing Mustard Oil');
      expect(preview.rows[0].warnings.some(w => w.code === 'INHERITED_EXISTING_NAME')).toBe(true);
    });

    test('10. Missing Product Name on NEW product BLOCKS row with clear reason', async () => {
      const rows = [
        { 'Barcode': '8909999999999', 'Cost': '100', 'Price': '150' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.blockedRows).toBe(1);
      expect(preview.rows[0].status).toBe('BLOCKED');
      expect(preview.rows[0].blockReasons.some(b => b.code === 'MISSING_NAME_FOR_NEW_PRODUCT')).toBe(true);
    });

    test('11. Missing barcode on NEW product generates internal barcode with optional warning (not blocked)', async () => {
      const rows = [
        { 'Product Name': 'Organic Turmeric Powder 200g', 'Cost': '40', 'Price': '65', 'Stock': '0' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.blockedRows).toBe(0);
      expect(preview.rows[0].status).toBe('WARNING');
      expect(preview.rows[0].normalizedData.barcode).toMatch(/^VC/);
      expect(preview.rows[0].warnings.some(w => w.code === 'AUTO_GENERATED_BARCODE')).toBe(true);
    });

    test('12. Catalog-only import (stock = 0) does not require store location', async () => {
      const rows = [
        { 'Product Name': 'Raw Honey 500g', 'Cost': '180', 'Price': '260', 'Stock': '0' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.blockedRows).toBe(0);
      expect(preview.rows[0].normalizedData.resolvedLocationId).toBe(null);
    });
  });

  describe('5. Batch Commitment & Proceeds with Safe Rows', () => {
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
            if (update.$inc) current.quantity += (update.$inc.quantity || 0);
            if (update.$set) Object.assign(current, update.$set);
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
            if (name === 'inventory_ledger') inventoryLedgerTable.push(doc);
          },
          deleteMany: async () => ({ deletedCount: 0 }),
          insertMany: async () => ({ insertedCount: 0 }),
          find: () => ({ toArray: async () => [] })
        })
      };

      setupContext(mockDb, null, 'secret', '', {}, {});
    });

    test('13. Commits safe rows (READY and WARNING) while skipping BLOCKED rows without crashing', async () => {
      const previewRows = [
        {
          rowNumber: 1,
          status: 'BLOCKED',
          blockReasons: [{ message: 'Missing product name' }],
          normalizedData: { productName: '', barcode: '8900000000001' }
        },
        {
          rowNumber: 2,
          status: 'READY',
          normalizedData: {
            productName: 'Sesame Oil 1L',
            sku: 'SKU-SESAME-1',
            barcode: '8900000000002',
            purchasePrice: 459,
            sellingPrice: 350,
            openingStock: 3,
            resolvedLocationId: 'store-blr-1',
            unit: '1L'
          }
        },
        {
          rowNumber: 3,
          status: 'WARNING',
          warnings: [{ message: 'No category supplied' }],
          normalizedData: {
            productName: 'Mustard Oil 1L',
            sku: 'SKU-MUSTARD-1',
            barcode: '8900000000003',
            purchasePrice: 339,
            sellingPrice: 250,
            openingStock: 3,
            resolvedLocationId: 'store-blr-1',
            unit: '1L'
          }
        }
      ];

      const result = await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-safe-rows-test',
        previewRows,
        { defaultLocationId: 'store-blr-1' },
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.summary.imported).toBe(2);
      expect(result.summary.skipped).toBe(1);
      expect(result.summary.inventoryMovements).toBe(2);
    });

    test('14. Idempotency: Reject duplicate execution of already completed importId', async () => {
      importSessionsTable.set('imp-dup-test-2', {
        importId: 'imp-dup-test-2',
        status: 'COMPLETED',
        summary: { imported: 7, updated: 0 }
      });

      const result = await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-dup-test-2',
        [],
        {},
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(result.summary.imported).toBe(7);
    });
  });
});
