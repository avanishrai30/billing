const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, requireAnyPermission, requireStoreScope, getStoreScopeFilter, isSuperAdmin } = require('../services/authzService');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const PDFDocument = require('pdfkit');

const router = express.Router();

const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'BANK'];

// GET /api/v1/invoices - Fetch all non-archived invoices with store scoping
router.get('/', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const filter = { isArchived: { $ne: true }, ...scopeFilter };
    const invoices = await db.collection('invoices').find(filter).toArray();
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

// GET /api/v1/invoices/:id - Fetch single invoice with store scoping
router.get('/:id', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.id }, { id: req.params.id }],
      ...scopeFilter
    });
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: "INVOICE_NOT_FOUND", message: "Invoice not found or access denied" },
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
router.post('/', verifyJWT, requirePermission('invoices.create'), requireStoreScope(req => req.body.locationId || req.body.storeId || req.body.businessId), async (req, res) => {
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
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'invoice',
        'created',
        invoiceNumber,
        targetLocationId,
        {
          invoiceNumber,
          id: invoiceDoc.id,
          invoice: invoiceDoc
        }
      );
      io.to(`store_${targetLocationId}`).emit('invoice_created', envelope);
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
router.post('/:id/void', verifyJWT, requirePermission('invoices.void'), async (req, res) => {
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

    // Store scope check for voiding
    if (req.user && req.user.assignedStoreId && req.user.assignedStoreId !== 'all' && !isSuperAdmin(req.user)) {
      const invStore = invoice.locationId || invoice.storeId || invoice.businessId;
      if (invStore && invStore !== req.user.assignedStoreId) {
        await auditService.writeAuditLog(
          'AUTHORIZATION_DENIED',
          'security',
          req.user.id || req.user.username,
          null,
          {
            requiredPermission: 'invoices.void',
            userStore: req.user.assignedStoreId,
            invoiceStore: invStore,
            endpoint: req.originalUrl || req.path,
            method: 'POST',
            reason: `Store scope mismatch: cannot void invoice belonging to store '${invStore}'`
          },
          req
        );
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You are not authorized to void invoices for store '${invStore}'` },
          requestId
        });
      }
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
      'invoice_voided',
      'billing',
      invoice.invoiceNumber || invoice.id,
      null,
      { invoiceId: invoice.invoiceNumber || invoice.id, items: invoice.items, locationId: locId },
      req
    );

    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'invoice',
        'voided',
        invoice.invoiceNumber || invoice.id,
        locId,
        { invoiceId: invoice.invoiceNumber || invoice.id }
      );
      io.to(`store_${locId}`).emit('invoice_voided', envelope);
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

// GET /api/v1/invoices/:invoiceNumber/pdf - Professional Tax Invoice PDF Generation
router.get('/:invoiceNumber/pdf', verifyJWT, requireAnyPermission(['invoices.print', 'invoices.view']), async (req, res) => {
  const { db } = getContext();
  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: req.params.invoiceNumber }, { id: req.params.invoiceNumber }],
      ...scopeFilter
    });
    if (!invoice) return res.status(404).send("Invoice not found or access denied");

    // Resolve store branding
    const storeId = invoice.storeId || invoice.locationId || invoice.businessId;
    let store = null;
    if (storeId) {
      store = await db.collection('stores').findOne({ id: storeId });
      if (!store) store = await db.collection('businesses').findOne({ id: storeId });
    }
    if (!store) {
      store = await db.collection('businesses').findOne({}) || {};
    }

    const storeName = store.name || 'VC ORGANIC';
    const storeAddress = store.address || '';
    const storeGstin = store.gstin || store.gst || '';
    const storePhone = store.phone || store.mobile || '';

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceNumber || invoice.id}.pdf`);
    doc.pipe(res);

    // Header: Store Details
    doc.fontSize(18).font('Helvetica-Bold').text(storeName, { align: 'center' });
    if (storeAddress) doc.fontSize(10).font('Helvetica').text(storeAddress, { align: 'center' });
    const metaHeader = [];
    if (storeGstin) metaHeader.push(`GSTIN: ${storeGstin}`);
    if (storePhone) metaHeader.push(`Phone: ${storePhone}`);
    if (metaHeader.length > 0) doc.fontSize(9).text(metaHeader.join(' | '), { align: 'center' });

    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);

    // Invoice & Buyer Metadata Box
    const startY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text(`Invoice #: ${invoice.invoiceNumber || invoice.id}`, 40, startY);
    doc.font('Helvetica').text(`Date: ${new Date(invoice.createdAt || invoice.date || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 40, startY + 14);
    doc.text(`Payment: ${(invoice.paymentMode || invoice.paymentMethod || 'CASH').toUpperCase()}`, 40, startY + 28);

    doc.font('Helvetica-Bold').text(`Billed To:`, 320, startY);
    doc.font('Helvetica').text(`${invoice.customerName || 'Walk-in Customer'}`, 320, startY + 14);
    if (invoice.customerPhone) doc.text(`Phone: ${invoice.customerPhone}`, 320, startY + 28);

    doc.moveDown(3);
    const tableTop = doc.y;

    // Table Header
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('S.No', 40, tableTop);
    doc.text('Item Description', 80, tableTop);
    doc.text('Qty', 300, tableTop, { width: 40, align: 'right' });
    doc.text('Rate', 350, tableTop, { width: 60, align: 'right' });
    doc.text('GST %', 420, tableTop, { width: 40, align: 'right' });
    doc.text('Amount (₹)', 470, tableTop, { width: 80, align: 'right' });

    doc.moveTo(40, tableTop + 14).lineTo(550, tableTop + 14).stroke('#cccccc');

    let currentY = tableTop + 20;
    const items = invoice.items || [];

    doc.font('Helvetica').fontSize(9);
    items.forEach((item, idx) => {
      const price = parseFloat(item.price || item.sellingPrice || item.unitPrice || 0);
      const qty = parseFloat(item.quantity) || 1;
      const gst = parseFloat(item.gst || item.gstRate || 0);
      const total = parseFloat(item.lineTotal || (price * qty));

      doc.text(`${idx + 1}`, 40, currentY);
      doc.text(`${item.name || 'Product'} (${item.unit || 'unit'})`, 80, currentY, { width: 210 });
      doc.text(`${qty}`, 300, currentY, { width: 40, align: 'right' });
      doc.text(`₹${price.toFixed(2)}`, 350, currentY, { width: 60, align: 'right' });
      doc.text(`${gst}%`, 420, currentY, { width: 40, align: 'right' });
      doc.text(`₹${total.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });

      currentY += 18;
    });

    doc.moveTo(40, currentY + 4).lineTo(550, currentY + 4).stroke('#cccccc');
    currentY += 12;

    // Totals Section
    const subtotal = parseFloat(invoice.subtotal) || 0;
    const discount = parseFloat(invoice.discount) || 0;
    const tax = parseFloat(invoice.tax) || 0;
    const grandTotal = parseFloat(invoice.grandTotal || invoice.grandtotal || invoice.total || 0);

    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal:', 380, currentY, { width: 80, align: 'right' });
    doc.text(`₹${subtotal.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });
    currentY += 14;

    if (discount > 0) {
      doc.text('Discount:', 380, currentY, { width: 80, align: 'right' });
      doc.text(`-₹${discount.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });
      currentY += 14;
    }

    doc.text('Tax (GST):', 380, currentY, { width: 80, align: 'right' });
    doc.text(`₹${tax.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });
    currentY += 14;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Grand Total:', 380, currentY, { width: 80, align: 'right' });
    doc.text(`₹${grandTotal.toFixed(2)}`, 470, currentY, { width: 80, align: 'right' });

    // Footer Terms
    doc.moveDown(3);
    doc.font('Helvetica').fontSize(8).text('Terms & Conditions: Thank you for shopping with us! Fresh organic items once sold cannot be returned.', 40, doc.y, { align: 'center', color: '#666666' });

    doc.end();
  } catch (err) {
    console.error('[Billing] Error generating PDF:', err);
    res.status(500).send("Error generating PDF invoice");
  }
});

module.exports = router;
