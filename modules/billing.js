const express = require('express');
const { getContext, verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const PDFDocument = require('pdfkit');

const router = express.Router();

// GET /api/v1/invoices - Fetch all non-archived invoices
router.get('/', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoices = await db.collection('invoices').find({ isArchived: { $ne: true } }).toArray();
    const normalizedInvoices = invoices.map(inv => ({
      ...inv,
      id: inv.id || inv.invoiceNumber || (inv._id ? inv._id.toString() : ""),
      date: inv.date || inv.createdAt || new Date().toISOString()
    }));
    res.json(normalizedInvoices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET /api/v1/invoices/:id - Fetch single invoice
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.id }, { id: req.params.id }]
    });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// POST /api/v1/invoices - Create POS invoice & consume inventory stock atomically via inventoryService
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceData = req.body;
  const targetLocationId = invoiceData.storeId || invoiceData.locationId;

  if (!invoiceData.items || !targetLocationId) {
    return res.status(400).json({ success: false, message: "Missing required fields: items, storeId/locationId" });
  }

  const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}`;
  const username = req.user ? req.user.username : 'system';

  try {
    // 1. Consume stock batch with atomic $gte guard and automatic rollback
    await inventoryService.consumeStockBatch(
      invoiceData.items,
      targetLocationId,
      invoiceNumber,
      username
    );

    // 2. Insert invoice document only after successful stock deduction
    const invoiceDoc = {
      ...invoiceData,
      invoiceNumber,
      storeId: targetLocationId,
      locationId: targetLocationId,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    await db.collection('invoices').insertOne(invoiceDoc);

    // 3. Write structured audit log
    await auditService.writeAuditLog(
      'STOCK_SALE',
      'billing',
      invoiceNumber,
      null,
      invoiceDoc,
      req
    );

    // 4. Emit realtime event
    if (io) {
      io.to(`store_${targetLocationId}`).emit('invoice_created', { invoiceNumber });
    }

    res.json({ success: true, invoice: invoiceDoc });
  } catch (err) {
    console.error(`[Billing] Invoice #${invoiceNumber} creation failed:`, err);
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_STOCK',
        message: err.message,
        errors: err.errors || []
      });
    }
    res.status(500).json({ success: false, message: err.message || "Server error creating invoice" });
  }
});

// POST /api/v1/invoices/:id/void - Void invoice & revert stock via inventoryService
router.post('/:id/void', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceId = req.params.id;

  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: invoiceId }, { id: invoiceId }]
    });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.isArchived) return res.status(400).json({ success: false, message: "Invoice already voided" });

    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { $set: { isArchived: true, voidedAt: new Date().toISOString() } }
    );

    // Revert stock batch via domain inventoryService
    if (invoice.items) {
      await inventoryService.revertStockBatch(
        invoice.items,
        invoice.storeId || invoice.locationId,
        'VOID',
        'invoice_void',
        invoice.invoiceNumber || invoiceId,
        req.user ? req.user.username : 'system'
      );
    }

    await auditService.writeAuditLog(
      'STOCK_VOID',
      'billing',
      invoice.invoiceNumber || invoiceId,
      null,
      { invoiceId: invoice.invoiceNumber || invoiceId, items: invoice.items },
      req
    );

    if (io) {
      io.to(`store_${invoice.storeId || invoice.locationId}`).emit('invoice_voided', { invoiceId });
    }
    res.json({ success: true, message: "Invoice voided and inventory stock reverted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Server error voiding invoice" });
  }
});

// GET /api/v1/invoices/:invoiceNumber/pdf - PDF Generation
router.get('/:invoiceNumber/pdf', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.invoiceNumber }, { id: req.params.invoiceNumber }]
    });
    if (!invoice) return res.status(404).send("Not found");

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber || invoice.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text(`Invoice ${invoice.invoiceNumber || invoice.id}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${invoice.createdAt || invoice.date}`);
    doc.text(`Store ID: ${invoice.storeId || invoice.locationId}`);
    doc.text(`Customer: ${invoice.customerName || 'Walk-in'}`);
    doc.moveDown();

    (invoice.items || []).forEach(item => {
      doc.text(`${item.name} - Qty: ${item.quantity} - Price: ₹${item.price}`);
    });

    doc.moveDown();
    doc.text(`Total: ₹${invoice.grandTotal || invoice.grandtotal || 0}`);
    doc.end();
  } catch (err) {
    res.status(500).send("Error generating PDF");
  }
});

module.exports = router;
