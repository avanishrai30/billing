const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { getContext, verifyJWT } = require('./context');

const router = express.Router();

// POST /api/v1/upload & /api/upload - Base64 media upload with Sharp optimization
router.post('/', verifyJWT, async (req, res) => {
  const { fileName, base64Data } = req.body;
  const uploadType = req.query.type || 'products'; // products, invoices, logos, employees, temp
  
  if (!fileName || !base64Data) {
    return res.status(400).json({ success: false, message: "Missing fileName or image base64Data" });
  }

  // Whitelist upload types to prevent path traversal
  const allowedTypes = ['products', 'invoices', 'purchase-bills', 'users', 'stores', 'temp', 'logos', 'employees'];
  const safeType = allowedTypes.includes(uploadType) ? uploadType : 'products';

  const { db, UPLOAD_SUBDIRS } = getContext();
  const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';

  if (safeType === 'products') {
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PRODUCT_ID_REQUIRED', message: 'productId is required when uploading a product image' },
        message: 'productId is required when uploading a product image'
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: { code: 'DATABASE_UNAVAILABLE', message: 'Database context is required for product image uploads' },
        message: 'Database context is required for product image uploads'
      });
    }

    const product = await db.collection('products').findOne({
      $or: [{ id: productId }, { _id: productId }, { sku: productId }],
      isArchived: { $ne: true }
    });

    if (!product) {
      return res.status(400).json({
        success: false,
        error: { code: 'PRODUCT_MASTER_NOT_FOUND', message: `Product Master not found for '${productId}'` },
        message: `Product Master not found for '${productId}'`
      });
    }
  }

  const targetDir = (UPLOAD_SUBDIRS && UPLOAD_SUBDIRS[safeType]) || path.join(process.cwd(), 'uploads', safeType);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  try {
    const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Str, 'base64');

    const cleanBaseName = path.basename(fileName, path.extname(fileName))
                              .toLowerCase()
                              .replace(/[^a-z0-9\-]/g, '-');
    const outputFileName = `${cleanBaseName}-${Date.now()}.webp`;
    const targetPath = path.join(targetDir, outputFileName);

    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80 })
      .toFile(targetPath);

    let stats = fs.statSync(targetPath);
    if (stats.size > 200 * 1024) {
      await sharp(targetPath)
        .webp({ quality: 60 })
        .toFile(targetPath);
      stats = fs.statSync(targetPath);
    }

    const imagePath = `/uploads/${safeType}/${outputFileName}`;
    const imageId = `img-${Date.now()}`;

    if (safeType === 'products') {
      await db.collection('product_images').insertOne({
        id: imageId,
        productId,
        filename: outputFileName,
        filepath: targetPath,
        webpPath: imagePath,
        size: `${Math.round(stats.size / 1024)}KB`,
        mimeType: "image/webp",
        width: 800,
        height: 800,
        uploadedBy: req.user ? req.user.username : "system",
        createdAt: new Date().toISOString()
      });

      await db.collection('products').updateOne(
        { id: productId },
        {
          $set: {
            image: imagePath,
            imageId,
            updatedAt: new Date().toISOString()
          }
        }
      );
    }

    res.json({ success: true, imagePath, imageId, productId: safeType === 'products' ? productId : undefined });
  } catch (err) {
    console.error("Image upload failed:", err);
    res.status(500).json({ success: false, message: "Failed to optimize and upload image" });
  }
});

module.exports = router;
