const express = require('express');
const { getContext } = require('./context');

const router = express.Router();

// POST /api/v1/scan & /api/scan - Process barcode scan from mobile simulator
router.post('/', async (req, res) => {
  const { sessionId, barcode } = req.body;
  if (!sessionId || !barcode) {
    return res.status(400).json({ success: false, message: "Missing sessionId or barcode number" });
  }

  const { db, io } = getContext();
  try {
    let product = await db.collection('products').findOne({
      $or: [{ barcode: String(barcode).trim() }, { sku: String(barcode).trim() }]
    });

    if (!product) {
      const barcodeMapping = await db.collection('product_barcodes').findOne({ barcode: String(barcode).trim() });
      if (barcodeMapping) {
        product = await db.collection('products').findOne({ id: barcodeMapping.productId });
        if (product) {
          product.scannedVariantName = barcodeMapping.variantName;
        }
      }
    }

    if (product) {
      if (io) io.to(sessionId).emit('PRODUCT_ADDED', { product });
      return res.json({ success: true, product });
    } else {
      if (io) io.to(sessionId).emit('PRODUCT_NOT_FOUND', { barcode });
      return res.status(404).json({ success: false, message: "Product not found" });
    }
  } catch (err) {
    console.error("Barcode scan error:", err);
    res.status(500).json({ success: false, message: "Barcode scanner check failed" });
  }
});

module.exports = router;
