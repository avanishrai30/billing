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

// POST /api/v1/invoices - Create POS invoice & consume inventory stock via inventoryService
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceData = req.body;
  if (!invoiceData.items || !invoiceData.storeId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}`;
    const invoiceDoc = {
      ...invoiceData,
      invoiceNumber,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    await db.collection('invoices').insertOne(invoiceDoc);

    // Consume stock via domain inventoryService
    await inventoryService.consumeStock(
      invoiceDoc.items,
      invoiceDoc.storeId,
      invoiceNumber,
      req.user ? req.user.username : 'system'
    );

    await auditService.writeAuditLog('invoice_created', 'billing', invoiceNumber, null, invoiceDoc, req);
    if (io) {
      io.to(`store_${invoiceDoc.storeId}`).emit('invoice_created', { invoiceNumber });
    }
    res.json({ success: true, invoice: invoiceDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error creating invoice" });
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

    // Revert stock via domain inventoryService
    if (invoice.items) {
      await inventoryService.revertStock(
        invoice.items,
        invoice.storeId,
        'void_sale',
        'invoice_void',
        invoice.invoiceNumber || invoiceId,
        req.user ? req.user.username : 'system'
      );
    }

    await auditService.writeAuditLog('invoice_voided', 'billing', invoice.invoiceNumber || invoiceId, null, null, req);
    if (io) {
      io.to(`store_${invoice.storeId}`).emit('invoice_voided', { invoiceId });
    }
    res.json({ success: true, message: "Invoice voided" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error voiding invoice" });
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
    doc.text(`Store ID: ${invoice.storeId}`);
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
