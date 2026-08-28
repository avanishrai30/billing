const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, requireAnyPermission, requireStoreScope, getStoreScopeFilter, isSuperAdmin, assertStoreAccess } = require('../services/authzService');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');
const { resolveCustomerSnapshot } = require('../services/customerIdentityService');
const PDFDocument = require('pdfkit');

const router = express.Router();

const VALID_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'BANK'];

function getTransactionKey(body = {}, fallback) {
  return body.transactionId || body.clientTransactionId || body.returnId || body.exchangeId || fallback;
}

async function rollbackAddedStock(items, locationId, referenceId, performedBy, notes) {
  const rollbackFailures = [];

  for (const item of items || []) {
    const prodId = item.productId || item.id;
    const qty = parseFloat(item.quantity) || 0;
    if (!prodId || qty <= 0) continue;

    try {
      await inventoryService.recordMovementAtomic({
        productId: prodId,
        locationId,
        locationType: 'STORE',
        type: 'VOID',
        quantityDelta: -qty,
        referenceType: 'rollback',
        referenceId,
        performedBy: performedBy || 'system',
        notes: notes || `Compensating rollback for #${referenceId}`
      });
    } catch (err) {
      rollbackFailures.push({ productId: prodId, quantity: qty, error: err.message });
    }
  }

  if (rollbackFailures.length > 0) {
    const err = new Error('Critical rollback failure while reversing added stock');
    err.code = 'CRITICAL_ROLLBACK_FAILURE';
    err.rollbackFailures = rollbackFailures;
    throw err;
  }
}

// GET /api/v1/invoices - Fetch paginated non-archived invoices with store scoping and date filtering (Stage 12 P0)
router.get('/', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const filter = { isArchived: { $ne: true }, ...scopeFilter };

    // Query Filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.customerId) {
      filter.customerId = req.query.customerId;
    }
    if (req.query.locationId || req.query.storeId) {
      const loc = req.query.locationId || req.query.storeId;
      filter.$or = [{ locationId: loc }, { storeId: loc }, { businessId: loc }];
    }
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = req.query.startDate;
      if (req.query.endDate) filter.createdAt.$lte = req.query.endDate;
    }

    // Pagination configuration (default 50, max 100)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = req.query.skip !== undefined ? Math.max(0, parseInt(req.query.skip) || 0) : (page - 1) * limit;

    const total = await db.collection('invoices').countDocuments(filter);
    const invoices = await db.collection('invoices')
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const normalizedInvoices = invoices.map(inv => ({
      ...inv,
      id: inv.id || inv.invoiceNumber || (inv._id ? inv._id.toString() : ""),
      date: inv.date || inv.createdAt || new Date().toISOString()
    }));

    res.json({
      success: true,
      invoices: normalizedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (skip + limit) < total,
        hasPrev: page > 1
      },
      requestId
    });
  } catch (err) {
    console.error("[Billing] Error fetching paginated invoices:", err);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Failed to fetch invoices" },
      requestId
    });
  }
});

// GET /api/v1/invoices/search-returns - Search eligible original sales by receipt number, customer phone, or barcode
router.get('/search-returns', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const query = String(req.query.query || req.query.q || '').trim();

  if (!query) {
    return res.json({ success: true, invoices: [], requestId });
  }

  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const cleanPhone = query.replace(/\D/g, '');
    const normalizedQueryPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const orConditions = [
      { invoiceNumber: { $regex: query, $options: 'i' } },
      { id: { $regex: query, $options: 'i' } },
      { customerName: { $regex: query, $options: 'i' } },
      { 'items.barcode': query },
      { 'items.sku': { $regex: query, $options: 'i' } }
    ];

    if (normalizedQueryPhone.length >= 4) {
      orConditions.push({ customerPhone: { $regex: normalizedQueryPhone } });
    }

    const filter = {
      isArchived: { $ne: true },
      status: { $nin: ['VOIDED'] },
      $or: orConditions,
      ...scopeFilter
    };

    const invoices = await db.collection('invoices')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    // Enrich invoices with return eligibility calculations
    const enrichedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        const invId = inv.invoiceNumber || inv.id;
        const returns = await db.collection('returns').find({
          $or: [
            { originalInvoiceId: invId },
            { originalInvoiceNumber: invId },
            { originalInvoiceId: inv._id ? inv._id.toString() : '' }
          ]
        }).toArray();

        const returnedQtyMap = {};
        for (const ret of returns) {
          for (const item of (ret.returnedItems || [])) {
            const pid = item.productId || item.id;
            returnedQtyMap[pid] = (returnedQtyMap[pid] || 0) + (parseFloat(item.quantity) || 0);
          }
        }

        const itemsWithReturnStatus = (inv.items || []).map((it) => {
          const pid = it.productId || it.id;
          const soldQty = parseFloat(it.quantity) || 0;
          const returnedQty = returnedQtyMap[pid] || 0;
          const returnableQty = Math.max(0, soldQty - returnedQty);
          return {
            ...it,
            soldQuantity: soldQty,
            alreadyReturnedQuantity: returnedQty,
            returnableQuantity: returnableQty
          };
        });

        const totalReturnableQty = itemsWithReturnStatus.reduce((sum, it) => sum + it.returnableQuantity, 0);

        return {
          ...inv,
          id: inv.id || inv.invoiceNumber,
          date: inv.date || inv.createdAt,
          items: itemsWithReturnStatus,
          returnsCount: returns.length,
          hasReturnableItems: totalReturnableQty > 0,
          totalReturnableQty
        };
      })
    );

    res.json({
      success: true,
      invoices: enrichedInvoices,
      requestId
    });
  } catch (err) {
    console.error('[Billing] Error searching return invoices:', err);
    res.status(500).json({
      success: false,
      error: { code: 'SEARCH_ERROR', message: 'Failed to search return invoices' },
      requestId
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
  try {
    assertStoreAccess(req.user, targetLocationId);
  } catch (authErr) {
    return res.status(403).json({
      success: false,
      error: { code: "STORE_ACCESS_DENIED", message: authErr.message },
      requestId
    });
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

      if (!prodId || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_QUANTITY", message: `Invalid item or quantity for product ${prodId || 'unknown'}` },
          requestId
        });
      }

      const product = await db.collection('products').findOne({ id: prodId, isArchived: { $ne: true } });
      if (!product) {
        return res.status(409).json({
          success: false,
          error: { code: 'PRODUCT_MASTER_NOT_FOUND', message: `Product Master not found for ${prodId}` },
          requestId
        });
      }

      const unitPrice = parseFloat(product.sellingPrice ?? product.price ?? item.price ?? item.sellingPrice ?? item.rate ?? 0) || 0;
      const taxRate = parseFloat(product.gst ?? product.tax ?? item.gst ?? item.tax ?? 0) || 0;

      const lineGross = qty * unitPrice;
      const lineTax = (lineGross * taxRate) / 100;
      const lineTotal = lineGross; // Standard gross inclusive or exclusive as configured

      calculatedSubtotal += lineGross;
      calculatedTax += lineTax;

      validatedItems.push({
        productId: prodId,
        variantId: item.variantId || null,
        name: product.name || item.name || prodId,
        unit: product.unit || item.unit || 'unit',
        quantity: qty,
        price: unitPrice,
        sellingPrice: unitPrice,
        cost: parseFloat(product.cost ?? product.purchasePrice ?? item.cost ?? item.purchasePrice ?? 0) || 0,
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    const discountAmount = Math.max(0, parseFloat(invoiceData.discount) || 0);
    const calculatedGrandTotal = Math.max(0, Math.round((calculatedSubtotal + calculatedTax - discountAmount) * 100) / 100);
    const amountPaid = Math.max(0, parseFloat(invoiceData.amountPaid) || calculatedGrandTotal);
    const changeDue = Math.max(0, Math.round((amountPaid - calculatedGrandTotal) * 100) / 100);

    // Validate payment mode
    const paymentMode = (invoiceData.paymentMode || invoiceData.paymentMethod || 'CASH').toUpperCase();
    const normalizedPaymentMode = VALID_PAYMENT_MODES.includes(paymentMode) ? paymentMode : 'CASH';
    const customerSnapshot = await resolveCustomerSnapshot(db, {
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone
    });

    if (customerSnapshot.customerId && invoiceData.customerId && customerSnapshot.customerId !== invoiceData.customerId) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CUSTOMER_PHONE_ID_MISMATCH',
          message: 'Customer phone resolves to a different customer account'
        },
        requestId
      });
    }

    // 4. Consume stock batch atomically with $gte guard and rollback
    let stockConsumed = false;
    await inventoryService.consumeStockBatch(
      validatedItems,
      targetLocationId,
      invoiceNumber,
      username
    );
    stockConsumed = true;

    // 5. Create invoice document
    const invoiceDoc = {
      ...invoiceData,
      invoiceNumber,
      id: invoiceNumber, // legacy alias
      transactionId: transactionId || invoiceNumber,
      storeId: targetLocationId,
      locationId: targetLocationId,
      businessId: targetLocationId,
      customerId: customerSnapshot.customerId,
      customerName: customerSnapshot.customerName,
      customerPhone: customerSnapshot.customerPhone,
      customerPhoneCanonical: customerSnapshot.phoneCanonical,
      items: validatedItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      tax: Math.round(calculatedTax * 100) / 100,
      discount: discountAmount,
      grandTotal: calculatedGrandTotal,
      grandtotal: calculatedGrandTotal, // legacy alias
      paymentMode: normalizedPaymentMode,
      paymentMethod: normalizedPaymentMode,
      amountPaid,
      changeDue,
      status: 'COMPLETED',
      createdBy: username,
      isArchived: false,
      createdAt: new Date().toISOString(),
      date: invoiceData.date || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await db.collection('invoices').insertOne(invoiceDoc);
    } catch (persistErr) {
      if (stockConsumed) {
        await inventoryService.revertStockBatch(
          validatedItems,
          targetLocationId,
          'VOID',
          'invoice_persist_rollback',
          invoiceNumber,
          'system'
        );
      }
      throw persistErr;
    }

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

// GET /api/v1/invoices/:id/returns - Fetch all return transactions for an invoice
router.get('/:id/returns', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  const { db } = getContext();
  const invoiceId = req.params.id;
  try {
    const returns = await db.collection('returns').find({
      $or: [{ originalInvoiceId: invoiceId }, { originalInvoiceNumber: invoiceId }]
    }).sort({ createdAt: -1 }).toArray();

    res.json({
      success: true,
      returns
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch invoice returns' }
    });
  }
});

// POST /api/v1/invoices/:id/return - Process partial or full return transaction
router.post('/:id/return', verifyJWT, requirePermission('invoices.create'), async (req, res) => {
  const { db, io } = getContext();
  const invoiceId = req.params.id;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { returnedItems, refundMethod = 'CASH', reason = 'Customer Return', notes = '' } = req.body;
  const requestedReturnId = getTransactionKey(req.body);

  if (!returnedItems || !Array.isArray(returnedItems) || returnedItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_RETURN_ITEMS', message: 'Return must contain at least one item' },
      requestId
    });
  }

  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: invoiceId }, { id: invoiceId }],
      ...scopeFilter
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Original invoice not found or access denied' },
        requestId
      });
    }

    if (invoice.status === 'VOIDED' || invoice.isArchived) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_VOIDED', message: 'Cannot return items from a voided invoice' },
        requestId
      });
    }

    const locId = invoice.locationId || invoice.storeId || invoice.businessId;
    assertStoreAccess(req.user, locId);

    // Calculate existing returns for this invoice
    const invNo = invoice.invoiceNumber || invoice.id;
    if (requestedReturnId) {
      const existingReturn = await db.collection('returns').findOne({
        $or: [{ returnId: requestedReturnId }, { id: requestedReturnId }, { transactionId: requestedReturnId }],
        originalInvoiceNumber: invNo,
        locationId: locId
      });

      if (existingReturn) {
        return res.json({ success: true, return: existingReturn, duplicate: true });
      }
    }

    const existingReturns = await db.collection('returns').find({
      $or: [{ originalInvoiceId: invNo }, { originalInvoiceNumber: invNo }, { originalInvoiceId: invoice._id ? invoice._id.toString() : '' }],
      locationId: locId
    }).toArray();

    const returnedQtyMap = {};
    for (const ret of existingReturns) {
      for (const item of (ret.returnedItems || [])) {
        const pid = item.productId || item.id;
        returnedQtyMap[pid] = (returnedQtyMap[pid] || 0) + (parseFloat(item.quantity) || 0);
      }
    }

    // Validate return eligibility for each item
    let calculatedRefundAmount = 0;
    const validatedReturnItems = [];

    for (const retItem of returnedItems) {
      const prodId = retItem.productId || retItem.id;
      const returnQty = parseFloat(retItem.quantity) || 0;

      if (!prodId || returnQty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_QUANTITY', message: `Invalid return quantity for product ${prodId || 'unknown'}` },
          requestId
        });
      }

      const origItem = (invoice.items || []).find((it) => (it.productId || it.id) === prodId);
      if (!origItem) {
        return res.status(400).json({
          success: false,
          error: { code: 'ITEM_NOT_IN_INVOICE', message: `Product ${prodId} was not part of original invoice` },
          requestId
        });
      }

      const soldQty = parseFloat(origItem.quantity) || 0;
      const alreadyReturned = returnedQtyMap[prodId] || 0;
      const returnableQty = Math.max(0, soldQty - alreadyReturned);

      if (returnQty > returnableQty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXCEEDS_RETURNABLE_QUANTITY',
            message: `Return quantity (${returnQty}) exceeds returnable quantity (${returnableQty}) for ${origItem.name}`
          },
          requestId
        });
      }

      const unitPrice = parseFloat(origItem.price || origItem.sellingPrice || 0);
      const taxRate = parseFloat(origItem.gst || origItem.tax || 0);
      const lineTax = ((unitPrice * returnQty) * taxRate) / 100;
      const lineTotal = (unitPrice * returnQty) + lineTax;

      calculatedRefundAmount += lineTotal;

      validatedReturnItems.push({
        productId: prodId,
        variantId: origItem.variantId || null,
        name: origItem.name,
        unit: origItem.unit || 'unit',
        quantity: returnQty,
        price: unitPrice,
        sellingPrice: unitPrice,
        cost: parseFloat(origItem.cost || 0),
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    const returnId = requestedReturnId || `RET-${Date.now()}`;
    const username = req.user ? req.user.username : 'system';
    const refundTotal = Math.round(calculatedRefundAmount * 100) / 100;

    // 1. Restock returned items to location inventory
    await inventoryService.addStockBatch(
      validatedReturnItems,
      locId,
      returnId,
      username,
      {
        type: 'RETURN',
        referenceType: 'return',
        notes: `POS Return for Invoice #${invNo}`
      }
    );

    // 2. Create Return Document
    const returnDoc = {
      returnId,
      id: returnId,
      transactionId: returnId,
      originalInvoiceId: invNo,
      originalInvoiceNumber: invNo,
      storeId: locId,
      locationId: locId,
      customerId: invoice.customerId || null,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerPhone: invoice.customerPhone || null,
      returnedItems: validatedReturnItems,
      refundAmount: refundTotal,
      refundMethod: (refundMethod || 'CASH').toUpperCase(),
      reason,
      notes,
      cashier: username,
      createdBy: username,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    try {
      await db.collection('returns').insertOne(returnDoc);

      // 3. Update Invoice return summary
      const updatedReturns = [...existingReturns, returnDoc];
      let allReturned = true;
      for (const it of (invoice.items || [])) {
        const pid = it.productId || it.id;
        const soldQty = parseFloat(it.quantity) || 0;
        let totalRet = 0;
        for (const r of updatedReturns) {
          for (const ri of (r.returnedItems || [])) {
            if ((ri.productId || ri.id) === pid) {
              totalRet += parseFloat(ri.quantity) || 0;
            }
          }
        }
        if (totalRet < soldQty) {
          allReturned = false;
          break;
        }
      }

      const nextStatus = allReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';
      await db.collection('invoices').updateOne(
        { _id: invoice._id },
        {
          $set: {
            returnStatus: nextStatus,
            updatedAt: new Date().toISOString()
          }
        }
      );
    } catch (persistErr) {
      await rollbackAddedStock(
        validatedReturnItems,
        locId,
        returnId,
        'system',
        `Compensating rollback for failed return persistence #${returnId}`
      );
      throw persistErr;
    }

    // 4. Structured Audit Log
    await auditService.writeAuditLog(
      'RETURN_COMPLETED',
      'billing',
      returnId,
      null,
      returnDoc,
      req
    );

    // 5. Realtime Socket Event
    if (io) {
      const realtimeService = require('../services/realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'return',
        'created',
        returnId,
        locId,
        { returnId, originalInvoiceNumber: invNo, return: returnDoc }
      );
      io.to(`store_${locId}`).emit('return_completed', envelope);
    }

    res.json({
      success: true,
      return: returnDoc,
      message: `Return #${returnId} processed and stock restocked successfully.`
    });
  } catch (err) {
    console.error(`[Billing] Error processing return for invoice ${invoiceId}:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'RETURN_PROCESSING_FAILED', message: err.message || 'Failed to process return' },
      requestId
    });
  }
});

// POST /api/v1/invoices/:id/exchange - Atomic Exchange: Return original item(s) & sell replacement item(s)
router.post('/:id/exchange', verifyJWT, requirePermission('invoices.create'), async (req, res) => {
  const { db, io } = getContext();
  const invoiceId = req.params.id;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { returnedItems, replacementItems, paymentMode = 'CASH', reason = 'Customer Exchange', notes = '' } = req.body;
  const requestedExchangeId = getTransactionKey(req.body);

  if (!returnedItems || !Array.isArray(returnedItems) || returnedItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_RETURN_ITEMS', message: 'Exchange must specify at least one return item' },
      requestId
    });
  }

  if (!replacementItems || !Array.isArray(replacementItems) || replacementItems.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REPLACEMENT_ITEMS', message: 'Exchange must specify at least one replacement item' },
      requestId
    });
  }

  try {
    const scopeFilter = getStoreScopeFilter(req.user, ['locationId', 'storeId', 'businessId']);
    const invoice = await db.collection('invoices').findOne({
      $or: [{ invoiceNumber: invoiceId }, { id: invoiceId }],
      ...scopeFilter
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Original invoice not found or access denied' },
        requestId
      });
    }

    if (invoice.status === 'VOIDED' || invoice.isArchived) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVOICE_VOIDED', message: 'Cannot exchange items from a voided invoice' },
        requestId
      });
    }

    const locId = invoice.locationId || invoice.storeId || invoice.businessId;
    assertStoreAccess(req.user, locId);
    const username = req.user ? req.user.username : 'system';
    const invNo = invoice.invoiceNumber || invoice.id;
    if (requestedExchangeId) {
      const existingReturn = await db.collection('returns').findOne({
        $or: [{ returnId: requestedExchangeId }, { id: requestedExchangeId }, { transactionId: requestedExchangeId }],
        originalInvoiceNumber: invNo,
        locationId: locId,
        isExchange: true
      });
      const existingInvoice = await db.collection('invoices').findOne({
        transactionId: requestedExchangeId,
        locationId: locId,
        isArchived: { $ne: true }
      });

      if (existingReturn && existingInvoice) {
        return res.json({
          success: true,
          exchangeId: requestedExchangeId,
          return: existingReturn,
          replacementInvoice: existingInvoice,
          netDifference: existingInvoice.exchangeReference?.netDifference || 0,
          duplicate: true
        });
      }
    }

    // 1. Process return portion
    const existingReturns = await db.collection('returns').find({
      $or: [{ originalInvoiceId: invNo }, { originalInvoiceNumber: invNo }],
      locationId: locId
    }).toArray();

    const returnedQtyMap = {};
    for (const ret of existingReturns) {
      for (const item of (ret.returnedItems || [])) {
        const pid = item.productId || item.id;
        returnedQtyMap[pid] = (returnedQtyMap[pid] || 0) + (parseFloat(item.quantity) || 0);
      }
    }

    let calculatedReturnCredit = 0;
    const validatedReturnItems = [];

    for (const retItem of returnedItems) {
      const prodId = retItem.productId || retItem.id;
      const returnQty = parseFloat(retItem.quantity) || 0;
      const origItem = (invoice.items || []).find((it) => (it.productId || it.id) === prodId);

      if (!origItem || returnQty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_RETURN_ITEM', message: `Invalid return item ${prodId}` },
          requestId
        });
      }

      const soldQty = parseFloat(origItem.quantity) || 0;
      const alreadyReturned = returnedQtyMap[prodId] || 0;
      const returnableQty = Math.max(0, soldQty - alreadyReturned);

      if (returnQty > returnableQty) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EXCEEDS_RETURNABLE_QUANTITY',
            message: `Return quantity (${returnQty}) exceeds returnable (${returnableQty}) for ${origItem.name}`
          },
          requestId
        });
      }

      const unitPrice = parseFloat(origItem.price || origItem.sellingPrice || 0);
      const taxRate = parseFloat(origItem.gst || origItem.tax || 0);
      const lineTax = ((unitPrice * returnQty) * taxRate) / 100;
      const lineTotal = (unitPrice * returnQty) + lineTax;

      calculatedReturnCredit += lineTotal;
      validatedReturnItems.push({
        productId: prodId,
        variantId: origItem.variantId || null,
        name: origItem.name,
        unit: origItem.unit || 'unit',
        quantity: returnQty,
        price: unitPrice,
        sellingPrice: unitPrice,
        cost: parseFloat(origItem.cost || 0),
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    // 2. Validate replacement items
    let replacementSubtotal = 0;
    let replacementTax = 0;
    const validatedReplacementItems = [];

    for (const repItem of replacementItems) {
      const prodId = repItem.productId || repItem.id;
      const qty = parseFloat(repItem.quantity) || 0;

      if (!prodId || qty <= 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_REPLACEMENT_ITEM', message: `Invalid replacement item ${prodId || 'unknown'}` },
          requestId
        });
      }

      const product = await db.collection('products').findOne({ id: prodId, isArchived: { $ne: true } });
      if (!product) {
        return res.status(409).json({
          success: false,
          error: { code: 'PRODUCT_MASTER_NOT_FOUND', message: `Product Master not found for ${prodId}` },
          requestId
        });
      }

      const unitPrice = parseFloat(product.sellingPrice ?? product.price ?? repItem.price ?? repItem.sellingPrice ?? 0) || 0;
      const taxRate = parseFloat(product.gst ?? product.tax ?? repItem.gst ?? repItem.tax ?? 0) || 0;

      const lineGross = qty * unitPrice;
      const lineTax = (lineGross * taxRate) / 100;
      const lineTotal = lineGross;

      replacementSubtotal += lineGross;
      replacementTax += lineTax;

      validatedReplacementItems.push({
        productId: prodId,
        variantId: repItem.variantId || null,
        name: product.name || repItem.name || prodId,
        unit: product.unit || repItem.unit || 'unit',
        quantity: qty,
        price: unitPrice,
        sellingPrice: unitPrice,
        cost: parseFloat(product.cost ?? product.purchasePrice ?? repItem.cost ?? 0) || 0,
        tax: lineTax,
        gst: taxRate,
        lineTotal: Math.round(lineTotal * 100) / 100
      });
    }

    // Check stock availability for validated replacement items before making any modifications
    const availability = await inventoryService.checkStockAvailability(validatedReplacementItems, locId);
    if (!availability.available) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for replacement items in exchange',
          errors: availability.errors || []
        },
        requestId
      });
    }

    const replacementGrandTotal = Math.round((replacementSubtotal + replacementTax) * 100) / 100;
    const returnCreditTotal = Math.round(calculatedReturnCredit * 100) / 100;
    const netDifference = Math.round((replacementGrandTotal - returnCreditTotal) * 100) / 100;

    const exchangeId = requestedExchangeId || `EXC-${Date.now()}`;
    const newInvoiceNumber = `INV-${Date.now()}`;

    // 3. Atomically Restock Returned Items
    let returnRestocked = false;
    let replacementConsumed = false;
    let returnInserted = false;
    let replacementInvoiceInserted = false;

    await inventoryService.addStockBatch(
      validatedReturnItems,
      locId,
      exchangeId,
      username,
      {
        type: 'RETURN',
        referenceType: 'exchange',
        notes: `Exchange Return for #${invNo}`
      }
    );
    returnRestocked = true;

    // 4. Atomically Consume Replacement Items
    try {
      await inventoryService.consumeStockBatch(
        validatedReplacementItems,
        locId,
        newInvoiceNumber,
        username
      );
      replacementConsumed = true;
    } catch (consumeErr) {
      if (returnRestocked) {
        await rollbackAddedStock(
          validatedReturnItems,
          locId,
          exchangeId,
          'system',
          `Compensating rollback for failed exchange replacement #${exchangeId}`
        );
      }
      throw consumeErr;
    }

    // 5. Create Return Doc
    const returnDoc = {
      returnId: exchangeId,
      id: exchangeId,
      transactionId: exchangeId,
      originalInvoiceId: invNo,
      originalInvoiceNumber: invNo,
      exchangeInvoiceNumber: newInvoiceNumber,
      isExchange: true,
      storeId: locId,
      locationId: locId,
      customerId: invoice.customerId || null,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerPhone: invoice.customerPhone || null,
      returnedItems: validatedReturnItems,
      refundAmount: returnCreditTotal,
      refundMethod: 'EXCHANGE_CREDIT',
      reason,
      notes,
      cashier: username,
      createdBy: username,
      createdAt: new Date().toISOString()
    };
    try {
      await db.collection('returns').insertOne(returnDoc);
      returnInserted = true;

      // 6. Create Replacement Invoice Document
      const replacementInvoiceDoc = {
      invoiceNumber: newInvoiceNumber,
      id: newInvoiceNumber,
      transactionId: exchangeId,
      exchangeReference: {
        originalInvoiceNumber: invNo,
        returnId: exchangeId,
        returnCredit: returnCreditTotal,
        netDifference
      },
      storeId: locId,
      locationId: locId,
      businessId: locId,
      customerId: invoice.customerId || null,
      customerName: invoice.customerName || 'Walk-in Customer',
      customerPhone: invoice.customerPhone || null,
      items: validatedReplacementItems,
      subtotal: Math.round(replacementSubtotal * 100) / 100,
      tax: Math.round(replacementTax * 100) / 100,
      discount: 0,
      grandTotal: replacementGrandTotal,
      grandtotal: replacementGrandTotal,
      returnCreditApplied: returnCreditTotal,
      netPayable: netDifference > 0 ? netDifference : 0,
      refundDue: netDifference < 0 ? Math.abs(netDifference) : 0,
      paymentMode: (paymentMode || 'CASH').toUpperCase(),
      paymentMethod: (paymentMode || 'CASH').toUpperCase(),
      status: 'COMPLETED',
      createdBy: username,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
      };
      await db.collection('invoices').insertOne(replacementInvoiceDoc);
      replacementInvoiceInserted = true;

      // 7. Write Audit Trail
      await auditService.writeAuditLog(
        'EXCHANGE_COMPLETED',
        'billing',
        exchangeId,
        null,
        {
          exchangeId,
          originalInvoiceNumber: invNo,
          replacementInvoiceNumber: newInvoiceNumber,
          returnCredit: returnCreditTotal,
          replacementTotal: replacementGrandTotal,
          netDifference
        },
        req
      );

      // 8. Realtime Event
      if (io) {
        const realtimeService = require('../services/realtimeService');
        const envelope = realtimeService.createEventEnvelope(
          'exchange',
          'created',
          exchangeId,
          locId,
          { exchangeId, replacementInvoice: replacementInvoiceDoc }
        );
        io.to(`store_${locId}`).emit('exchange_completed', envelope);
      }

      return res.json({
        success: true,
        exchangeId,
        return: returnDoc,
        replacementInvoice: replacementInvoiceDoc,
        netDifference,
        message: `Exchange #${exchangeId} processed successfully.`
      });
    } catch (persistErr) {
      if (replacementConsumed) {
        await inventoryService.revertStockBatch(
          validatedReplacementItems,
          locId,
          'VOID',
          'exchange_persist_rollback',
          newInvoiceNumber,
          'system'
        );
      }
      if (returnRestocked) {
        await rollbackAddedStock(
          validatedReturnItems,
          locId,
          exchangeId,
          'system',
          `Compensating rollback for failed exchange persistence #${exchangeId}`
        );
      }
      if (returnInserted && db.collection('returns').deleteOne) {
        await db.collection('returns').deleteOne({ returnId: exchangeId }).catch(() => {});
      }
      if (replacementInvoiceInserted && db.collection('invoices').deleteOne) {
        await db.collection('invoices').deleteOne({ invoiceNumber: newInvoiceNumber }).catch(() => {});
      }
      throw persistErr;
    }
  } catch (err) {
    console.error(`[Billing] Error processing exchange for invoice ${invoiceId}:`, err);
    res.status(500).json({
      success: false,
      error: { code: 'EXCHANGE_FAILED', message: err.message || 'Failed to process exchange' },
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
