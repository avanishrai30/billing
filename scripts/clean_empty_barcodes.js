const { MongoClient } = require('mongodb');

/**
 * Migration Script: Safely unsets empty/blank barcode fields from products collection
 * to prevent collisions on sparse unique index { barcode: 1 }.
 */
async function cleanEmptyBarcodes() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vc_organic";
  console.log(`Connecting to MongoDB...`);
  
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();

    const emptyCount = await db.collection('products').countDocuments({
      $or: [
        { barcode: "" },
        { barcode: { $type: "string", $regex: /^\s*$/ } }
      ]
    });

    console.log(`Found ${emptyCount} product(s) with empty-string/whitespace barcodes.`);

    if (emptyCount > 0) {
      const result = await db.collection('products').updateMany(
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
      console.log(`Successfully unset barcode field from ${result.modifiedCount} product(s).`);
    } else {
      console.log(`No product records with empty-string barcodes found. Database is clean.`);
    }

    // Clean any empty barcodes from product_barcodes collection
    const emptyBarcodesCount = await db.collection('product_barcodes').countDocuments({
      $or: [
        { barcode: "" },
        { barcode: null },
        { barcode: { $type: "string", $regex: /^\s*$/ } }
      ]
    });

    if (emptyBarcodesCount > 0) {
      const bResult = await db.collection('product_barcodes').deleteMany({
        $or: [
          { barcode: "" },
          { barcode: null },
          { barcode: { $type: "string", $regex: /^\s*$/ } }
        ]
      });
      console.log(`Removed ${bResult.deletedCount} empty barcode entries from product_barcodes.`);
    }

  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  cleanEmptyBarcodes();
}

module.exports = { cleanEmptyBarcodes };
