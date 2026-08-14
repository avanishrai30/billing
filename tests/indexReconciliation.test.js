const databaseIndexService = require('../services/databaseIndexService');
const { runBarcodeMigration } = require('../scripts/migrations/clean_legacy_barcodes');
const bulkImportService = require('../services/bulkImportService');

describe('Final Production Integrity Pass: Index Reconciliation & Barcode Migration', () => {
  let mockDb;
  let productsCollection;
  let productBarcodesCollection;
  let indexesMap;

  beforeEach(() => {
    productsCollection = new Map();
    productBarcodesCollection = new Map();
    indexesMap = new Map();

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'products') {
            for (const p of productsCollection.values()) {
              if (query.id && p.id === query.id) return { ...p };
              if (query.sku && p.sku === query.sku) return { ...p };
              if (query.barcode && p.barcode === query.barcode) return { ...p };
            }
          }
          if (name === 'product_barcodes') {
            for (const b of productBarcodesCollection.values()) {
              if (query.barcode && b.barcode === query.barcode) return { ...b };
            }
          }
          return null;
        },
        find: () => ({
          toArray: async () => {
            if (name === 'products') return Array.from(productsCollection.values());
            if (name === 'product_barcodes') return Array.from(productBarcodesCollection.values());
            return [];
          }
        }),
        updateOne: async (filter, update) => {
          const table = (name === 'products') ? productsCollection : productBarcodesCollection;
          const id = filter.id || 'p-1';
          let existing = table.get(id) || {};
          if (update.$set) existing = { ...existing, ...update.$set };
          if (update.$unset) {
            for (const k of Object.keys(update.$unset)) delete existing[k];
          }
          table.set(id, existing);
          return { acknowledged: true, modifiedCount: 1 };
        },
        updateMany: async (filter, update) => {
          const table = (name === 'products') ? productsCollection : productBarcodesCollection;
          let modCount = 0;
          for (const [id, doc] of table.entries()) {
            if (filter.$or) {
              const matches = filter.$or.some(c => {
                if (c.barcode === "" && doc.barcode === "") return true;
                if (c.barcode && c.barcode.$regex && typeof doc.barcode === 'string' && doc.barcode.trim() === '') return true;
                return false;
              });
              if (matches) {
                if (update.$unset && update.$unset.barcode !== undefined) {
                  delete doc.barcode;
                  table.set(id, doc);
                  modCount++;
                }
              }
            }
          }
          return { acknowledged: true, modifiedCount: modCount };
        },
        deleteMany: async (filter) => {
          const table = (name === 'product_barcodes') ? productBarcodesCollection : productsCollection;
          let delCount = 0;
          for (const [id, doc] of table.entries()) {
            if (filter.$or) {
              const matches = filter.$or.some(c => doc.barcode === c.barcode || (c.barcode === null && doc.barcode === null));
              if (matches) {
                table.delete(id);
                delCount++;
              }
            }
          }
          return { acknowledged: true, deletedCount: delCount };
        },
        countDocuments: async (query = {}) => {
          const table = (name === 'products') ? productsCollection : productBarcodesCollection;
          let count = 0;
          for (const doc of table.values()) {
            if (query.$or) {
              const matches = query.$or.some(c => {
                if (c.barcode === "" && doc.barcode === "") return true;
                if (c.barcode === null && doc.barcode === null) return true;
                if (c.barcode && c.barcode.$regex && typeof doc.barcode === 'string' && doc.barcode.trim() === '') return true;
                return false;
              });
              if (matches) count++;
            } else {
              count++;
            }
          }
          return count;
        },
        listIndexes: () => ({
          toArray: async () => indexesMap.get(name) || [{ key: { _id: 1 }, name: "_id_" }]
        }),
        createIndex: async (keys, options) => {
          if (!indexesMap.has(name)) indexesMap.set(name, [{ key: { _id: 1 }, name: "_id_" }]);
          const list = indexesMap.get(name);
          list.push({ key: keys, name: options?.name || Object.keys(keys).join('_'), options });
          return options?.name || "idx";
        }
      })
    };
  });

  // 1. Startup never mutates barcode data
  test('1. Application startup (syncIndexes) does NOT mutate barcode data', async () => {
    productsCollection.set('prd-legacy', { id: 'prd-legacy', name: 'Legacy Item', barcode: '' });
    productBarcodesCollection.set('map-legacy', { id: 'map-legacy', barcode: '' });

    const result = await databaseIndexService.syncIndexes(mockDb);
    expect(result.success).toBe(true);

    // Document in products still has barcode: "" because syncIndexes is read-only for business data
    expect(productsCollection.get('prd-legacy').barcode).toBe('');
    expect(productBarcodesCollection.has('map-legacy')).toBe(true);
  });

  // 2. Migration dry-run performs no mutation
  test('2. Migration dry-run reports affected count without performing mutations', async () => {
    productsCollection.set('prd-1', { id: 'prd-1', name: 'Item 1', barcode: '' });
    productsCollection.set('prd-2', { id: 'prd-2', name: 'Item 2', barcode: '   ' });
    productBarcodesCollection.set('map-1', { id: 'map-1', barcode: null });

    const report = await runBarcodeMigration(mockDb, { apply: false });
    expect(report.mode).toBe('DRY-RUN');
    expect(report.productsIdentified).toBe(2);
    expect(report.productBarcodesIdentified).toBe(1);
    expect(report.productsModified).toBe(0);
    expect(report.productBarcodesDeleted).toBe(0);

    // Records untouched
    expect(productsCollection.get('prd-1').barcode).toBe('');
  });

  // 3. Migration apply is idempotent
  test('3. Migration apply mutates records and subsequent runs are no-ops', async () => {
    productsCollection.set('prd-1', { id: 'prd-1', name: 'Item 1', barcode: '' });
    productBarcodesCollection.set('map-1', { id: 'map-1', barcode: null });

    const report1 = await runBarcodeMigration(mockDb, { apply: true });
    expect(report1.mode).toBe('APPLY');
    expect(report1.productsModified).toBe(1);
    expect(report1.productBarcodesDeleted).toBe(1);
    expect(productsCollection.get('prd-1').barcode).toBeUndefined();

    // Second run should find 0 affected
    const report2 = await runBarcodeMigration(mockDb, { apply: true });
    expect(report2.productsIdentified).toBe(0);
    expect(report2.productsModified).toBe(0);
    expect(report2.productBarcodesDeleted).toBe(0);
  });

  // 4. Blank barcode normalization in bulk import
  test('4. Blank barcode normalization remains strictly enforced during imports', () => {
    const rawRow = { 'Product Name': 'Oil', 'Barcode': '   ' };
    const norm = bulkImportService.normalizeRowData(rawRow, { 'Product Name': 'productName', 'Barcode': 'barcode' });
    expect(norm.barcode).toBeNull();
  });

  // 5. Exact text index equivalence
  test('5. areTextIndexWeightsEquivalent checks exact weights equality', () => {
    expect(databaseIndexService.areTextIndexWeightsEquivalent(
      { name: 1, category: 1, brand: 1 },
      { name: 1, category: 1, brand: 1 }
    )).toBe(true);

    expect(databaseIndexService.areTextIndexWeightsEquivalent(
      { name: 1 },
      { name: 1, category: 1, brand: 1 }
    )).toBe(false);
  });

  // 6. Legacy text index mismatch reporting without automatic dropping
  test('6. Legacy text index mismatch is reported as ACCEPTED_LEGACY_TEXT_INDEX without dropping', () => {
    const existingIndex = {
      name: 'name_text',
      key: { _fts: 'text', _ftsx: 1 },
      weights: { name: 1 }
    };
    const expectedIndex = {
      keys: { name: 'text', category: 'text', brand: 'text' },
      options: { name: 'products_text_search', weights: { name: 1, category: 1, brand: 1 } }
    };

    const inspection = databaseIndexService.inspectIndexStatus(existingIndex, expectedIndex);
    expect(inspection.status).toBe('ACCEPTED_LEGACY_TEXT_INDEX');
    expect(inspection.details).toContain("Existing text index 'name_text'");
  });

  // 7. Startup handles accepted legacy text index and reports 0 errors
  test('7. syncIndexes recognizes existing legacy text index and completes with Errors: 0', async () => {
    indexesMap.set('products', [
      { key: { _id: 1 }, name: '_id_' },
      { key: { _fts: 'text', _ftsx: 1 }, weights: { name: 1 }, name: 'name_text' }
    ]);

    const result = await databaseIndexService.syncIndexes(mockDb);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.legacyRecognized).toBe(1);
  });

  // 8. Standard index option variation handling
  test('8. Standard index option variation (e.g. unique vs unique+sparse) is recognized safely', () => {
    const existingIndex = {
      name: 'sku_1',
      key: { sku: 1 },
      unique: true
    };
    const expectedIndex = {
      keys: { sku: 1 },
      options: { name: 'sku_1_sparse', unique: true, sparse: true }
    };

    const inspection = databaseIndexService.inspectIndexStatus(existingIndex, expectedIndex);
    expect(inspection.status).toBe('OPTION_VARIATION');
  });
});
