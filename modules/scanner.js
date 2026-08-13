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
  const cleanBarcode = String(barcode).trim();

  try {
    // 1. Match primary product document
    let product = await db.collection('products').findOne({
      $or: [{ barcode: cleanBarcode }, { sku: cleanBarcode }],
      isArchived: { $ne: true }
    });

    // 2. Fallback to active variant/alternate barcode in product_barcodes table
    if (!product) {
      const barcodeMapping = await db.collection('product_barcodes').findOne({
        barcode: cleanBarcode,
        active: true
      });
      if (barcodeMapping) {
        product = await db.collection('products').findOne({
          id: barcodeMapping.productId,
          isArchived: { $ne: true }
        });
        if (product) {
          product.scannedVariantName = barcodeMapping.variantName;
          product.scannedBarcodeType = barcodeMapping.type;
        }
      }
    }

    if (product) {
      if (io) io.to(sessionId).emit('PRODUCT_ADDED', { product });
      return res.json({ success: true, product });
    } else {
      if (io) io.to(sessionId).emit('PRODUCT_NOT_FOUND', { barcode: cleanBarcode });
      return res.status(404).json({ success: false, message: "Product not found" });
    }
  } catch (err) {
    console.error("Barcode scan error:", err);
    res.status(500).json({ success: false, message: "Barcode scanner check failed" });
  }
});

module.exports = router;
