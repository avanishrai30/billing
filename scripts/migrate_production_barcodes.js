/**
 * Production Database Barcode Verification & Normalization Script (Phase 30.4.1)
 * Safely inspects products.barcode index, checks for duplicate real barcodes,
 * normalizes empty string barcodes to unset, and registers the sparse unique index.
 */

const { MongoClient } = require('mongodb');

async function runBarcodeVerification() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vc_organic_billing_prod';
  console.log(`Connecting to MongoDB at ${uri}...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const productsColl = db.collection('products');

    console.log('\n--- 1. SCANNING PRODUCTS FOR DUPLICATE NON-EMPTY BARCODES ---');
    const duplicateRealBarcodes = await productsColl.aggregate([
      { $match: { barcode: { $exists: true, $nin: [null, ""] } } },
      { $group: { _id: "$barcode", count: { $sum: 1 }, products: { $push: { id: "$id", name: "$name", sku: "$sku" } } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicateRealBarcodes.length > 0) {
      console.error('\n🚨 CRITICAL ERROR: Found duplicate non-empty barcodes in database:');
      console.error(JSON.stringify(duplicateRealBarcodes, null, 2));
      console.error('STOPPING: Cannot apply unique index until real duplicate barcodes are resolved.');
      process.exit(1);
    } else {
      console.log('✅ No duplicate real barcodes found.');
    }

    console.log('\n--- 2. SCANNING FOR EMPTY-STRING / BLANK BARCODE RECORDS ---');
    const emptyStringCount = await productsColl.countDocuments({
      barcode: { $in: ["", " ", "   "] }
    });
    console.log(`Found ${emptyStringCount} products with empty-string or whitespace barcodes.`);

    if (emptyStringCount > 0) {
      console.log('Normalizing empty-string barcodes to $unset (null) for sparse index safety...');
      const normalizeRes = await productsColl.updateMany(
        { barcode: { $in: ["", " ", "   "] } },
        { $unset: { barcode: "", barcodeSource: "" } }
      );
      console.log(`✅ Normalized ${normalizeRes.modifiedCount} product records.`);
    }

    console.log('\n--- 3. INSPECTING EXISTING INDEXES ON PRODUCTS COLLECTION ---');
    const existingIndexes = await productsColl.indexes();
    console.log('Existing indexes:', existingIndexes.map(i => ({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse })));

    const existingBarcodeIdx = existingIndexes.find(i => i.name === 'barcode_1_sparse' || i.name === 'barcode_1' || (i.key && i.key.barcode === 1));

    if (existingBarcodeIdx) {
      if (existingBarcodeIdx.unique && existingBarcodeIdx.sparse) {
        console.log('✅ Index barcode_1_sparse already exists with { unique: true, sparse: true }.');
      } else {
        console.log(`Existing index '${existingBarcodeIdx.name}' does not have { unique: true, sparse: true }. Dropping and recreating...`);
        await productsColl.dropIndex(existingBarcodeIdx.name);
        await productsColl.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: "barcode_1_sparse" });
        console.log('✅ Recreated barcode_1_sparse with { unique: true, sparse: true }.');
      }
    } else {
      console.log('Creating index barcode_1_sparse with { unique: true, sparse: true }...');
      await productsColl.createIndex({ barcode: 1 }, { unique: true, sparse: true, name: "barcode_1_sparse" });
      console.log('✅ Created barcode_1_sparse index successfully.');
    }

    console.log('\n--- 4. FINAL VERIFICATION SUMMARY ---');
    const updatedIndexes = await productsColl.indexes();
    const finalBarcodeIdx = updatedIndexes.find(i => i.name === 'barcode_1_sparse' || (i.key && i.key.barcode === 1));
    console.log('Final barcode index specification:', finalBarcodeIdx);
    console.log('✅ Production Barcode Database Verification: COMPLETE & SAFE.');

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  runBarcodeVerification();
}

module.exports = { runBarcodeVerification };
