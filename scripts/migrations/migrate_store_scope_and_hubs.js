/**
 * Phase: Store-Centric Operating Model Migration
 * Normalizes user store memberships, initializes hub status on stores, and ensures recommended indexes.
 *
 * Usage:
 *   node scripts/migrations/migrate_store_scope_and_hubs.js --dry-run
 *   node scripts/migrations/migrate_store_scope_and_hubs.js --commit
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/aiavro_billing';
const isDryRun = !process.argv.includes('--commit');

async function migrate() {
  console.log(`\n==================================================`);
  console.log(`STORE-CENTRIC OPERATING MODEL MIGRATION`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'COMMIT (Live Mutation)'}`);
  console.log(`Target: ${uri.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`==================================================\n`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // 1. Users Store Scope Migration
    console.log('[1/3] Scanning and Normalizing Users Store Membership...');
    const users = await db.collection('users').find().toArray();
    let usersUpdated = 0;
    let usersSkipped = 0;

    for (const user of users) {
      const category = (user.category || user.role || 'employee').toLowerCase();
      const isSuper = category.includes('super') || category === 'owner';
      let nextAssignedStores = user.assignedStores;
      let nextAssignedStoreId = user.assignedStoreId;

      if (isSuper) {
        nextAssignedStores = ['all'];
        nextAssignedStoreId = 'all';
      } else {
        if (!Array.isArray(nextAssignedStores) || nextAssignedStores.length === 0) {
          const fallback = nextAssignedStoreId && nextAssignedStoreId !== 'none' ? nextAssignedStoreId : 'all';
          nextAssignedStores = [fallback];
        }
        if (!nextAssignedStoreId || (nextAssignedStores.length > 0 && !nextAssignedStores.includes(nextAssignedStoreId) && nextAssignedStoreId !== 'all')) {
          nextAssignedStoreId = nextAssignedStores[0];
        }
      }

      const needsUpdate =
        JSON.stringify(user.assignedStores) !== JSON.stringify(nextAssignedStores) ||
        user.assignedStoreId !== nextAssignedStoreId;

      if (needsUpdate) {
        usersUpdated++;
        console.log(`  - User @${user.username} (${user.id}):`);
        console.log(`      From: assignedStoreId="${user.assignedStoreId}", assignedStores=${JSON.stringify(user.assignedStores)}`);
        console.log(`      To:   assignedStoreId="${nextAssignedStoreId}", assignedStores=${JSON.stringify(nextAssignedStores)}`);

        if (!isDryRun) {
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { assignedStores: nextAssignedStores, assignedStoreId: nextAssignedStoreId, updatedAt: new Date().toISOString() } }
          );
        }
      } else {
        usersSkipped++;
      }
    }
    console.log(`Users Summary: ${usersUpdated} to update, ${usersSkipped} already valid.\n`);

    // 2. Stores Hub Initialization
    console.log('[2/3] Scanning Stores for Hub Fields...');
    const stores = await db.collection('stores').find().toArray();
    let storesUpdated = 0;
    let storesSkipped = 0;

    for (const store of stores) {
      const isHub = store.isHub === true;
      const hubPriority = typeof store.hubPriority === 'number' ? store.hubPriority : (parseInt(store.hubPriority) || 1);

      const needsUpdate = store.isHub === undefined || store.hubPriority === undefined;
      if (needsUpdate) {
        storesUpdated++;
        console.log(`  - Store '${store.name}' (${store.id}): initializing isHub=${isHub}, hubPriority=${hubPriority}`);
        if (!isDryRun) {
          await db.collection('stores').updateOne(
            { _id: store._id },
            { $set: { isHub, hubPriority, updatedAt: new Date().toISOString() } }
          );
        }
      } else {
        storesSkipped++;
      }
    }
    console.log(`Stores Summary: ${storesUpdated} to update, ${storesSkipped} already valid.\n`);

    // 3. Recommended Database Indexes
    console.log('[3/3] Ensuring Recommended Indexes...');
    const indexPlan = [
      { collection: 'stores', spec: { id: 1 }, options: { unique: true } },
      { collection: 'stores', spec: { isHub: 1 } },
      { collection: 'users', spec: { assignedStores: 1 } },
      { collection: 'invoices', spec: { storeId: 1, createdAt: -1 } },
      { collection: 'invoices', spec: { locationId: 1, createdAt: -1 } },
      { collection: 'purchases', spec: { storeId: 1, createdAt: -1 } },
      { collection: 'purchases', spec: { locationId: 1, createdAt: -1 } },
      { collection: 'inventory', spec: { productId: 1, locationId: 1 } },
      { collection: 'inventory_ledger', spec: { storeId: 1, createdAt: -1 } },
      { collection: 'inventory_ledger', spec: { locationId: 1, createdAt: -1 } }
    ];

    for (const { collection, spec, options } of indexPlan) {
      const indexName = Object.entries(spec).map(([k, v]) => `${k}_${v}`).join('_');
      console.log(`  - Index on '${collection}': ${JSON.stringify(spec)}`);
      if (!isDryRun) {
        try {
          await db.collection(collection).createIndex(spec, options || {});
        } catch (idxErr) {
          console.warn(`    Warning on index '${indexName}':`, idxErr.message);
        }
      }
    }

    console.log(`\n==================================================`);
    console.log(`MIGRATION ${isDryRun ? 'DRY-RUN COMPLETE (No changes made)' : 'COMPLETED SUCCESSFULLY'}`);
    console.log(`==================================================\n`);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
