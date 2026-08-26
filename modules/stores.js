const express = require('express');
const { getContext, verifyJWT, writeAuditLog } = require('./context');
const { requirePermission, requireAnyPermission, isSuperAdmin, assertStoreAccess } = require('../services/authzService');
const storeService = require('../services/storeService');

function normalizeLocationType(store = {}) {
  const raw = String(store.locationType || '').trim().toUpperCase();
  if (raw === 'WAREHOUSE' || raw === 'STORE') return raw;
  const name = String(store.name || '').toLowerCase();
  if (store.isWarehouse === true || store.id === 'central-warehouse' || name.includes('warehouse')) {
    return 'WAREHOUSE';
  }
  return 'STORE';
}

function normalizeStoreRecord(store, employeeCount = 0) {
  const locationType = normalizeLocationType(store);
  return {
    ...store,
    id: store.id,
    name: store.name,
    code: store.code || `ST-${(store.name || 'OUT').substring(0, 3).toUpperCase()}`,
    locationType,
    status: store.status || 'active',
    address: store.address || '',
    phone: store.phone || '',
    businessId: store.businessId || 'biz_primary',
    isHub: store.isHub === true,
    hubPriority: typeof store.hubPriority === 'number' ? store.hubPriority : (parseInt(store.hubPriority) || 1),
    employeeCount: typeof employeeCount === 'number' ? employeeCount : 0,
    createdAt: store.createdAt || new Date().toISOString(),
    updatedAt: store.updatedAt || new Date().toISOString()
  };
}

const router = express.Router();

// GET /api/v1/stores/summary - Fetch store summary KPIs
router.get('/summary', verifyJWT, requirePermission('stores.view'), async (req, res) => {
  try {
    const summary = await storeService.getStoreSummaryMetrics();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch store metrics" } });
  }
});

// GET /api/v1/stores - Fetch all stores enriched with Hub status and employee counts
router.get('/', verifyJWT, requirePermission('stores.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const stores = await db.collection('stores').find().toArray();
    const users = await db.collection('users').find({ status: { $ne: 'inactive' } }).toArray();

    // Map employee counts per store
    const storeEmployeeCountMap = new Map();
    users.forEach(u => {
      const assigned = Array.isArray(u.assignedStores) && u.assignedStores.length > 0
        ? u.assignedStores
        : (u.assignedStoreId ? [u.assignedStoreId] : []);
      assigned.forEach(storeId => {
        if (storeId && storeId !== 'all') {
          storeEmployeeCountMap.set(storeId, (storeEmployeeCountMap.get(storeId) || 0) + 1);
        }
      });
    });

    const enrichedStores = stores.map(s => normalizeStoreRecord(s, storeEmployeeCountMap.get(s.id) || 0));
    res.json(enrichedStores);
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch stores" } });
  }
});

// GET /api/v1/stores/:id - Fetch single store
router.get('/:id', verifyJWT, requirePermission('stores.view'), async (req, res) => {
  const { db } = getContext();
  try {
    const store = await db.collection('stores').findOne({ id: req.params.id });
    if (!store) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Store not found" } });

    const employees = await storeService.getStoreEmployees(req.params.id);
    res.json(normalizeStoreRecord(store, employees.length));
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to fetch store" } });
  }
});

// POST /api/v1/stores - Create or update store
router.post('/', verifyJWT, requireAnyPermission(['stores.create', 'stores.update']), async (req, res) => {
  const { db, io } = getContext();
  const storeData = req.body;
  if (!storeData.name) {
    return res.status(400).json({ success: false, error: { code: "INVALID_NAME", message: "Store name is required" } });
  }

  try {
    const storeId = storeData.id || `st-${Date.now()}`;
    const storeDoc = {
      ...storeData,
      id: storeId,
      code: storeData.code || `ST-${storeData.name.substring(0, 3).toUpperCase()}`,
      locationType: normalizeLocationType({ ...storeData, id: storeId }),
      status: storeData.status || 'active',
      isHub: storeData.isHub === true,
      hubPriority: typeof storeData.hubPriority === 'number' ? storeData.hubPriority : (parseInt(storeData.hubPriority) || 1),
      updatedAt: new Date().toISOString()
    };

    if (storeData.id) {
      await db.collection('stores').updateOne({ id: storeId }, { $set: storeDoc });
      await writeAuditLog('store_updated', 'stores', storeId, null, storeDoc, req);
    } else {
      storeDoc.createdAt = new Date().toISOString();
      await db.collection('stores').insertOne(storeDoc);
      await writeAuditLog('store_created', 'stores', storeId, null, storeDoc, req);
    }

    const normalized = normalizeStoreRecord(storeDoc);
    if (io) io.to('sync_global').emit('store_updated', { store: normalized });
    res.json({ success: true, store: normalized });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to save store" } });
  }
});

// PATCH /api/v1/stores/:id - Partial update
router.patch('/:id', verifyJWT, requirePermission('stores.update'), async (req, res) => {
  const { db, io } = getContext();
  const storeId = req.params.id;
  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  delete updates.id;
  delete updates._id;
  if (req.body.locationType !== undefined || req.body.name !== undefined || req.body.isWarehouse !== undefined) {
    updates.locationType = normalizeLocationType({ ...req.body, id: storeId });
  }

  try {
    const result = await db.collection('stores').findOneAndUpdate(
      { id: storeId },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result || !result.value && !result.id) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Store not found" } });
    }
    const updatedStore = normalizeStoreRecord(result.value || result);
    await writeAuditLog('store_updated', 'stores', storeId, null, updates, req);
    if (io) io.to('sync_global').emit('store_updated', { store: updatedStore });
    res.json({ success: true, store: updatedStore });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to update store" } });
  }
});

// DELETE /api/v1/stores/:id - Delete store
router.delete('/:id', verifyJWT, requirePermission('stores.delete'), async (req, res) => {
  const { db, io } = getContext();
  const storeId = req.params.id;
  try {
    const result = await db.collection('stores').deleteOne({ id: storeId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Store not found" } });
    }
    await writeAuditLog('store_deleted', 'stores', storeId, null, null, req);
    if (io) io.to('sync_global').emit('store_deleted', { id: storeId });
    res.json({ success: true, message: "Store deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Failed to delete store" } });
  }
});

// GET /api/v1/stores/:storeId/employees - List assigned employees for a store
router.get('/:storeId/employees', verifyJWT, requirePermission('users.view'), async (req, res) => {
  try {
    const employees = await storeService.getStoreEmployees(req.params.storeId);
    res.json({ success: true, storeId: req.params.storeId, employees });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "FETCH_ERROR", message: err.message || "Failed to fetch store employees" } });
  }
});

// POST /api/v1/stores/:storeId/employees - Assign employee to a store
router.post('/:storeId/employees', verifyJWT, requirePermission('users.update'), async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: { code: "MISSING_USER_ID", message: "userId is required" } });
  }

  try {
    const result = await storeService.addEmployeeToStore(req.params.storeId, userId, req.user, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "ASSIGN_ERROR", message: err.message } });
  }
});

// DELETE /api/v1/stores/:storeId/employees/:userId - Unassign employee from a store
router.delete('/:storeId/employees/:userId', verifyJWT, requirePermission('users.update'), async (req, res) => {
  try {
    const result = await storeService.removeEmployeeFromStore(req.params.storeId, req.params.userId, req.user, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "REMOVE_ERROR", message: err.message } });
  }
});

// POST /api/v1/stores/:storeId/hub - Promote store to distribution HUB (Super Admin / Admin)
router.post('/:storeId/hub', verifyJWT, requirePermission('stores.update'), async (req, res) => {
  if (!isSuperAdmin(req.user) && req.user.category !== 'admin') {
    return res.status(403).json({ success: false, error: { code: "SUPER_ADMIN_REQUIRED", message: "Only administrators can designate distribution hubs." } });
  }

  const { hubPriority = 1 } = req.body;
  try {
    const result = await storeService.setStoreHubStatus(req.params.storeId, true, hubPriority, req.user, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "HUB_ERROR", message: err.message } });
  }
});

// DELETE /api/v1/stores/:storeId/hub - Remove distribution HUB designation
router.delete('/:storeId/hub', verifyJWT, requirePermission('stores.update'), async (req, res) => {
  if (!isSuperAdmin(req.user) && req.user.category !== 'admin') {
    return res.status(403).json({ success: false, error: { code: "SUPER_ADMIN_REQUIRED", message: "Only administrators can remove distribution hub status." } });
  }

  try {
    const result = await storeService.setStoreHubStatus(req.params.storeId, false, 1, req.user, req);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "HUB_ERROR", message: err.message } });
  }
});

// GET /api/v1/stores/:storeId/sales - Fetch store-specific sales invoices
router.get('/:storeId/sales', verifyJWT, requirePermission('invoices.view'), async (req, res) => {
  try {
    const result = await storeService.getStoreSales(req.params.storeId, req.query, req.user);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "SALES_FETCH_ERROR", message: err.message } });
  }
});

// GET /api/v1/stores/:storeId/inventory - Fetch store-specific inventory balances
router.get('/:storeId/inventory', verifyJWT, requirePermission('inventory.view'), async (req, res) => {
  try {
    const result = await storeService.getStoreInventory(req.params.storeId, req.query, req.user);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || "INVENTORY_FETCH_ERROR", message: err.message } });
  }
});

module.exports = router;
