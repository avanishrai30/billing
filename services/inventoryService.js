const { getContext } = require('../modules/context');
const auditService = require('./auditService');

async function assertProductMasterExists(productId) {
  if (!productId) {
    const err = new Error("Product Master is required for inventory movement.");
    err.code = 'PRODUCT_MASTER_NOT_FOUND';
    err.statusCode = 409;
    throw err;
  }

  const { db } = getContext();
  const product = await db.collection('products').findOne({ id: productId });
  if (!product) {
    const err = new Error(`Product Master not found for product '${productId}'. Inventory balances cannot be created or changed for missing products.`);
    err.code = 'PRODUCT_MASTER_NOT_FOUND';
    err.statusCode = 409;
    err.productId = productId;
    throw err;
  }

  return product;
}

/**
 * Authoritative Inventory Domain Service (ERP V3 - Stage 07 & Phase 33 Multi-Store Command Center)
 * Owns collections: 'inventory', 'inventory_ledger', 'product_batches'
 */
const inventoryService = {
  /**
   * Core atomic movement recorder
   * Ensures mathematical consistency under concurrency with atomic operations and immutable ledger
   */
  async recordMovementAtomic({
    productId,
    locationId,
    locationType = 'STORE',
    type,
    quantityDelta,
    unitCost = 0,
    totalValue = null,
    referenceType = 'manual',
    referenceId = 'N/A',
    performedBy = 'system',
    notes = '',
    allowNegative = false,
    skipRealtimeSocket = false
  }) {
    const { db, io } = getContext();
    const cleanLocationId = locationId || 'all';
    const delta = parseFloat(quantityDelta) || 0;
    const now = new Date().toISOString();
    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    if (delta === 0) {
      throw new Error("Inventory quantity delta cannot be zero");
    }

    await assertProductMasterExists(productId);

    // 1. If decreasing stock and negative not allowed, enforce atomic guard: quantity >= abs(delta)
    if (delta < 0 && !allowNegative) {
      const requiredQty = Math.abs(delta);
      const updateResult = await db.collection('inventory').findOneAndUpdate(
        {
          productId,
          $or: [{ locationId: cleanLocationId }, { storeId: cleanLocationId }],
          quantity: { $gte: requiredQty }
        },
        {
          $inc: { quantity: delta, version: 1 },
          $set: {
            locationId: cleanLocationId,
            storeId: cleanLocationId, // legacy compatibility
            locationType,
            updatedAt: now
          },
          $setOnInsert: {
            productId,
            reservedQuantity: 0,
            reorderLevel: 10
          }
        },
        { returnDocument: 'after' }
      );

      const doc = updateResult ? (updateResult.value || updateResult) : null;
      if (!doc || doc.quantity === undefined) {
        const currentRec = await db.collection('inventory').findOne({
          productId,
          $or: [{ locationId: cleanLocationId }, { storeId: cleanLocationId }]
        });
        const available = currentRec ? (parseFloat(currentRec.quantity) || 0) : 0;
        const err = new Error(`Insufficient stock for product '${productId}'. Requested: ${requiredQty}, Available: ${available}`);
        err.code = 'INSUFFICIENT_STOCK';
        err.productId = productId;
        err.requested = requiredQty;
        err.available = available;
        throw err;
      }

      const afterQuantity = parseFloat(doc.quantity) || 0;
      const beforeQuantity = afterQuantity - delta;
      const calcTotalValue = totalValue !== null ? totalValue : Math.abs(delta) * parseFloat(unitCost || 0);

      // 2. Insert immutable ledger entry
      await db.collection('inventory_ledger').insertOne({
        movementId,
        id: movementId,
        productId,
        locationId: cleanLocationId,
        storeId: cleanLocationId,
        locationType,
        type: type.toUpperCase(),
        quantity: delta,
        beforeQuantity,
        afterQuantity,
        unitCost: parseFloat(unitCost) || 0,
        totalValue: calcTotalValue,
        referenceType,
        referenceId,
        performedBy,
        notes,
        createdAt: now
      });

      // 3. Emit realtime event
      if (io && !skipRealtimeSocket) {
        const realtimeService = require('./realtimeService');
        const envelope = realtimeService.createEventEnvelope(
          'inventory',
          'updated',
          productId,
          cleanLocationId,
          {
            productId,
            locationId: cleanLocationId,
            storeId: cleanLocationId,
            quantity: afterQuantity,
            delta
          },
          doc.version || 1
        );
        io.to(`store_${cleanLocationId}`).emit('inventory.updated', envelope);
        io.to('sync_global').emit('inventory.updated', envelope);
      }

      return { success: true, movementId, beforeQuantity, afterQuantity };
    }

    // Positive delta (increase) or authorized adjustment
    const updateResult = await db.collection('inventory').findOneAndUpdate(
      {
        productId,
        $or: [{ locationId: cleanLocationId }, { storeId: cleanLocationId }]
      },
      {
        $inc: { quantity: delta, version: 1 },
        $set: {
          locationId: cleanLocationId,
          storeId: cleanLocationId,
          locationType,
          updatedAt: now
        },
        $setOnInsert: {
          productId,
          reservedQuantity: 0,
          reorderLevel: 10
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const doc = updateResult ? (updateResult.value || updateResult) : null;
    const afterQuantity = doc ? (parseFloat(doc.quantity) || 0) : delta;
    const beforeQuantity = afterQuantity - delta;
    const calcTotalValue = totalValue !== null ? totalValue : Math.abs(delta) * parseFloat(unitCost || 0);

    // Insert immutable ledger entry
    await db.collection('inventory_ledger').insertOne({
      movementId,
      id: movementId,
      productId,
      locationId: cleanLocationId,
      storeId: cleanLocationId,
      locationType,
      type: type.toUpperCase(),
      quantity: delta,
      beforeQuantity,
      afterQuantity,
      unitCost: parseFloat(unitCost) || 0,
      totalValue: calcTotalValue,
      referenceType,
      referenceId,
      performedBy,
      notes,
      createdAt: now
    });

    if (io && !skipRealtimeSocket) {
      const realtimeService = require('./realtimeService');
      const envelope = realtimeService.createEventEnvelope(
        'inventory',
        'updated',
        productId,
        cleanLocationId,
        {
          productId,
          locationId: cleanLocationId,
          storeId: cleanLocationId,
          quantity: afterQuantity,
          delta
        },
        doc ? (doc.version || 1) : 1
      );
      io.to(`store_${cleanLocationId}`).emit('inventory.updated', envelope);
      io.to('sync_global').emit('inventory.updated', envelope);
    }

    return { success: true, movementId, beforeQuantity, afterQuantity };
  },

  /**
   * Pre-flight stock availability checker
   */
  async checkStockAvailability(items, locationId) {
    const { db } = getContext();
    const cleanLocationId = locationId || 'all';
    const errors = [];
    const itemDetails = [];

    if (!Array.isArray(items) || items.length === 0) {
      return { available: true, items: [] };
    }

    for (const item of items) {
      const prodId = item.productId || item.id;
      const requested = parseFloat(item.quantity) || 0;
      if (!prodId || requested <= 0) continue;

      const record = await db.collection('inventory').findOne({
        productId: prodId,
        $or: [{ locationId: cleanLocationId }, { storeId: cleanLocationId }]
      });

      const currentStock = record ? (parseFloat(record.quantity) || 0) : 0;
      if (currentStock < requested) {
        errors.push({
          productId: prodId,
          name: item.name || prodId,
          requested,
          available: currentStock
        });
      }

      itemDetails.push({
        productId: prodId,
        requested,
        available: currentStock,
        unit: item.unit || 'unit'
      });
    }

    if (errors.length > 0) {
      return {
        available: false,
        errors,
        items: itemDetails
      };
    }

    return {
      available: true,
      items: itemDetails
    };
  },

  /**
   * Batch stock consumption for POS invoices
   */
  async consumeStockBatch(items, locationId, referenceId, performedBy) {
    if (!Array.isArray(items) || items.length === 0 || !locationId) {
      return { success: true, movements: [] };
    }

    // 1. Pre-validate all items
    const availability = await this.checkStockAvailability(items, locationId);
    if (!availability.available) {
      const err = new Error(`Insufficient stock for items in checkout basket.`);
      err.code = 'INSUFFICIENT_STOCK';
      err.errors = availability.errors;
      throw err;
    }

    const completedDeductions = [];

    try {
      // 2. Decrement each item atomically
      for (const item of items) {
        const prodId = item.productId || item.id;
        const qty = parseFloat(item.quantity) || 0;
        if (!prodId || qty <= 0) continue;

        const res = await this.recordMovementAtomic({
          productId: prodId,
          locationId,
          locationType: 'STORE',
          type: 'SALE',
          quantityDelta: -qty,
          unitCost: item.cost || item.purchasePrice || 0,
          totalValue: (parseFloat(item.price || item.sellingPrice || 0) * qty),
          referenceType: 'invoice',
          referenceId,
          performedBy,
          notes: `POS Sale Checkout #${referenceId}`
        });

        completedDeductions.push({ productId: prodId, quantity: qty, res });
      }

      return { success: true, movements: completedDeductions };
    } catch (err) {
      console.error(`[InventoryService] Error in consumeStockBatch for ref ${referenceId}, initiating compensating rollback...`, err);
      const rollbackSuccesses = [];
      const rollbackFailures = [];

      for (const comp of completedDeductions) {
        try {
          const rbRes = await this.recordMovementAtomic({
            productId: comp.productId,
            locationId,
            locationType: 'STORE',
            type: 'VOID',
            quantityDelta: comp.quantity,
            referenceType: 'rollback',
            referenceId,
            performedBy: 'system',
            notes: `Compensating rollback for failed checkout #${referenceId}`
          });
          rollbackSuccesses.push({ productId: comp.productId, quantity: comp.quantity, res: rbRes });
        } catch (rbErr) {
          console.error(`[InventoryService] Critical rollback failure for product ${comp.productId}:`, rbErr);
          rollbackFailures.push({ productId: comp.productId, quantity: comp.quantity, error: rbErr.message });
        }
      }

      if (rollbackFailures.length > 0) {
        await auditService.writeAuditLog(
          'CRITICAL_ROLLBACK_FAILURE',
          'inventory',
          referenceId,
          null,
          { referenceId, locationId, rollbackFailures, rollbackSuccesses },
          null
        );
      }

      err.rollbackStatus = {
        attempted: completedDeductions.length,
        succeeded: rollbackSuccesses.length,
        failed: rollbackFailures.length,
        failures: rollbackFailures
      };
      throw err;
    }
  },

  /**
   * Batch stock increment for supplier purchases and bulk import
   */
  async addStockBatch(items, locationId, referenceId, performedBy, options = {}) {
    if (!Array.isArray(items) || items.length === 0 || !locationId) {
      return { success: true, movements: [] };
    }

    const completedAdditions = [];

    try {
      for (const item of items) {
        const prodId = item.productId || item.id;
        const qty = parseFloat(item.quantity) || 0;
        if (!prodId || qty <= 0) continue;

        const res = await this.recordMovementAtomic({
          productId: prodId,
          locationId,
          locationType: 'STORE',
          type: options.type || 'PURCHASE',
          quantityDelta: qty,
          unitCost: item.cost || item.purchasePrice || item.rate || 0,
          totalValue: (parseFloat(item.cost || item.purchasePrice || 0) * qty),
          referenceType: options.referenceType || 'purchase',
          referenceId,
          performedBy,
          notes: options.notes || `Stock Batch Entry #${referenceId}`,
          skipRealtimeSocket: options.skipRealtimeSocket || false
        });

        completedAdditions.push({ productId: prodId, quantity: qty, res });
      }

      return { success: true, movements: completedAdditions };
    } catch (err) {
      console.error(`[InventoryService] Error in addStockBatch for ref ${referenceId}, initiating compensating rollback...`, err);
      const rollbackSuccesses = [];
      const rollbackFailures = [];

      for (const comp of completedAdditions) {
        try {
          const rbRes = await this.recordMovementAtomic({
            productId: comp.productId,
            locationId,
            locationType: 'STORE',
            type: 'VOID',
            quantityDelta: -comp.quantity,
            referenceType: 'rollback',
            referenceId,
            performedBy: 'system',
            notes: `Compensating rollback for failed purchase #${referenceId}`,
            allowNegative: true
          });
          rollbackSuccesses.push({ productId: comp.productId, quantity: comp.quantity, res: rbRes });
        } catch (rbErr) {
          console.error(`[InventoryService] Critical purchase rollback failure for product ${comp.productId}:`, rbErr);
          rollbackFailures.push({ productId: comp.productId, quantity: comp.quantity, error: rbErr.message });
        }
      }

      if (rollbackFailures.length > 0) {
        await auditService.writeAuditLog(
          'CRITICAL_ROLLBACK_FAILURE',
          'inventory',
          referenceId,
          null,
          { referenceId, locationId, rollbackFailures, rollbackSuccesses },
          null
        );
      }

      err.rollbackStatus = {
        attempted: completedAdditions.length,
        succeeded: rollbackSuccesses.length,
        failed: rollbackFailures.length,
        failures: rollbackFailures
      };
      throw err;
    }
  },

  /**
   * Batch stock reversion
   */
  async revertStockBatch(items, locationId, type, referenceType, referenceId, performedBy) {
    if (!Array.isArray(items) || items.length === 0 || !locationId) return;

    for (const item of items) {
      const prodId = item.productId || item.id;
      const qty = parseFloat(item.quantity) || 0;
      if (!prodId || qty <= 0) continue;

      const isVoidSale = (type || '').toUpperCase() === 'VOID' || (type || '').toLowerCase() === 'void_sale';
      const delta = isVoidSale ? Math.abs(qty) : -Math.abs(qty);
      const movType = isVoidSale ? 'VOID' : 'DAMAGE';

      await this.recordMovementAtomic({
        productId: prodId,
        locationId,
        locationType: 'STORE',
        type: movType,
        quantityDelta: delta,
        unitCost: item.cost || item.purchasePrice || 0,
        referenceType,
        referenceId,
        performedBy,
        notes: `Reversion event (${type}) for #${referenceId}`,
        allowNegative: !isVoidSale
      });
    }
  },

  /**
   * Inter-store atomic stock transfer with Batch & Expiry support (Phase 33)
   * Enforces that source location must have sufficient stock and maintains network total invariant.
   */
  async transferStock(productId, fromLocationId, toLocationId, quantity, performedBy, notes = '', batchId = null) {
    const { db } = getContext();
    const qty = Math.abs(parseFloat(quantity) || 0);
    if (qty <= 0) throw new Error("Transfer quantity must be greater than zero");
    if (fromLocationId === toLocationId) throw new Error("Source and target locations cannot be the same");

    const transferRef = `tf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // 0. Batch check & transfer if batchId provided
    let sourceBatch = null;
    if (batchId) {
      sourceBatch = await db.collection('product_batches').findOne({
        id: batchId,
        productId,
        $or: [{ locationId: fromLocationId }, { storeId: fromLocationId }, { locationId: 'all' }, { locationId: { $exists: false } }]
      });

      if (!sourceBatch) {
        sourceBatch = await db.collection('product_batches').findOne({ id: batchId, productId });
      }

      if (sourceBatch) {
        const batchRem = parseFloat(sourceBatch.remainingQuantity) || 0;
        if (batchRem < qty) {
          const err = new Error(`Insufficient batch stock for batch '${sourceBatch.lotNumber}'. Available: ${batchRem}, Requested: ${qty}`);
          err.code = 'INSUFFICIENT_BATCH_STOCK';
          throw err;
        }

        // Decrement source batch
        await db.collection('product_batches').updateOne(
          { _id: sourceBatch._id },
          {
            $inc: { remainingQuantity: -qty },
            $set: { updatedAt: new Date().toISOString() }
          }
        );

        // Find or create destination batch
        const destBatch = await db.collection('product_batches').findOne({
          productId,
          lotNumber: sourceBatch.lotNumber,
          $or: [{ locationId: toLocationId }, { storeId: toLocationId }]
        });

        if (destBatch) {
          await db.collection('product_batches').updateOne(
            { _id: destBatch._id },
            {
              $inc: { remainingQuantity: qty },
              $set: { updatedAt: new Date().toISOString() }
            }
          );
        } else {
          await db.collection('product_batches').insertOne({
            id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            productId,
            lotNumber: sourceBatch.lotNumber,
            manufactureDate: sourceBatch.manufactureDate,
            expiryDate: sourceBatch.expiryDate,
            receivedQuantity: qty,
            remainingQuantity: qty,
            unitCost: sourceBatch.unitCost || 0,
            sellingPrice: sourceBatch.sellingPrice || 0,
            locationId: toLocationId,
            storeId: toLocationId,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 1. Deduct from source store with atomic $gte guard
    const deductRes = await this.recordMovementAtomic({
      productId,
      locationId: fromLocationId,
      locationType: 'STORE',
      type: 'TRANSFER_OUT',
      quantityDelta: -qty,
      referenceType: 'transfer',
      referenceId: transferRef,
      performedBy,
      notes: `Transfer Out to ${toLocationId}${sourceBatch ? ` [Batch: ${sourceBatch.lotNumber}]` : ''}: ${notes}`.trim()
    });

    try {
      // 2. Add to destination store
      const addRes = await this.recordMovementAtomic({
        productId,
        locationId: toLocationId,
        locationType: 'STORE',
        type: 'TRANSFER_IN',
        quantityDelta: qty,
        referenceType: 'transfer',
        referenceId: transferRef,
        performedBy,
        notes: `Transfer In from ${fromLocationId}${sourceBatch ? ` [Batch: ${sourceBatch.lotNumber}]` : ''}: ${notes}`.trim()
      });

      return {
        success: true,
        referenceId: transferRef,
        fromBefore: deductRes.beforeQuantity,
        fromAfter: deductRes.afterQuantity,
        toBefore: addRes.beforeQuantity,
        toAfter: addRes.afterQuantity,
        batchLotNumber: sourceBatch ? sourceBatch.lotNumber : null
      };
    } catch (err) {
      console.error(`[InventoryService] Transfer destination failed, reverting source store deduction...`, err);
      if (sourceBatch) {
        await db.collection('product_batches').updateOne(
          { _id: sourceBatch._id },
          { $inc: { remainingQuantity: qty }, $set: { updatedAt: new Date().toISOString() } }
        );
      }
      await this.recordMovementAtomic({
        productId,
        locationId: fromLocationId,
        locationType: 'STORE',
        type: 'TRANSFER_IN',
        quantityDelta: qty,
        referenceType: 'transfer_rollback',
        referenceId: transferRef,
        performedBy: 'system',
        notes: `Rollback failed transfer to ${toLocationId}`
      });
      throw err;
    }
  },

  /**
   * Manual Stock Adjustment
   */
  async adjustStock(productId, locationId, targetQuantity, type = 'ADJUSTMENT', referenceId = 'N/A', performedBy = 'system', notes = '', unitCost = 0) {
    const { db } = getContext();
    const cleanLocationId = locationId || 'all';
    const targetQty = parseFloat(targetQuantity);
    if (isNaN(targetQty)) throw new Error("Target quantity must be a valid number");

    const currentRec = await db.collection('inventory').findOne({
      productId,
      $or: [{ locationId: cleanLocationId }, { storeId: cleanLocationId }]
    });

    const beforeQuantity = currentRec ? (parseFloat(currentRec.quantity) || 0) : 0;
    const delta = targetQty - beforeQuantity;

    if (delta === 0) {
      return beforeQuantity;
    }

    const res = await this.recordMovementAtomic({
      productId,
      locationId: cleanLocationId,
      locationType: 'STORE',
      type: type.toUpperCase(),
      quantityDelta: delta,
      unitCost,
      referenceType: 'manual_adjustment',
      referenceId,
      performedBy,
      notes: notes || `Manual stock adjustment to ${targetQty}`,
      allowNegative: false
    });

    return res.afterQuantity;
  },

  /**
   * Fetch current inventory list with store and product filters
   */
  async listInventory(filter = {}) {
    const { db } = getContext();
    const mongoFilter = {};

    if (filter.storeId || filter.locationId) {
      const locId = filter.locationId || filter.storeId;
      mongoFilter.$or = [{ locationId: locId }, { storeId: locId }];
    }
    if (filter.productId) {
      mongoFilter.productId = filter.productId;
    }

    const records = await db.collection('inventory').find(mongoFilter).toArray();
    return records.map(r => ({
      ...r,
      locationId: r.locationId || r.storeId || 'all',
      storeId: r.storeId || r.locationId || 'all',
      quantity: parseFloat(r.quantity) || 0,
      reservedQuantity: parseFloat(r.reservedQuantity) || 0,
      reorderLevel: parseFloat(r.reorderLevel) || 10,
      version: r.version || 1
    }));
  },

  /**
   * Product-centric Multi-Store Inventory Command Center Aggregator (Phase 35)
   */
  async getInventoryCommandCenter(user) {
    const { db } = getContext();
    const authzService = require('./authzService');
    const isRestrictedStoreUser = !authzService.isSuperAdmin(user) && user?.assignedStoreId && user.assignedStoreId !== 'all';
    const restrictedStoreId = isRestrictedStoreUser ? user.assignedStoreId : null;

    // 1. Fetch stores
    const storeFilter = restrictedStoreId
      ? { id: restrictedStoreId, status: { $ne: 'inactive' } }
      : { status: { $ne: 'inactive' } };
    const rawStores = await db.collection('stores').find(storeFilter).sort({ name: 1 }).toArray();

    // Normalize stores with a designated Central Warehouse
    let stores = rawStores.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code || `ST-${s.name.substring(0, 3).toUpperCase()}`,
      isWarehouse: !!s.isWarehouse || s.id === 'central-warehouse' || s.name.toLowerCase().includes('central') || s.name.toLowerCase().includes('warehouse')
    }));

    if (!restrictedStoreId && !stores.some(s => s.isWarehouse)) {
      if (stores.length > 0) {
        stores[0].isWarehouse = true;
      } else {
        stores = [
          { id: 'central-warehouse', name: 'Central Warehouse', code: 'WH-01', isWarehouse: true }
        ];
      }
    }

    // 2. Fetch Product Masters. Active products form the base display model,
    // while archived products still prevent legacy balances from being treated
    // as orphan inventory.
    const products = await db.collection('products').find({}).toArray();
    const activeProducts = products.filter(p => p.isArchived !== true && p.status !== 'archived' && p.status !== 'inactive');
    const productMap = new Map();
    products.forEach(p => productMap.set(p.id, p));

    // 3. Fetch inventory records. Store-scoped users only receive their store's
    // balances; zero-stock rows for every active product are synthesized in
    // memory below without writing inventory documents.
    const inventoryFilter = restrictedStoreId
      ? { $or: [{ locationId: restrictedStoreId }, { storeId: restrictedStoreId }] }
      : {};
    const inventoryRecords = await db.collection('inventory').find(inventoryFilter).toArray();

    // 4. Fetch all active product batches
    const batchFilter = {
      status: { $ne: 'archived' },
      remainingQuantity: { $gt: 0 }
    };
    if (restrictedStoreId) {
      batchFilter.$or = [{ locationId: restrictedStoreId }, { storeId: restrictedStoreId }];
    }
    const rawBatches = await db.collection('product_batches').find(batchFilter).sort({ expiryDate: 1 }).toArray();

    const batchesByProduct = new Map();
    rawBatches.forEach(b => {
      if (!batchesByProduct.has(b.productId)) {
        batchesByProduct.set(b.productId, []);
      }
      batchesByProduct.get(b.productId).push({
        id: b.id || (b._id ? String(b._id) : ''),
        lotNumber: b.lotNumber || 'N/A',
        expiryDate: b.expiryDate,
        manufactureDate: b.manufactureDate,
        remainingQuantity: parseFloat(b.remainingQuantity) || 0,
        locationId: b.locationId || b.storeId || 'all'
      });
    });

    // 5. Group inventory by productId
    const inventoryByProduct = new Map();
    inventoryRecords.forEach(r => {
      if (!inventoryByProduct.has(r.productId)) {
        inventoryByProduct.set(r.productId, []);
      }
      inventoryByProduct.get(r.productId).push(r);
    });

    const allProductIds = Array.from(new Set([
      ...activeProducts.map(p => p.id),
      ...inventoryRecords.map(r => r.productId)
    ].filter(Boolean)));

    let networkStockTotal = 0;
    let centralStockTotal = 0;
    let storeStockTotal = 0;
    let stockedProducts = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;
    let expiringSoonCount = 0;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysIso = thirtyDaysFromNow.toISOString();

    const networkBalances = [];

    for (const prodId of allProductIds) {
      const prod = productMap.get(prodId);
      const isOrphan = !prod;
      const invList = inventoryByProduct.get(prodId) || [];
      const prodBatches = batchesByProduct.get(prodId) || [];

      // Check if any batch is expiring soon (within 30 days)
      const hasExpiringBatch = prodBatches.some(b => b.expiryDate && b.expiryDate <= thirtyDaysIso && b.remainingQuantity > 0);
      if (hasExpiringBatch) {
        expiringSoonCount++;
      }

      // Location breakdown
      const locationBreakdown = stores.map(st => {
        const matchingInv = invList.find(r => (r.locationId === st.id || r.storeId === st.id));
        const q = matchingInv ? (parseFloat(matchingInv.quantity) || 0) : 0;
        const res = matchingInv ? (parseFloat(matchingInv.reservedQuantity) || 0) : 0;
        const avail = Math.max(0, q - res);

        return {
          locationId: st.id,
          locationName: st.name,
          isWarehouse: st.isWarehouse,
          quantity: q,
          reservedQuantity: res,
          available: avail
        };
      });

      invList.forEach(r => {
        const loc = r.locationId || r.storeId || 'all';
        if (!stores.some(st => st.id === loc)) {
          const q = parseFloat(r.quantity) || 0;
          const res = parseFloat(r.reservedQuantity) || 0;
          locationBreakdown.push({
            locationId: loc,
            locationName: loc === 'all' ? 'Unassigned' : loc,
            isWarehouse: false,
            quantity: q,
            reservedQuantity: res,
            available: Math.max(0, q - res)
          });
        }
      });

      const networkQuantity = locationBreakdown.reduce((acc, l) => acc + l.quantity, 0);
      const networkReserved = locationBreakdown.reduce((acc, l) => acc + l.reservedQuantity, 0);
      const networkAvailable = Math.max(0, networkQuantity - networkReserved);

      const centralBreakdown = locationBreakdown.find(l => l.isWarehouse);
      const centralQty = centralBreakdown ? centralBreakdown.quantity : 0;
      const storeQty = networkQuantity - centralQty;

      networkStockTotal += networkQuantity;
      centralStockTotal += centralQty;
      storeStockTotal += storeQty;
      if (!isOrphan && networkQuantity > 0) {
        stockedProducts++;
      }

      const unitCost = Number(prod?.purchasePrice ?? prod?.cost ?? 0);
      const sellingPrice = Number(prod?.sellingPrice ?? prod?.price ?? 0);
      const reorderLevel = Number(prod?.reorderLevel || 10);

      totalValuation += (networkQuantity * unitCost);

      if (networkQuantity <= 0) {
        outOfStockCount++;
      } else if (networkQuantity <= reorderLevel) {
        lowStockCount++;
      }

      networkBalances.push({
        productId: prodId,
        productName: prod?.name || (isOrphan ? 'Product Master Missing' : prodId),
        sku: prod?.sku || '',
        barcode: prod?.barcode || '',
        brand: prod?.brand || '',
        category: prod?.category || (isOrphan ? 'Missing Master' : 'General'),
        unit: prod?.unit || 'units',
        cost: unitCost,
        price: sellingPrice,
        reorderLevel,
        isOrphan,
        defaultExpiryDate: prod?.defaultExpiryDate || null,
        networkQuantity,
        networkReserved,
        networkAvailable,
        locationBreakdown,
        batches: prodBatches
      });
    }

    // Sort by product name
    networkBalances.sort((a, b) => {
      if (a.isOrphan && !b.isOrphan) return 1;
      if (!a.isOrphan && b.isOrphan) return -1;
      return (a.productName || '').localeCompare(b.productName || '');
    });

    return {
      success: true,
      stores,
      networkBalances,
      summary: {
        totalProducts: activeProducts.length,
        catalogProducts: activeProducts.length,
        stockedProducts,
        networkStock: Math.round(networkStockTotal * 100) / 100,
        centralStock: Math.round(centralStockTotal * 100) / 100,
        storeStock: Math.round(storeStockTotal * 100) / 100,
        lowStockCount,
        outOfStockCount,
        expiringSoonCount,
        totalValuation: Math.round(totalValuation * 100) / 100
      }
    };
  },

  /**
   * Aggregated Inventory Summary (without full collection loading)
   */
  async getInventorySummary(locationId) {
    const { db } = getContext();
    const match = {};
    if (locationId && locationId !== 'all') {
      match.$or = [{ locationId }, { storeId: locationId }];
    }

    const inventoryRecords = await db.collection('inventory').find(match).toArray();
    const products = await db.collection('products').find({ isArchived: { $ne: true } }).toArray();
    const productPriceMap = new Map();
    products.forEach(p => {
      productPriceMap.set(p.id, {
        price: parseFloat(p.sellingPrice || p.price || 0),
        cost: parseFloat(p.purchasePrice || p.costPrice || p.cost || 0),
        reorder: parseFloat(p.reorderLevel || p.reorder || 10)
      });
    });

    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inventoryValue = 0;
    const trackedProducts = new Set();

    inventoryRecords.forEach(r => {
      const qty = parseFloat(r.quantity) || 0;
      totalUnits += qty;
      trackedProducts.add(r.productId);

      const pInfo = productPriceMap.get(r.productId) || { price: 0, cost: 0, reorder: 10 };
      inventoryValue += (qty * pInfo.cost);

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= (r.reorderLevel || pInfo.reorder)) {
        lowStockCount++;
      }
    });

    return {
      success: true,
      summary: {
        totalProducts: products.length,
        totalTrackedItems: trackedProducts.size,
        totalUnits: Math.round(totalUnits * 100) / 100,
        lowStockCount,
        outOfStockCount,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        locationId: locationId || 'all'
      }
    };
  },

  /**
   * Query inventory ledger logs with filters, limit, and cursor pagination
   */
  async getLedgerLogs(query = {}) {
    const { db } = getContext();
    const {
      productId,
      storeId,
      locationId,
      type,
      startDate,
      endDate,
      limit = 50,
      cursor
    } = query;

    const filter = {};
    if (productId) filter.productId = productId;

    const loc = locationId || storeId;
    if (loc && loc !== 'all') {
      filter.$or = [{ locationId: loc }, { storeId: loc }];
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate).toISOString();
      if (endDate) filter.createdAt.$lte = new Date(endDate).toISOString();
    }

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const maxLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);

    const logs = await db.collection('inventory_ledger')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .toArray();

    const nextCursor = logs.length === maxLimit ? logs[logs.length - 1]._id : null;

    return {
      success: true,
      data: logs.map(l => ({
        ...l,
        movementId: l.movementId || l.id,
        locationId: l.locationId || l.storeId || 'all',
        storeId: l.storeId || l.locationId || 'all',
        quantity: parseFloat(l.quantity) || 0,
        beforeQuantity: parseFloat(l.beforeQuantity) || 0,
        afterQuantity: parseFloat(l.afterQuantity) || 0
      })),
      pagination: {
        limit: maxLimit,
        nextCursor
      }
    };
  },

  /**
   * Backward-compatibility wrapper for legacy single item calls
   */
  async recordInventoryMovement(productId, locationId, type, quantity, referenceType, referenceId, performedBy) {
    const res = await this.recordMovementAtomic({
      productId,
      locationId,
      type,
      quantityDelta: parseFloat(quantity),
      referenceType,
      referenceId,
      performedBy,
      allowNegative: false
    });
    return res.afterQuantity;
  },

  async consumeStock(items, storeId, invoiceNumber, performedBy) {
    return await this.consumeStockBatch(items, storeId, invoiceNumber, performedBy);
  },

  async addStock(items, storeId, purchaseId, performedBy) {
    return await this.addStockBatch(items, storeId, purchaseId, performedBy);
  },

  async revertStock(items, storeId, type, referenceType, referenceId, performedBy) {
    return await this.revertStockBatch(items, storeId, type, referenceType, referenceId, performedBy);
  }
};

inventoryService.assertProductMasterExists = assertProductMasterExists;

module.exports = inventoryService;
