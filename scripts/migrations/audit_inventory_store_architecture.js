const { MongoClient } = require('mongodb');

function idOf(doc) {
  return doc?.id || (doc?._id ? String(doc._id) : null);
}

function locationIdOf(doc) {
  return doc?.locationId || doc?.storeId || null;
}

function isSuperUser(user) {
  const raw = String(user?.category || user?.role || '').toLowerCase();
  return raw.includes('super') || raw === 'owner';
}

async function auditInventoryStoreArchitecture(db) {
  if (!db) {
    throw new Error('Database handle required for inventory/store architecture audit.');
  }

  const [
    products,
    stores,
    inventory,
    batches,
    invoices,
    users
  ] = await Promise.all([
    db.collection('products').find({}).toArray(),
    db.collection('stores').find({}).toArray(),
    db.collection('inventory').find({}).toArray(),
    db.collection('product_batches').find({}).toArray(),
    db.collection('invoices').find({}).toArray(),
    db.collection('users').find({}).toArray()
  ]);

  const productIds = new Set(products.map(idOf).filter(Boolean));
  const storeIds = new Set(stores.map(idOf).filter(Boolean));
  const balanceKeys = new Map();

  const missingProductRefs = inventory
    .filter(row => row.productId && !productIds.has(row.productId))
    .map(row => ({
      inventoryId: idOf(row),
      productId: row.productId,
      locationId: locationIdOf(row),
      quantity: Number(row.quantity || 0)
    }));

  const invalidLocations = inventory
    .filter(row => {
      const locationId = locationIdOf(row);
      return locationId && locationId !== 'all' && !storeIds.has(locationId);
    })
    .map(row => ({
      inventoryId: idOf(row),
      productId: row.productId,
      locationId: locationIdOf(row)
    }));

  for (const row of inventory) {
    const key = `${row.productId || 'missing'}::${locationIdOf(row) || 'missing'}`;
    if (!balanceKeys.has(key)) balanceKeys.set(key, []);
    balanceKeys.get(key).push(idOf(row));
  }

  const duplicateBalances = Array.from(balanceKeys.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => {
      const [productId, locationId] = key.split('::');
      return { productId, locationId, inventoryIds: ids };
    });

  const invalidStoreAssignments = users
    .filter(user => !isSuperUser(user))
    .flatMap(user => {
      const assignedStores = Array.isArray(user.assignedStores)
        ? user.assignedStores
        : (user.assignedStoreId ? [user.assignedStoreId] : []);
      return assignedStores
        .filter(storeId => storeId && storeId !== 'all' && !storeIds.has(storeId))
        .map(storeId => ({
          userId: idOf(user),
          username: user.username,
          assignedStoreId: storeId
        }));
    });

  const missingInvoiceStoreId = invoices
    .filter(invoice => !locationIdOf(invoice))
    .map(invoice => ({
      invoiceId: idOf(invoice) || invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt
    }));

  const batchInconsistencies = batches
    .filter(batch => {
      const locationId = locationIdOf(batch);
      return (batch.productId && !productIds.has(batch.productId)) ||
        (locationId && locationId !== 'all' && !storeIds.has(locationId));
    })
    .map(batch => ({
      batchId: idOf(batch),
      productId: batch.productId,
      locationId: locationIdOf(batch),
      remainingQuantity: Number(batch.remainingQuantity || 0)
    }));

  return {
    mode: 'READ_ONLY',
    mutated: false,
    generatedAt: new Date().toISOString(),
    counts: {
      products: products.length,
      stores: stores.length,
      inventory: inventory.length,
      productBatches: batches.length,
      invoices: invoices.length,
      users: users.length
    },
    findings: {
      missingProductRefs,
      invalidLocations,
      duplicateBalances,
      invalidStoreAssignments,
      missingInvoiceStoreId,
      batchInconsistencies
    }
  };
}

async function runCli() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/aiavro_billing';
  console.log('INVENTORY STORE ARCHITECTURE AUDIT');
  console.log('Mode: READ_ONLY');
  console.log(`Target: ${uri.replace(/:([^:@]+)@/, ':****@')}`);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const report = await auditInventoryStoreArchitecture(client.db());
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runCli().catch(err => {
    console.error('[Architecture Audit] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { auditInventoryStoreArchitecture };
