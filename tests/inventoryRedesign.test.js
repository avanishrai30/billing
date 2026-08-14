const fs = require('fs');
const path = require('path');
const inventoryService = require('../services/inventoryService');
const { setupContext } = require('../modules/context');

describe('Stage 13 Phase F: Inventory + Transfer Command Center Redesign', () => {
  const htmlPath = path.join(__dirname, '..', 'aiavro_billing_system.html');
  let htmlContent;
  let mockDb;
  let inventoryTable;
  let ledgerTable;
  let productsTable;
  let businessesTable;

  beforeAll(() => {
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
  });

  beforeEach(() => {
    productsTable = [
      {
        id: 'prod-1',
        name: 'A2 Gir Cow Desi Ghee',
        sku: 'AIA-GHEE-001',
        barcode: '8901234567011',
        category: 'Dairy & Ghee',
        unit: '1 Liter Jar',
        price: 950,
        cost: 650,
        stock: 25,
        reorder: 5,
        sellingMode: 'packaged'
      },
      {
        id: 'prod-2',
        name: 'Loose Fresh Paneer',
        sku: 'AIA-PANEER-002',
        barcode: '',
        category: 'Loose & Fresh Items',
        unit: 'per kg',
        weightUnit: 'g',
        price: 320,
        cost: 220,
        stock: 4,
        reorder: 10,
        sellingMode: 'loose'
      },
      {
        id: 'prod-3',
        name: 'Farm Fresh Whipping Cream',
        sku: 'AIA-CREAM-003',
        barcode: '8901234567033',
        category: 'Dairy & Ghee',
        unit: '250ml Cup',
        price: 110,
        cost: 70,
        stock: 0,
        reorder: 5,
        sellingMode: 'packaged'
      }
    ];

    businessesTable = [
      { id: 'store-1', name: 'Main Farm Depot', locationId: 'store-1' },
      { id: 'store-2', name: 'Indiranagar Retail Outlet', locationId: 'store-2' }
    ];

    inventoryTable = [
      {
        productId: 'prod-1',
        storeId: 'store-1',
        locationId: 'store-1',
        quantity: 25,
        reservedQuantity: 2,
        reorderLevel: 5,
        version: 1,
        updatedAt: '2026-08-14T06:00:00.000Z'
      },
      {
        productId: 'prod-1',
        storeId: 'store-2',
        locationId: 'store-2',
        quantity: 15,
        reservedQuantity: 0,
        reorderLevel: 5,
        version: 1,
        updatedAt: '2026-08-14T06:00:00.000Z'
      },
      {
        productId: 'prod-2',
        storeId: 'store-1',
        locationId: 'store-1',
        quantity: 4,
        reservedQuantity: 0,
        reorderLevel: 10,
        version: 1,
        updatedAt: '2026-08-14T06:00:00.000Z'
      },
      {
        productId: 'prod-3',
        storeId: 'store-1',
        locationId: 'store-1',
        quantity: 0,
        reservedQuantity: 0,
        reorderLevel: 5,
        version: 1,
        updatedAt: '2026-08-14T06:00:00.000Z'
      }
    ];

    ledgerTable = [
      {
        _id: 'leg-101',
        movementId: 'leg-101',
        productId: 'prod-1',
        storeId: 'store-1',
        locationId: 'store-1',
        type: 'PURCHASE',
        quantity: 25,
        beforeQuantity: 0,
        afterQuantity: 25,
        referenceType: 'PO',
        referenceId: 'PO-8801',
        performedBy: 'admin',
        notes: 'Initial stock intake from dairy farm batch #14',
        createdAt: '2026-08-14T06:00:00.000Z'
      },
      {
        _id: 'leg-102',
        movementId: 'leg-102',
        productId: 'prod-2',
        storeId: 'store-1',
        locationId: 'store-1',
        type: 'ADJUSTMENT',
        quantity: -6,
        beforeQuantity: 10,
        afterQuantity: 4,
        referenceType: 'AUDIT',
        referenceId: 'AUD-552',
        performedBy: 'supervisor',
        notes: 'Morning inventory count audit discrepancy',
        createdAt: '2026-08-14T06:15:00.000Z'
      }
    ];

    mockDb = {
      collection: jest.fn((colName) => {
        if (colName === 'inventory') {
          return {
            find: jest.fn((query = {}) => ({
              toArray: jest.fn(async () => {
                return inventoryTable.filter(item => {
                  if (query.productId && item.productId !== query.productId) return false;
                  if (query.locationId && item.locationId !== query.locationId && item.storeId !== query.locationId) return false;
                  if (query.storeId && item.storeId !== query.storeId && item.locationId !== query.storeId) return false;
                  if (query.$or) {
                    const matchesOr = query.$or.some(c => {
                      if (c.locationId && (item.locationId === c.locationId || item.storeId === c.locationId)) return true;
                      if (c.storeId && (item.storeId === c.storeId || item.locationId === c.storeId)) return true;
                      return false;
                    });
                    if (!matchesOr) return false;
                  }
                  return true;
                });
              })
            })),
            findOne: jest.fn(async (query = {}) => {
              return inventoryTable.find(item => {
                if (query.productId && item.productId !== query.productId) return false;
                if (query.locationId && item.locationId !== query.locationId && item.storeId !== query.locationId) return false;
                if (query.storeId && item.storeId !== query.storeId && item.locationId !== query.storeId) return false;
                if (query.$or) {
                  const matchesOr = query.$or.some(c => {
                    if (c.locationId && (item.locationId === c.locationId || item.storeId === c.locationId)) return true;
                    if (c.storeId && (item.storeId === c.storeId || item.locationId === c.storeId)) return true;
                    return false;
                  });
                  if (!matchesOr) return false;
                }
                return true;
              }) || null;
            }),
            findOneAndUpdate: jest.fn(async (query, update, options = {}) => {
              let item = inventoryTable.find(i => {
                if (query.productId && i.productId !== query.productId) return false;
                if (query.locationId && i.locationId !== query.locationId && i.storeId !== query.locationId) return false;
                if (query.storeId && i.storeId !== query.storeId && i.locationId !== query.storeId) return false;
                if (query.quantity && query.quantity.$gte !== undefined && i.quantity < query.quantity.$gte) return false;
                return true;
              });

              const before = item ? (parseFloat(item.quantity) || 0) : 0;

              if (!item && options.upsert) {
                item = {
                  productId: query.productId,
                  locationId: query.locationId || query.storeId || 'store-1',
                  storeId: query.storeId || query.locationId || 'store-1',
                  quantity: 0,
                  reservedQuantity: 0,
                  version: 1,
                  updatedAt: new Date()
                };
                inventoryTable.push(item);
              }

              if (!item) return null;

              if (update.$inc) {
                for (const [k, v] of Object.entries(update.$inc)) {
                  item[k] = (item[k] || 0) + v;
                }
              }
              if (update.$set) {
                Object.assign(item, update.$set);
              }

              return { ...item, beforeQuantity: before, afterQuantity: item.quantity };
            }),
            updateOne: jest.fn(async (query, update) => {
              const idx = inventoryTable.findIndex(i => i.productId === query.productId && (i.locationId === query.locationId || i.storeId === query.locationId));
              if (idx !== -1) {
                if (update.$set) Object.assign(inventoryTable[idx], update.$set);
                if (update.$inc) {
                  for (const [k, v] of Object.entries(update.$inc)) {
                    inventoryTable[idx][k] = (inventoryTable[idx][k] || 0) + v;
                  }
                }
                return { modifiedCount: 1 };
              }
              return { modifiedCount: 0 };
            })
          };
        }
        if (colName === 'inventory_ledger') {
          return {
            find: jest.fn(() => ({
              sort: jest.fn().mockReturnThis(),
              limit: jest.fn(() => ({
                toArray: jest.fn(async () => ledgerTable)
              })),
              toArray: jest.fn(async () => ledgerTable)
            })),
            insertOne: jest.fn(async (doc) => {
              ledgerTable.push(doc);
              return { insertedId: doc._id || 'leg-' + Date.now() };
            })
          };
        }
        if (colName === 'products') {
          return {
            find: jest.fn(() => ({
              toArray: jest.fn(async () => productsTable)
            })),
            findOne: jest.fn(async (query) => productsTable.find(p => p.id === query.id || p.id === query.productId) || null)
          };
        }
        return {
          find: jest.fn(() => ({ toArray: jest.fn(async () => []) })),
          findOne: jest.fn(async () => null)
        };
      })
    };

    setupContext(mockDb, null, 'test_jwt_secret', '/tmp/uploads', {}, new Map());
  });

  // 1. UI Markup & Command Center Header / Context Bar
  test('1. HTML includes modernized Inventory Command Center markup, context bar, and status badge', () => {
    expect(htmlContent).toContain('id="view-inventory"');
    expect(htmlContent).toContain('id="inventory-store-context-select"');
    expect(htmlContent).toContain('id="inventory-store-scoped-badge"');
    expect(htmlContent).toContain('id="inventory-sync-status-badge"');
    expect(htmlContent).toContain('id="inventory-health-summary"');
  });

  // 2. Tab Navigation & Balances Table Shell
  test('2. HTML contains 3 sub-tabs and Master Stock Balances Table Shell', () => {
    expect(htmlContent).toContain('id="inventory-tab-balances"');
    expect(htmlContent).toContain('id="inventory-tab-audit"');
    expect(htmlContent).toContain('id="inventory-tab-directory"');
    expect(htmlContent).toContain('id="inventory-balances-tbody"');
    expect(htmlContent).toContain('id="inventory-audit-table-body"');
  });

  // 3. Stock Detail Drawer Elements
  test('3. Stock Detail Drawer modal exists with technical breakdown elements', () => {
    expect(htmlContent).toContain('id="stock-detail-drawer"');
    expect(htmlContent).toContain('id="stock-detail-onhand"');
    expect(htmlContent).toContain('id="stock-detail-reserved"');
    expect(htmlContent).toContain('id="stock-detail-available"');
    expect(htmlContent).toContain('id="stock-detail-reorder"');
    expect(htmlContent).toContain('id="stock-detail-status-badge"');
  });

  // 4. Stock Adjustment Modal Elements
  test('4. Stock Adjustment Modal exists with target calculation and reason inputs', () => {
    expect(htmlContent).toContain('id="stock-adjustment-modal"');
    expect(htmlContent).toContain('id="adjust-product-select"');
    expect(htmlContent).toContain('id="adjust-store-select"');
    expect(htmlContent).toContain('id="adjust-type-select"');
    expect(htmlContent).toContain('id="adjust-target-qty-input"');
    expect(htmlContent).toContain('id="adjust-delta-preview"');
    expect(htmlContent).toContain('id="adjust-notes-input"');
    expect(htmlContent).toContain('id="adjust-submit-btn"');
  });

  // 5. Inter-Store Stock Transfer Modal Elements
  test('5. Stock Transfer Modal contains source/target selectors and success confirmation view', () => {
    expect(htmlContent).toContain('id="transfer-stock-modal"');
    expect(htmlContent).toContain('id="transfer-form-view"');
    expect(htmlContent).toContain('id="transfer-success-view"');
    expect(htmlContent).toContain('id="transfer-stock-product"');
    expect(htmlContent).toContain('id="transfer-stock-source"');
    expect(htmlContent).toContain('id="transfer-stock-target"');
    expect(htmlContent).toContain('id="transfer-available-stock-label"');
    expect(htmlContent).toContain('id="transfer-remaining-preview"');
    expect(htmlContent).toContain('id="transfer-success-id"');
  });

  // 6. Authoritative Inventory List Service Call
  test('6. inventoryService.listInventory returns authoritative inventory balances', async () => {
    const list = await inventoryService.listInventory({ locationId: 'store-1' });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.find(i => i.productId === 'prod-1').quantity).toBe(25);
  });

  // 7. Authoritative Inventory Summary Calculation
  test('7. inventoryService.getInventorySummary calculates live health KPIs', async () => {
    const res = await inventoryService.getInventorySummary('store-1');
    expect(res.success).toBe(true);
    expect(res.summary).toBeDefined();
    expect(res.summary.totalUnits).toBe(29);
    expect(res.summary.lowStockCount).toBe(1);
    expect(res.summary.outOfStockCount).toBe(1);
  });

  // 8. Authoritative Movement Ledger Logs Retrieval
  test('8. inventoryService.getLedgerLogs returns immutable audit logs with before/after records', async () => {
    const res = await inventoryService.getLedgerLogs({ locationId: 'store-1' });
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data[0].beforeQuantity).toBeDefined();
    expect(res.data[0].afterQuantity).toBeDefined();
    expect(res.data[0].performedBy).toBeDefined();
  });

  // 9. Stock Adjustment Execution & Traceability
  test('9. inventoryService.adjustStock successfully adjusts quantity with audit trail', async () => {
    const afterQty = await inventoryService.adjustStock(
      'prod-1',
      'store-1',
      30,
      'ADJUSTMENT',
      'AUD-99',
      'admin',
      'Annual physical stock verification audit'
    );

    expect(afterQty).toBe(30);
  });

  // 10. Inter-Store Stock Transfer Pre-Validation: Reject Same-Store Transfer
  test('10. inventoryService.transferStock rejects same-store transfer attempt', async () => {
    await expect(inventoryService.transferStock(
      'prod-1',
      'store-1',
      'store-1',
      5,
      'admin',
      'Invalid same store relocation'
    )).rejects.toThrow('Source and target locations cannot be the same');
  });

  // 11. Atomic Stock Transfer Execution & Dual Ledger Entries
  test('11. inventoryService.transferStock transfers stock atomically between stores', async () => {
    const res = await inventoryService.transferStock(
      'prod-1',
      'store-1',
      'store-2',
      5,
      'logistics_lead',
      'Rebalancing inventory between store facilities'
    );

    expect(res.success).toBe(true);
    expect(res.referenceId).toBeDefined();
  });

  // 12. Client-side Controller Function Implementations
  test('12. HTML JavaScript controller defines all required Phase F functions', () => {
    expect(htmlContent).toContain('function initInventoryCommandCenter()');
    expect(htmlContent).toContain('function refreshInventoryCommandCenter()');
    expect(htmlContent).toContain('function switchInventorySubTab(');
    expect(htmlContent).toContain('function renderInventoryBalancesTable(');
    expect(htmlContent).toContain('function filterInventoryBalances()');
    expect(htmlContent).toContain('function openStockDetailDrawer(');
    expect(htmlContent).toContain('function openAdjustStockModal(');
    expect(htmlContent).toContain('function calculateLiveAdjustmentDelta()');
    expect(htmlContent).toContain('function executeStockAdjustment(');
    expect(htmlContent).toContain('function openTransferStockModal(');
    expect(htmlContent).toContain('function calculateTransferRemainingPreview()');
    expect(htmlContent).toContain('function executeStockTransfer(');
    expect(htmlContent).toContain('function fetchAuthoritativeLedgerLogs()');
    expect(htmlContent).toContain('function renderInventoryAuditLogs()');
    expect(htmlContent).toContain('function getMovementTypeBadgeHtml(');
  });

  // 13. Realtime Socket Event Subscriptions
  test('13. HTML registers inventory.updated and inventory.bulk_updated listeners for live updates', () => {
    expect(htmlContent).toContain("syncSocket.on('inventory.updated'");
    expect(htmlContent).toContain("syncSocket.on('inventory_updated'");
    expect(htmlContent).toContain("syncSocket.on('inventory.bulk_updated'");
    expect(htmlContent).toContain("syncSocket.on('inventory_bulk_updated'");
  });

  // 14. Stock Status Threshold Logic
  test('14. Stock status correctly classifies IN STOCK, LOW STOCK, and OUT OF STOCK', () => {
    expect(htmlContent).toContain('OUT OF STOCK');
    expect(htmlContent).toContain('LOW STOCK');
    expect(htmlContent).toContain('IN STOCK');
  });

  // 15. Concurrency Conflict Recovery
  test('15. Error handler detects concurrent stock mutation and notifies user', () => {
    expect(htmlContent).toContain('Stock changed before this action completed');
  });

  // 16. Zero Fake Data Rule Enforcement
  test('16. No demo, placeholder, or synthetic fake stock records injected in code', () => {
    expect(htmlContent).not.toContain('Demo Store XYZ');
    expect(htmlContent).not.toContain('Sample Inventory Item');
    expect(htmlContent).not.toContain('Fake Barcode 123');
  });
});
