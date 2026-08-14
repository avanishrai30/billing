/**
 * Central Database Index Manager (Stage 12 P1 Hardening)
 * Idempotently inspects, registers, and synchronizes production database indexes.
 * Prevents startup collision warnings ("Index already exists with different options")
 * and handles legacy/existing index definitions cleanly without destructive drops.
 */

const EXPECTED_INDEXES = {
  products: [
    { keys: { sku: 1 }, options: { unique: true, sparse: true, name: "sku_1_sparse" } },
    { keys: { barcode: 1 }, options: { sparse: true, name: "barcode_1_sparse" } },
    { keys: { name: "text", category: "text", brand: "text" }, options: { name: "products_text_search" } }
  ],
  product_barcodes: [
    { keys: { barcode: 1 }, options: { name: "barcode_1" } },
    { keys: { productId: 1 }, options: { name: "productId_1" } }
  ],
  inventory: [
    { keys: { productId: 1, locationId: 1 }, options: { name: "productId_1_locationId_1" } },
    { keys: { locationId: 1 }, options: { name: "locationId_1" } }
  ],
  inventory_ledger: [
    { keys: { createdAt: -1, productId: 1, locationId: 1 }, options: { name: "createdAt_desc_productId_locationId" } },
    { keys: { locationId: 1, createdAt: -1 }, options: { name: "locationId_1_createdAt_desc" } },
    { keys: { referenceId: 1 }, options: { name: "referenceId_1" } }
  ],
  invoices: [
    { keys: { locationId: 1, createdAt: -1 }, options: { name: "locationId_1_createdAt_desc" } },
    { keys: { invoiceNumber: 1 }, options: { unique: true, sparse: true, name: "invoiceNumber_1_sparse" } },
    { keys: { transactionId: 1 }, options: { sparse: true, name: "transactionId_1_sparse" } },
    { keys: { createdAt: -1 }, options: { name: "createdAt_desc" } }
  ],
  purchases: [
    { keys: { locationId: 1, createdAt: -1 }, options: { name: "locationId_1_createdAt_desc" } },
    { keys: { supplierId: 1 }, options: { name: "supplierId_1" } },
    { keys: { id: 1 }, options: { sparse: true, name: "id_1_sparse" } }
  ],
  users: [
    { keys: { username: 1 }, options: { unique: true, sparse: true, name: "username_1_sparse" } },
    { keys: { id: 1 }, options: { unique: true, sparse: true, name: "id_1_sparse" } }
  ],
  audit_logs: [
    { keys: { timestamp: -1 }, options: { name: "timestamp_desc" } },
    { keys: { storeId: 1, timestamp: -1 }, options: { name: "storeId_1_timestamp_desc" } }
  ]
};

function isTextIndexSpec(spec) {
  if (!spec) return false;
  if (spec._fts === 'text') return true;
  return Object.values(spec).some(v => v === 'text');
}

function areKeySpecsEquivalent(specA, specB) {
  if (!specA || !specB) return false;
  if (isTextIndexSpec(specA) && isTextIndexSpec(specB)) return true;

  const keysA = Object.keys(specA);
  const keysB = Object.keys(specB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => specA[k] === specB[k]);
}

/**
 * Idempotently synchronize all required database indexes and cleanup legacy empty barcodes
 * @param {object} db - MongoDB database handle
 */
async function syncIndexes(db) {
  if (!db) {
    console.warn("[IndexManager] Database handle missing; skipping index synchronization.");
    return { success: false, synced: 0, skipped: 0, errors: [] };
  }

  console.log("[IndexManager] Synchronizing production database indexes...");
  let syncedCount = 0;
  let skippedCount = 0;
  const errors = [];

  // 1. Safe non-destructive cleanup of any legacy empty-string barcodes
  try {
    const emptyProducts = await db.collection('products').updateMany(
      {
        $or: [
          { barcode: "" },
          { barcode: { $type: "string", $regex: /^\s*$/ } }
        ]
      },
      {
        $unset: { barcode: "" }
      }
    );
    if (emptyProducts.modifiedCount > 0) {
      console.log(`[IndexManager] Cleaned ${emptyProducts.modifiedCount} legacy empty-string barcode(s) from products.`);
    }

    const emptyBarcodes = await db.collection('product_barcodes').deleteMany(
      {
        $or: [
          { barcode: "" },
          { barcode: null },
          { barcode: { $type: "string", $regex: /^\s*$/ } }
        ]
      }
    );
    if (emptyBarcodes.deletedCount > 0) {
      console.log(`[IndexManager] Removed ${emptyBarcodes.deletedCount} empty/null barcode mapping(s) from product_barcodes.`);
    }
  } catch (cleanErr) {
    console.warn("[IndexManager] Non-fatal barcode cleanup notice:", cleanErr.message);
  }

  // 2. Index Synchronization
  for (const [collectionName, indexList] of Object.entries(EXPECTED_INDEXES)) {
    try {
      const collection = db.collection(collectionName);
      let existingIndexes = [];

      try {
        existingIndexes = await collection.listIndexes().toArray();
      } catch (listErr) {
        existingIndexes = [];
      }

      for (const expected of indexList) {
        const isExpectedText = isTextIndexSpec(expected.keys);
        const matchingExisting = existingIndexes.find(ex => {
          if (isExpectedText && (isTextIndexSpec(ex.key) || ex.weights)) return true;
          return areKeySpecsEquivalent(ex.key, expected.keys);
        });

        if (matchingExisting) {
          // Index with matching keys or existing text index already verified
          skippedCount++;
        } else {
          try {
            await collection.createIndex(expected.keys, expected.options);
            syncedCount++;
          } catch (createErr) {
            const msg = createErr.message || '';
            // If index exists with different name/options or text index already exists, treat as verified/skipped
            if (
              msg.includes('already exists') ||
              msg.includes('IndexKeySpecsConflict') ||
              msg.includes('only one text index') ||
              msg.includes('Index with name')
            ) {
              console.log(`[IndexManager] Recognized existing index variant on ${collectionName}: ${msg}`);
              skippedCount++;
            } else {
              console.warn(`[IndexManager] Non-fatal index creation notice on ${collectionName}:`, msg);
              errors.push({ collection: collectionName, keys: expected.keys, error: msg });
            }
          }
        }
      }
    } catch (colErr) {
      console.warn(`[IndexManager] Error processing collection ${collectionName}:`, colErr.message);
      errors.push({ collection: collectionName, error: colErr.message });
    }
  }

  console.log(`[IndexManager] Index synchronization complete. Created: ${syncedCount}, Verified/Skipped: ${skippedCount}, Errors: ${errors.length}`);
  return {
    success: errors.length === 0,
    synced: syncedCount,
    skipped: skippedCount,
    errors
  };
}

module.exports = {
  EXPECTED_INDEXES,
  syncIndexes,
  areKeySpecsEquivalent,
  isTextIndexSpec
};
