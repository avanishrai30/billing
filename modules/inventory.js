const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, requireStoreScope, getStoreScopeFilter, getAuthorizedStoreIds, isSuperAdmin, assertStoreAccess } = require('../services/authzService');
const inventoryService = require('../services/inventoryService');
const auditService = require('../services/auditService');

const router = express.Router();

// GET /api/v1/inventory/command-center - Multi-store consolidated inventory view (Phase 33)
router.get('/command-center', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const data = await inventoryService.getInventoryCommandCenter(req.user);

    res.json(data);
  } catch (err) {
    console.error("Failed to fetch inventory command center data:", err);
    res.status(500).json({
      success: false,
      error: { code: "COMMAND_CENTER_ERROR", message: err.message || "Server error fetching command center data" },
      requestId
    });
  }
});

// GET /api/v1/inventory/summary - Fast aggregated inventory metrics
router.get('/summary', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    let locId = req.query.locationId || req.query.storeId;
    const authorizedStoreIds = getAuthorizedStoreIds(req.user);
    const canViewAllStores = isSuperAdmin(req.user) || authorizedStoreIds.includes('*') || authorizedStoreIds.includes('all');
    if (!canViewAllStores) {
      if (authorizedStoreIds.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: "Forbidden: No authorized inventory locations are assigned to this user" },
          requestId
        });
      }
      if (locId && !authorizedStoreIds.includes(locId)) {
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You cannot view inventory for store '${locId}'` },
          requestId
        });
      }
      locId = locId || authorizedStoreIds;
    }
    const summary = await inventoryService.getInventorySummary(locId);
    res.json(summary);
  } catch (err) {
    console.error("Failed to generate inventory summary:", err);
    res.status(500).json({
      success: false,
      error: { code: "SUMMARY_ERROR", message: "Server error generating inventory summary" },
      requestId
    });
  }
});

// POST /api/v1/inventory/check-availability - Pre-flight stock availability checker
router.post('/check-availability', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { items, storeId, locationId } = req.body;
  let locId = locationId || storeId;

  if (!isSuperAdmin(req.user)) {
    const authorizedStoreIds = getAuthorizedStoreIds(req.user);
    const canViewAllStores = authorizedStoreIds.includes('*') || authorizedStoreIds.includes('all');
    if (!canViewAllStores) {
      if (authorizedStoreIds.length === 0) {
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: "Forbidden: No authorized inventory locations are assigned to this user" },
          requestId
        });
      }
      if (locId && !authorizedStoreIds.includes(locId)) {
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You cannot check inventory for store '${locId}'` },
          requestId
        });
      }
      locId = locId || authorizedStoreIds[0];
    }
  }

  try {
    const result = await inventoryService.checkStockAvailability(items, locId);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "AVAILABILITY_CHECK_ERROR", message: "Error checking stock availability" },
      requestId
    });
  }
});

// GET /api/v1/inventory - Fetch current inventory snapshot with store scoping
router.get('/', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const filter = {};
    const requestedLocationId = req.query.locationId || req.query.storeId;
    const authorizedStoreIds = getAuthorizedStoreIds(req.user);
    const canViewAllStores = isSuperAdmin(req.user) || authorizedStoreIds.includes('*') || authorizedStoreIds.includes('all');
    if (!canViewAllStores && authorizedStoreIds.length === 0) {
      return res.json({ success: true, inventory: [] });
    }
    if (!canViewAllStores && requestedLocationId && !authorizedStoreIds.includes(requestedLocationId)) {
      return res.status(403).json({
        success: false,
        error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You cannot view inventory for store '${requestedLocationId}'` },
        requestId
      });
    }

    const scopedFilter = getStoreScopeFilter(req.user);
    if (scopedFilter._id === null) {
      return res.json({ success: true, inventory: [] });
    } else if (scopedFilter.$or) {
      const firstScopedCondition = scopedFilter.$or[0] || {};
      const scopedLocation = firstScopedCondition.locationId || firstScopedCondition.storeId;
      if (scopedLocation && scopedLocation.$in) {
        filter.locationIds = scopedLocation.$in;
      } else if (scopedLocation) {
        filter.locationId = scopedLocation;
      }
    } else if (scopedFilter.locationId) {
      filter.locationId = scopedFilter.locationId;
    } else if (scopedFilter.storeId) {
      filter.locationId = scopedFilter.storeId;
    } else if (requestedLocationId) {
      filter.locationId = requestedLocationId;
    }

    if (req.query.productId) {
      filter.productId = req.query.productId;
    }

    const inventory = await inventoryService.listInventory(filter);
    res.json({ success: true, inventory });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Server error fetching inventory" },
      requestId
    });
  }
});

// GET /api/v1/inventory/logs - Fetch paginated immutable inventory ledger records
router.get('/logs', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  try {
    const queryOptions = { ...req.query };
    const requestedLocationId = req.query.locationId || req.query.storeId;
    const authorizedStoreIds = getAuthorizedStoreIds(req.user);
    const canViewAllStores = isSuperAdmin(req.user) || authorizedStoreIds.includes('*') || authorizedStoreIds.includes('all');
    if (!canViewAllStores) {
      if (authorizedStoreIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { limit: Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500), nextCursor: null }
        });
      }
      if (requestedLocationId && !authorizedStoreIds.includes(requestedLocationId)) {
        return res.status(403).json({
          success: false,
          error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You cannot view inventory logs for store '${requestedLocationId}'` },
          requestId
        });
      }
      queryOptions.locationId = requestedLocationId || authorizedStoreIds;
      delete queryOptions.storeId;
    }
    const result = await inventoryService.getLedgerLogs(queryOptions);
    res.json(result);
  } catch (err) {
    console.error("Failed to fetch inventory ledger logs:", err);
    res.status(500).json({
      success: false,
      error: { code: "FETCH_ERROR", message: "Server error fetching inventory logs" },
      requestId
    });
  }
});

// POST /api/v1/inventory/adjust - Adjust stock atomically with reason and audit trail
router.post('/adjust', verifyJWT, requirePermission('inventory.adjust'), requireStoreScope(req => req.body.locationId || req.body.storeId), async (req, res) => {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { productId, storeId, locationId, quantity, type, referenceId, notes, cost } = req.body;
  const locId = locationId || storeId;

  if (!productId || !locId || quantity === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: "MISSING_FIELDS", message: "Missing required fields: productId, storeId/locationId, quantity" },
      requestId
    });
  }

  try {
    const result = await inventoryService.adjustStock(
      productId,
      locId,
      parseFloat(quantity),
      type || 'MANUAL_ADJUSTMENT',
      referenceId || `ADJ-${Date.now()}`,
      req.user ? req.user.username : 'system',
      notes || '',
      parseFloat(cost || 0)
    );

    await auditService.writeAuditLog(
      'inventory_updated',
      'inventory',
      productId,
      null,
      { quantity: result, locationId: locId, type: type || 'MANUAL_ADJUSTMENT', notes },
      req
    );

    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      record: { productId, locationId: locId, quantity: result }
    });
  } catch (err) {
    console.error("Inventory adjustment error:", err);
    const statusCode = err.statusCode || (err.code === 'PRODUCT_MASTER_NOT_FOUND' ? 409 : 500);
    res.status(statusCode).json({
      success: false,
      error: { code: err.code || "ADJUSTMENT_FAILED", message: err.message || "Server error adjusting inventory" },
      requestId
    });
  }
});

// POST /api/v1/inventory/transfer - Transfer stock atomically between stores with Batch preservation & idempotency
router.post('/transfer', verifyJWT, requirePermission('inventory.transfer'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  const { productId, fromStoreId, toStoreId, fromLocationId, toLocationId, quantity, notes, transferId, transactionId, batchId } = req.body;
  const fromLoc = fromLocationId || fromStoreId;
  const toLoc = toLocationId || toStoreId;
  const transKey = transferId || transactionId;

  if (!productId || !fromLoc || !toLoc || !quantity) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_FIELDS", message: "Missing required fields for transfer: productId, source, target, quantity" },
      requestId
    });
  }

  if (fromLoc === toLoc) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_LOCATION", message: "Source and target locations cannot be the same" },
      requestId
    });
  }

  // Store authorization check on source and destination locations
  try {
    assertStoreAccess(req.user, fromLoc);
    assertStoreAccess(req.user, toLoc);
  } catch (authErr) {
    await auditService.writeAuditLog(
      'AUTHORIZATION_DENIED',
      'security',
      req.user.id || req.user.username,
      null,
        {
          requiredPermission: 'inventory.transfer',
          sourceStore: fromLoc,
          destinationStore: toLoc,
          endpoint: req.originalUrl || req.path,
          method: 'POST',
          reason: `Store scope mismatch: cannot transfer stock between '${fromLoc}' and '${toLoc}'`
        },
        req
      );
    return res.status(403).json({
      success: false,
      error: { code: "STORE_ACCESS_DENIED", message: `Forbidden: You are not authorized to transfer stock between '${fromLoc}' and '${toLoc}'` },
      requestId
    });
  }

  try {
    // Idempotency check: if transferId was already processed in ledger, return existing transfer
    if (transKey) {
      const existingTransfer = await db.collection('stock_transfers').findOne({ id: transKey });
      if (existingTransfer && existingTransfer.status === 'COMPLETED') {
        return res.json({
          success: true,
          message: "Stock transfer already completed",
          referenceId: existingTransfer.referenceId,
          duplicate: true,
          transfer: existingTransfer.result || null,
          stockTransfer: existingTransfer
        });
      }
      const existingLedger = await db.collection('inventory_ledger').findOne({ referenceId: transKey });
      if (existingLedger) {
        console.log(`[Transfer] Idempotent hit: transfer #${transKey} already recorded.`);
        return res.json({
          success: true,
          message: "Stock transfer already completed",
          referenceId: transKey,
          duplicate: true
        });
      }
    }

    const result = await inventoryService.completeStockTransfer({
      productId,
      fromLocationId: fromLoc,
      toLocationId: toLoc,
      quantity,
      performedBy: req.user ? (req.user.id || req.user.username) : 'system',
      requestedBy: req.user ? (req.user.id || req.user.username) : 'system',
      approvedBy: req.user ? (req.user.id || req.user.username) : 'system',
      completedBy: req.user ? (req.user.id || req.user.username) : 'system',
      notes: notes || '',
      batchId: batchId || null,
      transferId: transKey || null
    });

    await auditService.writeAuditLog(
      'TRANSFER_COMPLETED',
      'inventory',
      productId,
      null,
      {
        fromLocationId: fromLoc,
        toLocationId: toLoc,
        quantity,
        referenceId: result.referenceId,
        transferId: result.stockTransfer?.id,
        transferNumber: result.stockTransfer?.transferNumber,
        batchId,
        notes
      },
      req
    );

    res.json({
      success: true,
      message: "Stock transfer completed successfully",
      referenceId: result.referenceId,
      transfer: result,
      stockTransfer: result.stockTransfer
    });
  } catch (err) {
    console.error("Stock transfer error:", err);
    const statusCode = err.statusCode || (err.code === 'PRODUCT_MASTER_NOT_FOUND'
      ? 409
      : err.code === 'INSUFFICIENT_STOCK' || err.code === 'INSUFFICIENT_BATCH_STOCK' ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'TRANSFER_ERROR',
        message: err.message || "Server error transferring inventory"
      },
      requestId
    });
  }
});

module.exports = router;
