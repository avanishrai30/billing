const bulkImportService = require('../services/bulkImportService');
const { setupContext } = require('../modules/context');

describe('Stage 09: Intelligent File Understanding & Flexible Product Import (UX & State Machine)', () => {

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

  describe('4. Simulation Preview & State Machine Confirmation Transitions', () => {
    let mockDb;
    let productsCollection;
    let categoriesCollection;

    beforeEach(() => {
      productsCollection = [
        { id: 'prd-exist-1', name: 'Existing Mustard Oil', sku: 'SKU-MUSTARD-1', barcode: '8901111111111', sellingPrice: 200, purchasePrice: 150 }
      ];
      categoriesCollection = [];

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
            if (name === 'categories') return categoriesCollection.find(c => c.id === query.id || c.name === query.name) || null;
            return null;
          }
        })
      };
    });

    test('8. HEMA(1).xlsx structure: ambiguous mapping initially marks all rows REVIEW_REQUIRED', async () => {
      const hemaMatrix = [
        ['SL.No', 'Products', '', '', '', 'PURCHASE'],
        ['', '', 'WEIGHT', 'COST', 'QTY', ''],
        ['1', 'SESAME OIL', '1 LTR', '459', '3', '350'],
        ['2', 'MUSTARD OIL', '1LTR', '339', '3', '250'],
        ['3', 'GROUNDNUT OIL', '500 ML', '180', '5', '140'],
        ['4', 'COCONUT OIL', '1 LTR', '350', '2', '280'],
        ['5', 'SUNFLOWER OIL', '1 LTR', '180', '4', '150'],
        ['6', 'CASTOR OIL', '200 ML', '120', '2', '90']
      ];

      const previewUnconfirmed = await bulkImportService.validateAndPreview(mockDb, hemaMatrix, { defaultStore: 'store-blr-1' });
      expect(previewUnconfirmed.summary.totalRows).toBe(6);
      expect(previewUnconfirmed.summary.reviewRequiredRows).toBe(6);
      expect(previewUnconfirmed.summary.readyRows).toBe(0);
      expect(previewUnconfirmed.summary.warningRows).toBe(0);
      expect(previewUnconfirmed.summary.blockedRows).toBe(0);
      expect(previewUnconfirmed.rows[0].status).toBe('REVIEW_REQUIRED');
    });

    test('9. HEMA(1).xlsx confirmation: user confirming PURCHASE unblocks all 6 rows into safe rows', async () => {
      const hemaMatrix = [
        ['SL.No', 'Products', '', '', '', 'PURCHASE'],
        ['', '', 'WEIGHT', 'COST', 'QTY', ''],
        ['1', 'SESAME OIL', '1 LTR', '459', '3', '350'],
        ['2', 'MUSTARD OIL', '1LTR', '339', '3', '250'],
        ['3', 'GROUNDNUT OIL', '500 ML', '180', '5', '140'],
        ['4', 'COCONUT OIL', '1 LTR', '350', '2', '280'],
        ['5', 'SUNFLOWER OIL', '1 LTR', '180', '4', '150'],
        ['6', 'CASTOR OIL', '200 ML', '120', '2', '90']
      ];

      const previewConfirmed = await bulkImportService.validateAndPreview(mockDb, hemaMatrix, {
        defaultStore: 'store-blr-1',
        confirmedAmbiguousMappings: ['PURCHASE']
      });

      expect(previewConfirmed.summary.totalRows).toBe(6);
      expect(previewConfirmed.summary.reviewRequiredRows).toBe(0);
      expect(previewConfirmed.summary.blockedRows).toBe(0);
      // Optional category & brand missing -> WARNING status (which counts as safe to import)
      expect(previewConfirmed.summary.warningRows).toBe(6);

      const safeRows = previewConfirmed.summary.readyRows + previewConfirmed.summary.warningRows;
      expect(safeRows).toBe(6);
      expect(previewConfirmed.rows[0].status).toBe('WARNING');
      expect(previewConfirmed.rows[0].normalizedData.sellingPrice).toBe(350);
      expect(previewConfirmed.rows[0].normalizedData.purchasePrice).toBe(459);
    });

    test('10. Rejecting ambiguous mapping sets column to ignore and new products without selling price stay in REVIEW_REQUIRED', async () => {
      const rows = [
        { 'Products': 'Sesame Oil 1L', 'COST': '459' } // PURCHASE column ignored
      ];
      const columnMapping = { 'Products': 'productName', 'COST': 'purchasePrice' };

      const preview = await bulkImportService.validateAndPreview(mockDb, rows, { columnMapping });
      expect(preview.summary.reviewRequiredRows).toBe(1);
      expect(preview.rows[0].status).toBe('REVIEW_REQUIRED');
      expect(preview.rows[0].normalizedData.sellingPrice).toBe(null);
      expect(preview.rows[0].reviewRequests.some(r => r.code === 'MISSING_SELLING_PRICE_FOR_NEW_PRODUCT')).toBe(true);
    });

    test('11. Missing category, brand, supplier remains null and does not block import', async () => {
      const rows = [
        { 'Product Name': 'Cold Pressed Sesame Oil 1L', 'Cost': '300', 'Price': '450', 'Stock': '10' }
      ];

      const preview = await bulkImportService.validateAndPreview(mockDb, rows);
      expect(preview.summary.blockedRows).toBe(0);
      expect(preview.rows[0].normalizedData.category).toBe('');
      expect(preview.rows[0].normalizedData.brand).toBe('');
      expect(preview.rows[0].normalizedData.supplier).toBe('');
      expect(preview.rows[0].warnings.some(w => w.code === 'CATEGORY_OPTIONAL')).toBe(true);
      expect(preview.rows[0].warnings.some(w => w.code === 'BRAND_OPTIONAL')).toBe(true);
    });
  });

  describe('5. Batch Commitment, Strict Zero Pre-Seeding, & Category Isolation', () => {
    let mockDb;
    let productsTable;
    let categoriesTable;
    let inventoryLedgerTable;
    let importSessionsTable;
    let inventoryTable;

    beforeEach(() => {
      productsTable = new Map();
      categoriesTable = new Map();
      inventoryLedgerTable = [];
      importSessionsTable = new Map();
      inventoryTable = new Map();

      mockDb = {
        collection: (name) => ({
          findOne: async (query) => {
            if (name === 'import_sessions') return importSessionsTable.get(query.importId) || null;
            if (name === 'products') return productsTable.get(query.id || query.sku) || null;
            if (name === 'product_barcodes') return null;
            if (name === 'categories') return categoriesTable.get(query.id || query.name) || null;
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
            if (name === 'categories') {
              const current = categoriesTable.get(query.id) || {};
              categoriesTable.set(query.id, { ...current, ...(update.$set || {}) });
            }
          },
          insertOne: async (doc) => {
            if (name === 'inventory_ledger') inventoryLedgerTable.push(doc);
            if (name === 'categories') categoriesTable.set(doc.id || doc.name, doc);
          },
          deleteMany: async () => ({ deletedCount: 0 }),
          insertMany: async () => ({ insertedCount: 0 }),
          find: () => ({ toArray: async () => Array.from(productsTable.values()) })
        })
      };

      setupContext(mockDb, null, 'secret', '', {}, {});
    });

    test('12. End-to-end import of HEMA rows creates NO categories in database (zero pre-seeded data)', async () => {
      const previewRows = [
        {
          rowNumber: 1,
          status: 'WARNING',
          normalizedData: {
            productName: 'Sesame Oil 1L',
            sku: 'SKU-SESAME-1',
            barcode: null,
            category: '', // No category in sheet
            brand: '',
            supplier: '',
            purchasePrice: 459,
            sellingPrice: 350,
            openingStock: 3,
            resolvedLocationId: 'store-blr-1',
            unit: '1L'
          }
        },
        {
          rowNumber: 2,
          status: 'WARNING',
          normalizedData: {
            productName: 'Mustard Oil 1L',
            sku: 'SKU-MUSTARD-1',
            barcode: null,
            category: '', // No category in sheet
            brand: '',
            supplier: '',
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
        'imp-hema-clean-test',
        previewRows,
        { defaultLocationId: 'store-blr-1' },
        { username: 'admin' }
      );

      expect(result.success).toBe(true);
      expect(result.summary.imported).toBe(2);
      expect(result.summary.inventoryMovements).toBe(2);

      // Verify ZERO categories were created in database
      expect(categoriesTable.size).toBe(0);

      // Verify products were created with empty category string and no fabricated barcodes
      const createdProd = productsTable.get('SKU-SESAME-1') || Array.from(productsTable.values())[0];
      expect(createdProd.category).toBe('');
      expect(createdProd.barcode).toBe('');
      expect(createdProd.sellingPrice).toBe(350);
      expect(createdProd.purchasePrice).toBe(459);
    });

    test('13. Authoritative ledger entry is recorded with reference IMPORT:<importId>', async () => {
      const previewRows = [
        {
          rowNumber: 1,
          status: 'READY',
          normalizedData: {
            productName: 'Castor Oil 200ml',
            sku: 'SKU-CASTOR-1',
            barcode: null,
            purchasePrice: 120,
            sellingPrice: 90,
            openingStock: 2,
            resolvedLocationId: 'store-blr-1',
            unit: '200ml'
          }
        }
      ];

      await bulkImportService.commitImport(
        mockDb,
        null,
        'imp-ledger-test-99',
        previewRows,
        { defaultLocationId: 'store-blr-1' },
        { username: 'admin' }
      );

      expect(inventoryLedgerTable.length).toBe(1);
      expect(inventoryLedgerTable[0].referenceId).toBe('IMPORT:imp-ledger-test-99');
      expect(inventoryLedgerTable[0].quantity).toBe(2);
    });
  });
});
