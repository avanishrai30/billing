const { getContext } = require('../modules/context');
const auditService = require('./auditService');
const authzService = require('./authzService');
const inventoryService = require('./inventoryService');

function createHttpError(message, statusCode = 400, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

/**
 * Aggregates high-level metrics for stores directory
 */
async function getStoreSummaryMetrics() {
  const { db } = getContext();
  const stores = await db.collection('stores').find().toArray();
  const totalStores = stores.length;
  const activeStoresCount = stores.filter(s => s.status === 'active').length;
  const inactiveStoresCount = stores.filter(s => s.status !== 'active').length;
  const hubStoresCount = stores.filter(s => s.isHub === true && s.status === 'active').length;

  return {
    totalStores,
    activeStoresCount,
    inactiveStoresCount,
    hubStoresCount
  };
}

/**
 * Returns all active users assigned to a specific store
 */
async function getStoreEmployees(storeId) {
  const { db } = getContext();
  if (!storeId) return [];

  const users = await db.collection('users')
    .find({
      $or: [
        { assignedStores: storeId },
        { assignedStoreId: storeId }
      ]
    })
    .project({ password: 0, passwordHash: 0, salt: 0 })
    .toArray();

  return users.map(u => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    role: u.role,
    category: u.category || authzService.normalizeCategory(u),
    assignedStoreId: u.assignedStoreId,
    assignedStores: Array.isArray(u.assignedStores) && u.assignedStores.length > 0 ? u.assignedStores : [u.assignedStoreId || 'all'],
    status: u.status || 'active',
    avatar: u.avatar || null,
    avatarUpdatedAt: u.avatarUpdatedAt || null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));
}

/**
 * Assigns an employee to a store
 */
async function addEmployeeToStore(storeId, userId, actor, req) {
  const { db, io } = getContext();
  const store = await db.collection('stores').findOne({ id: storeId });
  if (!store) {
    throw createHttpError(`Store '${storeId}' not found.`, 404, 'STORE_NOT_FOUND');
  }

  const user = await db.collection('users').findOne({ id: userId });
  if (!user) {
    throw createHttpError(`User '${userId}' not found.`, 404, 'USER_NOT_FOUND');
  }

  const currentStores = Array.isArray(user.assignedStores) && user.assignedStores.length > 0
    ? user.assignedStores.filter(s => s !== 'all')
    : (user.assignedStoreId && user.assignedStoreId !== 'all' ? [user.assignedStoreId] : []);

  if (currentStores.includes(storeId)) {
    return { success: true, message: `User already assigned to store '${storeId}'.`, user };
  }

  const updatedStores = Array.from(new Set([...currentStores, storeId]));
  const now = new Date().toISOString();

  await db.collection('users').updateOne(
    { id: userId },
    {
      $set: {
        assignedStores: updatedStores,
        assignedStoreId: user.assignedStoreId === 'all' || !user.assignedStoreId ? storeId : user.assignedStoreId,
        updatedAt: now
      }
    }
  );

  const updatedUser = await db.collection('users').findOne({ id: userId }, { projection: { password: 0, passwordHash: 0, salt: 0 } });

  await auditService.writeAuditLog(
    'STORE_EMPLOYEE_ASSIGNED',
    'stores',
    storeId,
    null,
    { storeId, userId, targetUsername: user.username, assignedStores: updatedStores },
    req
  );

  if (io) {
    io.to('sync_global').emit('user_updated', { userId, user: updatedUser });
    io.to(`store_${storeId}`).emit('store_membership_updated', { storeId, userId, action: 'added' });
  }

  return { success: true, message: `User @${user.username} assigned to store '${store.name}'.`, user: updatedUser };
}

/**
 * Removes an employee from a store
 */
async function removeEmployeeFromStore(storeId, userId, actor, req) {
  const { db, io } = getContext();
  const store = await db.collection('stores').findOne({ id: storeId });
  if (!store) {
    throw createHttpError(`Store '${storeId}' not found.`, 404, 'STORE_NOT_FOUND');
  }

  const user = await db.collection('users').findOne({ id: userId });
  if (!user) {
    throw createHttpError(`User '${userId}' not found.`, 404, 'USER_NOT_FOUND');
  }

  const currentStores = Array.isArray(user.assignedStores) && user.assignedStores.length > 0
    ? user.assignedStores
    : (user.assignedStoreId ? [user.assignedStoreId] : []);

  const updatedStores = currentStores.filter(s => s !== storeId);

  // If user is employee/auditor and has zero stores left, require at least 1 store or suspend
  if (updatedStores.length === 0 && (user.category === 'employee' || user.category === 'auditor')) {
    throw createHttpError('Cannot remove user from their only assigned store. Assign another store first.', 400, 'CANNOT_REMOVE_LAST_STORE');
  }

  const now = new Date().toISOString();
  const nextAssignedStoreId = updatedStores.length > 0
    ? (user.assignedStoreId === storeId ? updatedStores[0] : user.assignedStoreId)
    : 'none';

  await db.collection('users').updateOne(
    { id: userId },
    {
      $set: {
        assignedStores: updatedStores,
        assignedStoreId: nextAssignedStoreId,
        updatedAt: now
      }
    }
  );

  const updatedUser = await db.collection('users').findOne({ id: userId }, { projection: { password: 0, passwordHash: 0, salt: 0 } });

  await auditService.writeAuditLog(
    'STORE_EMPLOYEE_REMOVED',
    'stores',
    storeId,
    null,
    { storeId, userId, targetUsername: user.username, remainingStores: updatedStores },
    req
  );

  if (io) {
    io.to('sync_global').emit('user_updated', { userId, user: updatedUser });
    io.to(`store_${storeId}`).emit('store_membership_updated', { storeId, userId, action: 'removed' });
  }

  return { success: true, message: `User @${user.username} unassigned from store '${store.name}'.`, user: updatedUser };
}

/**
 * Promotes or demotes a store as a distribution HUB
 */
async function setStoreHubStatus(storeId, isHub, hubPriority = 1, actor, req) {
  const { db, io } = getContext();
  const store = await db.collection('stores').findOne({ id: storeId });
  if (!store) {
    throw createHttpError(`Store '${storeId}' not found.`, 404, 'STORE_NOT_FOUND');
  }

  const now = new Date().toISOString();
  const updates = {
    isHub: Boolean(isHub),
    hubPriority: typeof hubPriority === 'number' ? hubPriority : parseInt(hubPriority) || 1,
    updatedAt: now
  };

  await db.collection('stores').updateOne({ id: storeId }, { $set: updates });
  const updatedStore = await db.collection('stores').findOne({ id: storeId });

  await auditService.writeAuditLog(
    isHub ? 'STORE_HUB_PROMOTED' : 'STORE_HUB_DEMOTED',
    'stores',
    storeId,
    null,
    { storeId, storeName: store.name, isHub: updates.isHub, hubPriority: updates.hubPriority },
    req
  );

  if (io) {
    io.to('sync_global').emit('store_updated', { store: updatedStore });
  }

  return { success: true, store: updatedStore };
}

/**
 * Fetches store-specific sales invoices
 */
async function getStoreSales(storeId, query = {}, user) {
  const { db } = getContext();
  authzService.assertStoreAccess(user, storeId);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const filter = {
    isArchived: { $ne: true },
    $or: [{ locationId: storeId }, { storeId: storeId }, { businessId: storeId }]
  };

  if (query.status) filter.status = query.status;
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = query.startDate;
    if (query.endDate) filter.createdAt.$lte = query.endDate;
  }

  const total = await db.collection('invoices').countDocuments(filter);
  const invoices = await db.collection('invoices')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    success: true,
    storeId,
    invoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Fetches store-specific inventory balances left-joined with product master
 */
async function getStoreInventory(storeId, query = {}, user) {
  const { db } = getContext();
  authzService.assertStoreAccess(user, storeId);

  const inventoryItems = await db.collection('inventory')
    .find({ locationId: storeId })
    .toArray();

  const productIds = inventoryItems.map(i => i.productId).filter(Boolean);
  const products = await db.collection('products')
    .find({ id: { $in: productIds } })
    .toArray();

  const productMap = new Map(products.map(p => [p.id, p]));

  const enrichedInventory = inventoryItems.map(inv => {
    const prod = productMap.get(inv.productId) || {};
    return {
      productId: inv.productId,
      locationId: storeId,
      quantity: inv.quantity || 0,
      productName: prod.name || 'Unknown Product',
      sku: prod.sku || '',
      category: prod.category || '',
      price: prod.price || prod.sellingPrice || 0,
      cost: prod.cost || prod.purchasePrice || 0,
      reorderLevel: prod.reorder || prod.reorderLevel || 10
    };
  });

  return {
    success: true,
    storeId,
    inventory: enrichedInventory
  };
}

module.exports = {
  getStoreSummaryMetrics,
  getStoreEmployees,
  addEmployeeToStore,
  removeEmployeeFromStore,
  setStoreHubStatus,
  getStoreSales,
  getStoreInventory
};
