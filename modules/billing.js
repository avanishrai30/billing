const express = require('express');
const { getContext, verifyJWT, writeAuditLog, recordInventoryMovement } = require('./context');
const PDFDocument = require('pdfkit');

const router = express.Router();

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

    // Record inventory movements for sold items
    for (const item of invoiceDoc.items) {
      if (item.productId) {
        await recordInventoryMovement(
          item.productId,
          invoiceDoc.storeId,
          'sale',
          -Math.abs(item.quantity),
          'invoice',
          invoiceNumber,
          req.user.username
        );
      }
    }

    await writeAuditLog('invoice_created', 'billing', invoiceNumber, null, invoiceDoc, req);
    io.to(`store_${invoiceDoc.storeId}`).emit('invoice_created', { invoiceNumber });
    res.json({ success: true, invoice: invoiceDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error creating invoice" });
  }
});

router.post('/:id/void', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceId = req.params.id;

  try {
    const invoice = await db.collection('invoices').findOne({ invoiceNumber: invoiceId });
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (invoice.isArchived) return res.status(400).json({ success: false, message: "Invoice already voided" });

    await db.collection('invoices').updateOne(
      { invoiceNumber: invoiceId },
      { $set: { isArchived: true, voidedAt: new Date().toISOString() } }
    );

    // Revert inventory
    if (invoice.items) {
      for (const item of invoice.items) {
        if (item.productId) {
          await recordInventoryMovement(
            item.productId,
            invoice.storeId,
            'void_return',
            Math.abs(item.quantity),
            'invoice_void',
            invoiceId,
            req.user.username
          );
        }
      }
    }

    await writeAuditLog('invoice_voided', 'billing', invoiceId, null, null, req);
    io.to(`store_${invoice.storeId}`).emit('invoice_voided', { invoiceId });
    res.json({ success: true, message: "Invoice voided" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error voiding invoice" });
  }
});

router.get('/:invoiceNumber/pdf', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoice = await db.collection('invoices').findOne({ invoiceNumber: req.params.invoiceNumber });
    if (!invoice) return res.status(404).send("Not found");

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text(`Invoice ${invoice.invoiceNumber}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Date: ${invoice.createdAt}`);
    doc.text(`Store ID: ${invoice.storeId}`);
    doc.text(`Customer: ${invoice.customerName || 'Walk-in'}`);
    doc.moveDown();

    (invoice.items || []).forEach(item => {
      doc.text(`${item.name} - Qty: ${item.quantity} - Price: ${item.price}`);
    });

    doc.moveDown();
    doc.text(`Total: ${invoice.grandTotal || 0}`);
    doc.end();
  } catch (err) {
    res.status(500).send("Error generating PDF");
  }
});

module.exports = router;
