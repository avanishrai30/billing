const adminCleanupService = require('../services/adminCleanupService');
const inventoryService = require('../services/inventoryService');
const { setupContext } = require('../modules/context');
const bcrypt = require('bcryptjs');

function getValueByPath(doc, path) {
  return path.split('.').reduce((value, part) => {
    if (Array.isArray(value)) return value.map(item => item?.[part]);
    return value?.[part];
  }, doc);
}

function valueMatches(actual, expected) {
  if (Array.isArray(actual)) return actual.some(item => valueMatches(item, expected));
  if (expected && typeof expected === 'object') {
    if (expected.$gte !== undefined && (actual === undefined || actual < expected.$gte)) return false;
    if (expected.$gt !== undefined && (actual === undefined || actual <= expected.$gt)) return false;
    if (expected.$lte !== undefined && (actual === undefined || actual > expected.$lte)) return false;
    if (expected.$lt !== undefined && (actual === undefined || actual >= expected.$lt)) return false;
    if (expected.$ne !== undefined && actual === expected.$ne) return false;
    if (expected.$in !== undefined && !expected.$in.includes(actual)) return false;
    if (expected.$exists !== undefined && (actual !== undefined) !== expected.$exists) return false;
    return true;
  }
  return actual === expected;
}

function matchesFilter(doc, filter = {}) {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(expected)) {
      if (!expected.some(subFilter => matchesFilter(doc, subFilter))) return false;
      continue;
    }
    if (!valueMatches(getValueByPath(doc, key), expected)) return false;
  }
  return true;
}

function createMockDb() {
  const collections = new Map();

  function getColl(name) {
    if (!collections.has(name)) collections.set(name, []);
    return collections.get(name);
  }

  return {
    collection(name) {
      const items = getColl(name);
      return {
        async countDocuments(filter = {}) {
          return items.filter(doc => matchesFilter(doc, filter)).length;
        },
        async findOne(filter = {}) {
          return items.find(doc => matchesFilter(doc, filter)) || null;
        },
        find(filter = {}) {
          let result = items.filter(doc => matchesFilter(doc, filter));
          const chain = {
            sort(sortSpec = {}) {
              const [[field, direction] = []] = Object.entries(sortSpec);
              if (field) {
                result = [...result].sort((a, b) => {
                  const av = getValueByPath(a, field);
                  const bv = getValueByPath(b, field);
                  return av > bv ? direction : av < bv ? -direction : 0;
                });
              }
              return chain;
            },
            skip(n) {
              result = result.slice(n);
              return chain;
            },
            limit(n) {
              result = result.slice(0, n);
              return chain;
            },
            toArray: async () => result
          };
          return chain;
        },
        async insertOne(doc) {
          const newDoc = { _id: doc._id || `id-${items.length + 1}`, ...doc };
          items.push(newDoc);
          return { insertedId: newDoc._id };
        },
        async updateOne(filter, update) {
          const doc = items.find(item => matchesFilter(item, filter));
          if (!doc) return { modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$inc) {
            for (const [key, delta] of Object.entries(update.$inc)) {
              doc[key] = (doc[key] || 0) + delta;
            }
          }
          return { modifiedCount: 1 };
        },
        async deleteOne(filter = {}) {
          const index = items.findIndex(doc => matchesFilter(doc, filter));
          if (index === -1) return { deletedCount: 0 };
          items.splice(index, 1);
          return { deletedCount: 1 };
        }
      };
    }
  };
}

describe('Safe orphan inventory cleanup', () => {
  let mockDb;
  let emittedEvents;
  const superAdmin = {
    id: 'usr-super',
    username: 'superadmin',
    category: 'super admin',
    assignedStoreId: 'all'
  };
  const superAdminPassword = 'CorrectHorseBatteryStaple!';

  beforeEach(() => {
    emittedEvents = [];
    mockDb = createMockDb();
    const mockIo = {
      to: room => ({
        emit: (eventName, payload) => emittedEvents.push({ room, eventName, payload })
      })
    };
    setupContext(mockDb, mockIo, 'test-secret', '/tmp', {}, new Map());
    mockDb.collection('users').insertOne({
      id: superAdmin.id,
      username: superAdmin.username,
      category: 'super admin',
      passwordHash: bcrypt.hashSync(superAdminPassword, 4),
      status: 'active'
    });
  });

  async function seedBaseInventory() {
    await mockDb.collection('products').insertOne({
      id: 'prod-A',
      name: 'Product A',
      sku: 'SKU-A',
      category: 'General'
    });
    await mockDb.collection('inventory').insertOne({
      id: 'inv-A',
      productId: 'prod-A',
      locationId: 'Central Warehouse',
      quantity: 10
    });
    await mockDb.collection('inventory').insertOne({
      id: 'inv-B',
      productId: 'prod-B',
      locationId: 'Store 1',
      quantity: 17
    });
    await mockDb.collection('inventory_ledger').insertOne({
      movementId: 'mov-B-1',
      productId: 'prod-B',
      locationId: 'Store 1',
      quantity: 17,
      referenceType: 'opening',
      referenceId: 'OPEN-B'
    });
  }

  test('preview detects missing Product Master inventory only', async () => {
    await seedBaseInventory();

    const query = await adminCleanupService.queryDomainRecords(
      'inventory',
      { stockStatus: 'orphan' },
      { page: 1, limit: 25 },
      superAdmin
    );

    expect(query.records).toHaveLength(1);
    expect(query.records[0]).toMatchObject({
      id: 'inv-B',
      productName: 'Product Master Missing',
      isOrphan: true,
      currentQuantity: 17
    });

    const preview = await adminCleanupService.previewCleanup(
      'inventory',
      'remove_orphans',
      ['inv-A', 'inv-B'],
      {},
      superAdmin
    );

    expect(preview.eligibleRecords.map(r => r.id)).toEqual(['inv-B']);
    expect(preview.blockedRecords.map(r => r.id)).toEqual(['inv-A']);
    expect(preview.orphanInventoryImpact).toMatchObject({
      recordCount: 1,
      totalQuantity: 17,
      locations: [{ locationId: 'Store 1', quantity: 17 }]
    });
    expect(preview.orphanInventoryImpact.ledgerReferences).toHaveLength(1);
  });

  test('cleanup removes orphan inventory only and emits realtime inventory updates', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    const result = await adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: superAdminPassword,
      user: superAdmin,
      req: { user: superAdmin, ip: '127.0.0.1', headers: {} }
    });

    expect(result.processedCount).toBe(1);
    expect(result.cleanedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-A' })).not.toBeNull();
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-B' })).toBeNull();

    const operation = await mockDb.collection('cleanup_operations').findOne({ operationId: result.operationId });
    expect(operation.operationType).toBe('ORPHAN_INVENTORY_CLEANUP');
    expect(operation.affectedProductIds).toEqual(['prod-B']);
    expect(operation.affectedLocations).toEqual(['Store 1']);
    expect(operation.eligibleIds).toEqual(['inv-B']);
    expect(operation.blockedIds).toEqual([]);
    expect(operation.passwordReauthentication).toMatchObject({ verified: true });
    expect(operation.beforeSnapshot[0]).toMatchObject({ productId: 'prod-B', quantity: 17 });
    expect(JSON.stringify(operation)).not.toContain(superAdminPassword);

    const audit = await mockDb.collection('audit_logs').findOne({ eventType: 'ORPHAN_INVENTORY_CLEANUP' });
    expect(audit).not.toBeNull();
    expect(audit.after.eligibleIds).toEqual(['inv-B']);
    expect(audit.after.blockedIds).toEqual([]);
    expect(audit.after.passwordReauthentication).toMatchObject({ verified: true });
    expect(JSON.stringify(audit)).not.toContain(superAdminPassword);

    expect(emittedEvents.some(e => e.room === 'store_Store 1' && e.eventName === 'inventory.updated')).toBe(true);
    expect(emittedEvents.some(e => e.room === 'sync_global' && e.eventName === 'inventory.updated')).toBe(true);
  });

  test('new orphan inventory creation is rejected', async () => {
    await expect(
      inventoryService.adjustStock('prod-missing', 'Store 1', 5, 'OPENING', 'init', 'superadmin')
    ).rejects.toMatchObject({ code: 'PRODUCT_MASTER_NOT_FOUND', statusCode: 409 });
  });

  test('Product Master recreation before execution blocks stale orphan cleanup', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    await mockDb.collection('products').insertOne({
      id: 'prod-B',
      name: 'Product B',
      sku: 'SKU-B'
    });

    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: superAdminPassword,
      user: superAdmin
    })).rejects.toThrow(/No eligible records|Product Master now exists|STALE PREVIEW/);

    expect(await mockDb.collection('inventory').findOne({ id: 'inv-B' })).not.toBeNull();
  });

  test('active batch dependencies block orphan cleanup preview', async () => {
    await seedBaseInventory();
    await mockDb.collection('product_batches').insertOne({
      id: 'batch-B-1',
      productId: 'prod-B',
      lotNumber: 'LOT-B',
      remainingQuantity: 5,
      status: 'active',
      locationId: 'Store 1'
    });

    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    expect(preview.eligibleCount).toBe(0);
    expect(preview.blockedRecords[0].reason).toContain('active batch reference');
    expect(preview.orphanInventoryImpact.batchReferences).toHaveLength(1);
  });

  test('zero eligible preview cannot execute cleanup', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-A'], {}, superAdmin);

    expect(preview.eligibleCount).toBe(0);
    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-A'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 0 INVENTORY RECORDS',
      password: superAdminPassword,
      user: superAdmin
    })).rejects.toMatchObject({ code: 'NOTHING_ELIGIBLE', statusCode: 409 });
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-A' })).not.toBeNull();
  });

  test('exact confirmation text is required', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1',
      password: superAdminPassword,
      user: superAdmin
    })).rejects.toMatchObject({ code: 'CONFIRMATION_MISMATCH' });
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-B' })).not.toBeNull();
  });

  test('wrong Super Admin password is rejected before cleanup', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: 'wrong-password',
      user: superAdmin
    })).rejects.toMatchObject({ code: 'INVALID_PASSWORD', statusCode: 403 });
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-B' })).not.toBeNull();
  });

  test('duplicate execution is rejected', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    await adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: superAdminPassword,
      user: superAdmin
    });

    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: superAdminPassword,
      user: superAdmin
    })).rejects.toMatchObject({ code: 'DUPLICATE_EXECUTION' });
  });

  test('batch dependency appearing after preview causes stale conflict', async () => {
    await seedBaseInventory();
    const preview = await adminCleanupService.previewCleanup('inventory', 'remove_orphans', ['inv-B'], {}, superAdmin);

    await mockDb.collection('product_batches').insertOne({
      id: 'batch-B-late',
      productId: 'prod-B',
      lotNumber: 'LOT-LATE',
      remainingQuantity: 4,
      status: 'active',
      locationId: 'Store 1'
    });

    await expect(adminCleanupService.executeCleanup({
      domain: 'inventory',
      action: 'remove_orphans',
      targetIds: ['inv-B'],
      previewToken: preview.previewToken,
      confirmCode: 'DELETE 1 INVENTORY RECORD',
      password: superAdminPassword,
      user: superAdmin
    })).rejects.toMatchObject({ code: 'STALE_PREVIEW', statusCode: 409 });
    expect(await mockDb.collection('inventory').findOne({ id: 'inv-B' })).not.toBeNull();
  });
});
