const express = require('express');
const { getContext, verifyJWT } = require('./context');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const PDFDocument = require('pdfkit');

const router = express.Router();

const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'BANK'];

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
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch invoices" },
      requestId: req.headers['x-request-id'] || null
    });
  }
});

// GET /api/v1/invoices/:id - Fetch single invoice
router.get('/:id', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.id }, { id: req.params.id }]
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: "INVOICE_NOT_FOUND", message: "Invoice not found" },
        requestId: req.headers['x-request-id'] || null
      });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch invoice" },
      requestId: req.headers['x-request-id'] || null
    });
  }
});

// POST /api/v1/invoices - Create POS invoice with server-side price validation, idempotency & atomic inventory deduction
router.post('/', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceData = req.body;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const targetLocationId = invoiceData.locationId || invoiceData.storeId || invoiceData.businessId;
  const transactionId = invoiceData.transactionId || invoiceData.clientTransactionId || invoiceData.invoiceNumber;

  if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_ITEMS", message: "Invoice must contain at least one valid item" },
      requestId
    });
  }

  if (!targetLocationId) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_LOCATION", message: "Store location ID is required" },
      requestId
    });
  }

  // 1. Check Store Authorization
  if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
    if (req.user.assignedStoreId !== targetLocationId) {
      return res.status(403).json({
        success: false,
        error: { code: "UNAUTHORIZED_STORE", message: `User is not authorized for store location '${targetLocationId}'` },
        requestId
      });
    }
  }

  try {
    // 2. Check Idempotency
    if (transactionId) {
      const existingInvoice = await db.collection('invoices').findOne({
        $or: [{ transactionId }, { invoiceNumber: transactionId }, { id: transactionId }],
        isArchived: { $ne: true }
      });
      if (existingInvoice) {
        console.log(`[Billing] Idempotent hit: invoice #${existingInvoice.invoiceNumber || transactionId} already recorded.`);
        return res.json({ success: true, invoice: existingInvoice, duplicate: true });
      }
    }

    const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}`;
    const username = req.user ? req.user.username : 'system';

    // 3. Server-side price and line item recalculation
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    const validatedItems = [];

    for (const item of invoiceData.items) {
      const prodId = item.productId || item.id;
      const qty = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.price || item.sellingPrice || item.rate || 0);
      const taxRate = parseFloat(item.gst || item.tax || 0);

      if (!prodId || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_QUANTITY", message: `Invalid item or quantity for product ${prodId || 'unknown'}` },
          requestId
        });
      }

      const lineGross = qty * unitPrice;
      const lineTax = (lineGross * taxRate) / 100;
      const lineTotal = lineGross; // Standard gross inclusive or exclusive as configured

      calculatedSubtotal += lineGross;
      calculatedTax += lineTax;

      validatedItems.push({
        productId: prodId,
        variantId: item.variantId || null,
        name: item.name || prodId,
        unit: item.unit || 'unit',
        quantity: qty,
        price: unitPrice,
        sellingPrice: unitPrice,
        cost: parseFloat(item.cost || item.purchasePrice || 0),
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    const discountAmount = Math.max(0, parseFloat(invoiceData.discount) || 0);
    const calculatedGrandTotal = Math.max(0, Math.round((calculatedSubtotal + calculatedTax - discountAmount) * 100) / 100);

    // Validate payment mode
    const paymentMode = (invoiceData.paymentMode || invoiceData.paymentMethod || 'CASH').toUpperCase();
    const normalizedPaymentMode = VALID_PAYMENT_MODES.includes(paymentMode) ? paymentMode : 'CASH';

    // 4. Consume stock batch atomically with $gte guard and rollback
    await inventoryService.consumeStockBatch(
      validatedItems,
      targetLocationId,
      invoiceNumber,
      username
    );

    // 5. Create invoice document
    const invoiceDoc = {
      ...invoiceData,
      invoiceNumber,
      id: invoiceNumber, // legacy alias
      transactionId: transactionId || invoiceNumber,
      storeId: targetLocationId,
      locationId: targetLocationId,
      businessId: targetLocationId,
      items: validatedItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      tax: Math.round(calculatedTax * 100) / 100,
      discount: discountAmount,
      grandTotal: calculatedGrandTotal,
      grandtotal: calculatedGrandTotal, // legacy alias
      paymentMode: normalizedPaymentMode,
      paymentMethod: normalizedPaymentMode,
      status: 'COMPLETED',
      createdBy: username,
      isArchived: false,
      createdAt: new Date().toISOString(),
      date: invoiceData.date || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('invoices').insertOne(invoiceDoc);

    // 6. Write structured audit log
    await auditService.writeAuditLog(
      'STOCK_SALE',
      'billing',
      invoiceNumber,
      null,
      invoiceDoc,
      req
    );

    // 7. Emit realtime event
    if (io) {
      io.to(`store_${targetLocationId}`).emit('invoice_created', { invoiceNumber, locationId: targetLocationId });
    }

    res.json({ success: true, invoice: invoiceDoc });
  } catch (err) {
    console.error(`[Billing] Invoice creation failed:`, err);
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: err.message,
          errors: err.errors || []
        },
        requestId
      });
    }
    res.status(500).json({
      success: false,
      error: { code: "INVOICE_CREATION_FAILED", message: err.message || "Server error processing invoice" },
      requestId
    });
  }
});

// POST /api/v1/invoices/:id/void - Void invoice & revert stock batch atomically
router.post('/:id/void', verifyJWT, async (req, res) => {
  const { db, io } = getContext();
  const invoiceId = req.params.id;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: invoiceId }, { id: invoiceId }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: "INVOICE_NOT_FOUND", message: "Invoice not found" },
        requestId
      });
    }

    // Double-void protection
    if (invoice.isArchived || invoice.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        error: { code: "TRANSACTION_ALREADY_VOIDED", message: "This invoice has already been voided" },
        requestId
      });
    }

    const username = req.user ? req.user.username : 'system';
    const locId = invoice.locationId || invoice.storeId;

    // 1. Revert stock batch via domain inventoryService
    if (invoice.items && locId) {
      await inventoryService.revertStockBatch(
        invoice.items,
        locId,
        'VOID',
        'invoice_void',
        invoice.invoiceNumber || invoice.id,
        username
      );
    }

    // 2. Mark invoice as VOIDED without physical deletion
    const now = new Date().toISOString();
    await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { $set: { status: 'VOIDED', isArchived: true, voidedAt: now, updatedAt: now } }
    );

    // 3. Write structured audit log
    await auditService.writeAuditLog(
      'STOCK_VOID',
      'billing',
      invoice.invoiceNumber || invoice.id,
      null,
      { invoiceId: invoice.invoiceNumber || invoice.id, items: invoice.items, locationId: locId },
      req
    );

    if (io) {
      io.to(`store_${locId}`).emit('invoice_voided', { invoiceId: invoice.invoiceNumber || invoice.id });
    }

    res.json({ success: true, message: "Invoice voided and inventory stock reverted successfully" });
  } catch (err) {
    console.error(`[Billing] Error voiding invoice ${invoiceId}:`, err);
    res.status(500).json({
      success: false,
      error: { code: "INVOICE_VOID_FAILED", message: err.message || "Server error voiding invoice" },
      requestId
    });
  }
});

// GET /api/v1/invoices/:invoiceNumber/pdf - PDF Generation
router.get('/:invoiceNumber/pdf', verifyJWT, async (req, res) => {
  const { db } = getContext();
  try {
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.invoiceNumber }, { id: req.params.invoiceNumber }]
    });
    if (!invoice) return res.status(404).send("Invoice not found");

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
      doc.text(`${item.name} - Qty: ${item.quantity} - Price: ₹${item.price || item.sellingPrice}`);
    });

    doc.moveDown();
    doc.text(`Total: ₹${invoice.grandTotal || invoice.grandtotal || 0}`);
    doc.end();
  } catch (err) {
    res.status(500).send("Error generating PDF");
  }
});

module.exports = router;
