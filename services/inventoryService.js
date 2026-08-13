const { getContext } = require('../modules/context');

/**
 * Inventory Domain Service
 * Owns collections: 'inventory', 'inventory_ledger'
 */
const inventoryService = {
  /**
   * Records an immutable inventory movement in the ledger and updates real-time stock
   */
  async recordInventoryMovement(productId, locationId, type, quantity, referenceType, referenceId, performedBy) {
    const { db, io } = getContext();
    const currentInv = await db.collection('inventory').findOne({ productId, storeId: locationId });
    const beforeQuantity = currentInv ? (parseFloat(currentInv.quantity) || 0) : 0;
    const afterQuantity = beforeQuantity + parseFloat(quantity);

    // Update real-time inventory count in the 'inventory' collection
    await db.collection('inventory').updateOne(
      { productId, storeId: locationId },
      { 
        $set: { quantity: afterQuantity, updatedAt: new Date().toISOString() },
        $setOnInsert: { productId, storeId: locationId, reservedQuantity: 0, reorderLevel: 10 }
      },
      { upsert: true }
    );

    // Insert immutable movement record in the 'inventory_ledger' collection
    const ledgerId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    await db.collection('inventory_ledger').insertOne({
      id: ledgerId,
      productId,
      locationId,
      type,
      quantity: parseFloat(quantity),
      beforeQuantity,
      afterQuantity,
      referenceType,
      referenceId,
      performedBy: performedBy || 'system',
      createdAt: new Date().toISOString()
    });

    // Emit Socket update to the store room
    if (io) {
      io.to(`store_${locationId}`).emit('inventory.updated', {
        productId,
        storeId: locationId,
        quantity: afterQuantity
      });
    }

    return afterQuantity;
  },

  /**
   * Consume stock for POS invoice sales
   */
  async consumeStock(items, storeId, invoiceNumber, performedBy) {
    if (!Array.isArray(items) || !storeId) return;
    for (const item of items) {
      if (item.productId) {
        await this.recordInventoryMovement(
          item.productId,
          storeId,
          'sale',
          -Math.abs(parseFloat(item.quantity) || 0),
          'invoice',
          invoiceNumber,
          performedBy
        );
      }
    }
  },

  /**
   * Add stock from purchase entries
   */
  async addStock(items, storeId, purchaseId, performedBy) {
    if (!Array.isArray(items) || !storeId) return;
    for (const item of items) {
      if (item.productId) {
        await this.recordInventoryMovement(
          item.productId,
          storeId,
          'purchase',
          Math.abs(parseFloat(item.quantity) || 0),
          'purchase',
          purchaseId,
          performedBy
        );
      }
    }
  },

  /**
   * Revert stock (void invoice or delete purchase)
   */
  async revertStock(items, storeId, type, referenceType, referenceId, performedBy) {
    if (!Array.isArray(items) || !storeId) return;
    for (const item of items) {
      if (item.productId) {
        const qty = parseFloat(item.quantity) || 0;
        const delta = type === 'void_sale' ? Math.abs(qty) : -Math.abs(qty);
        await this.recordInventoryMovement(
          item.productId,
          storeId,
          type,
          delta,
          referenceType,
          referenceId,
          performedBy
        );
      }
    }
  },

  /**
   * Adjust stock manually
   */
  async adjustStock(productId, storeId, quantity, type, referenceId, performedBy) {
    return await this.recordInventoryMovement(
      productId,
      storeId,
      type || 'adjustment',
      quantity,
      'manual',
      referenceId || 'N/A',
      performedBy
    );
  },

  /**
   * Transfer stock between stores
   */
  async transferStock(productId, fromStoreId, toStoreId, quantity, performedBy) {
    const qty = Math.abs(parseFloat(quantity) || 0);
    const transferRef = `tf-${Date.now()}`;

    // Deduct from source store
    await this.recordInventoryMovement(
      productId,
      fromStoreId,
      'transfer_out',
      -qty,
      'transfer',
      transferRef,
      performedBy
    );

    // Add to destination store
    await this.recordInventoryMovement(
      productId,
      toStoreId,
      'transfer_in',
      qty,
      'transfer',
      transferRef,
      performedBy
    );

    return { success: true, referenceId: transferRef };
  },

  /**
   * Fetch inventory snapshot
   */
  async listInventory(filter = {}) {
    const { db } = getContext();
    return await db.collection('inventory').find(filter).toArray();
  },

  /**
   * Query inventory ledger logs with filters and pagination
   */
  async getLedgerLogs(query = {}) {
    const { db } = getContext();
    const {
      productId,
      storeId,
      type,
      startDate,
      endDate,
      limit = 50,
      cursor
    } = query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (storeId) filter.locationId = storeId;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate).toISOString();
      if (endDate) filter.createdAt.$lte = new Date(endDate).toISOString();
    }

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const maxLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);

    const logs = await db.collection('inventory_ledger')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .toArray();

    const nextCursor = logs.length === maxLimit ? logs[logs.length - 1]._id : null;

    return {
      success: true,
      data: logs,
      pagination: {
        limit: maxLimit,
        nextCursor
      }
    };
  }
};

module.exports = inventoryService;
