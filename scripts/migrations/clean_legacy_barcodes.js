const { MongoClient } = require('mongodb');

/**
 * Migration Script: Clean Legacy Empty Barcodes (Stage 12 Final Integrity Pass)
 * Explicit, idempotent migration tool with dry-run and apply modes.
 * Separates data cleanup from application startup.
 * 
 * Usage:
 *   node scripts/migrations/clean_legacy_barcodes.js --dry-run
 *   node scripts/migrations/clean_legacy_barcodes.js --apply
 */

async function runBarcodeMigration(db, options = { apply: false }) {
  if (!db) {
    throw new Error("[Migration] Database handle required.");
  }

  const isApply = !!options.apply;
  console.log(`[Migration] Running barcode cleanup migration in [${isApply ? 'APPLY' : 'DRY-RUN'}] mode...`);

  // 1. Inspect products collection for empty/whitespace barcodes
  const productFilter = {
    $or: [
      { barcode: "" },
      { barcode: { $type: "string", $regex: /^\s*$/ } }
    ]
  };

  const matchingProductsCount = await db.collection('products').countDocuments(productFilter);
  console.log(`[Migration] Found ${matchingProductsCount} product document(s) with empty-string or whitespace barcode.`);

  // 2. Inspect product_barcodes collection for empty or null barcode entries
  const barcodeMappingFilter = {
    $or: [
      { barcode: "" },
      { barcode: null },
      { barcode: { $type: "string", $regex: /^\s*$/ } }
    ]
  };

  const matchingBarcodesCount = await db.collection('product_barcodes').countDocuments(barcodeMappingFilter);
  console.log(`[Migration] Found ${matchingBarcodesCount} invalid mapping record(s) in product_barcodes.`);

  const report = {
    mode: isApply ? 'APPLY' : 'DRY-RUN',
    productsIdentified: matchingProductsCount,
    productBarcodesIdentified: matchingBarcodesCount,
    productsModified: 0,
    productBarcodesDeleted: 0,
    timestamp: new Date().toISOString()
  };

  if (!isApply) {
    console.log(`[Migration: DRY-RUN] Zero mutations performed. Re-run with --apply to execute changes.`);
    return report;
  }

  // Execute mutations only in apply mode
  if (matchingProductsCount > 0) {
    const pResult = await db.collection('products').updateMany(productFilter, {
      $unset: { barcode: "" }
    });
    report.productsModified = pResult.modifiedCount;
    console.log(`[Migration: APPLY] Successfully unset empty barcode on ${pResult.modifiedCount} product document(s).`);
  }

  if (matchingBarcodesCount > 0) {
    const bResult = await db.collection('product_barcodes').deleteMany(barcodeMappingFilter);
    report.productBarcodesDeleted = bResult.deletedCount;
    console.log(`[Migration: APPLY] Successfully deleted ${bResult.deletedCount} invalid mapping(s) from product_barcodes.`);
  }

  console.log(`[Migration: APPLY] Migration completed successfully.`);
  return report;
}

// CLI runner
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const applyFlag = args.includes('--apply');
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vc_organic";

    console.log(`[Migration CLI] Connecting to ${uri}...`);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      const db = client.db();
      const report = await runBarcodeMigration(db, { apply: applyFlag });
      console.log("[Migration CLI] Execution Summary:", JSON.stringify(report, null, 2));
    } catch (err) {
      console.error("[Migration CLI] Error during migration execution:", err.message);
      process.exit(1);
    } finally {
      await client.close();
    }
  })();
}

module.exports = { runBarcodeMigration };
