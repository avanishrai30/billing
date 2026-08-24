const { getContext } = require('../modules/context');
const auditService = require('./auditService');
const inventoryService = require('./inventoryService');
const { isSuperAdmin } = require('./authzService');

/**
 * Super Admin Data Cleanup & Maintenance Service
 * Handles high-safety administrative cleanups across Invoices, Inventory, Products, and Purchases.
 */

// Helper to convert date filter presets to ISO Date boundaries (Asia/Kolkata timezone standard)
function resolveDateRange(datePreset, customStart, customEnd) {
  const now = new Date();
  let start = null;
  let end = null;

  if (datePreset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (datePreset === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
    end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
  } else if (datePreset === 'last7days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    end = new Date();
  } else if (datePreset === 'last30days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    end = new Date();
  } else if (datePreset === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date();
  } else if (datePreset === 'custom' || customStart || customEnd) {
    if (customStart) start = new Date(customStart);
    if (customEnd) {
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      end = e;
    }
  }

  return {
    startDate: start ? start.toISOString() : null,
    endDate: end ? end.toISOString() : null
  };
}

const adminCleanupService = {
  /**
   * 1. Get high-level domain summary stats for Dashboard cards
   */
  async getDomainSummary() {
    const { db } = getContext();

    // Invoices summary
    const totalInvoices = await db.collection('invoices').countDocuments({});
    const activeInvoices = await db.collection('invoices').countDocuments({ isArchived: { $ne: true }, status: { $ne: 'VOIDED' } });
    const archivedInvoices = await db.collection('invoices').countDocuments({ isArchived: true });
    const voidedInvoices = await db.collection('invoices').countDocuments({ status: 'VOIDED' });

    // Purchases summary
    const totalPurchases = await db.collection('purchases').countDocuments({});
    const activePurchases = await db.collection('purchases').countDocuments({ isArchived: { $ne: true }, status: { $ne: 'VOIDED' } });
    const archivedPurchases = await db.collection('purchases').countDocuments({ isArchived: true });
    const voidedPurchases = await db.collection('purchases').countDocuments({ status: 'VOIDED' });

    // Products summary
    const totalProducts = await db.collection('products').countDocuments({});
    const activeProducts = await db.collection('products').countDocuments({ isArchived: { $ne: true } });
    const archivedProducts = await db.collection('products').countDocuments({ isArchived: true });

    // Inventory summary
    const totalInventoryRecords = await db.collection('inventory').countDocuments({});
    const zeroStockRecords = await db.collection('inventory').countDocuments({ quantity: { $lte: 0 } });
    const totalLedgerEntries = await db.collection('inventory_ledger').countDocuments({});

    // Last cleanup operation
    const lastOp = await db.collection('cleanup_operations')
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();

    return {
      invoices: {
        total: totalInvoices,
        active: activeInvoices,
        archived: archivedInvoices,
        voided: voidedInvoices,
        potentialCleanup: archivedInvoices + voidedInvoices
      },
      purchases: {
        total: totalPurchases,
        active: activePurchases,
        archived: archivedPurchases,
        voided: voidedPurchases,
        potentialCleanup: archivedPurchases + voidedPurchases
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        archived: archivedProducts,
        potentialCleanup: archivedProducts
      },
      inventory: {
        totalRecords: totalInventoryRecords,
        zeroStock: zeroStockRecords,
        totalLedgerEntries,
        potentialCleanup: zeroStockRecords
      },
      lastOperation: lastOp[0] || null
    };
  },

  /**
   * 2. Query domain records with server-side filtering
   */
  async queryDomainRecords(domain, filters = {}, pagination = {}) {
    const { db } = getContext();
    const page = Math.max(1, parseInt(pagination.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit) || 25));
    const skip = (page - 1) * limit;

    const mongoFilter = {};
    const { startDate, endDate } = resolveDateRange(filters.datePreset, filters.startDate, filters.endDate);

    // Apply common Date Filter
    if (startDate || endDate) {
      const dateField = 'createdAt';
      mongoFilter[dateField] = {};
      if (startDate) mongoFilter[dateField].$gte = startDate;
      if (endDate) mongoFilter[dateField].$lte = endDate;
    }

    // Apply Store Filter
    if (filters.storeId && filters.storeId !== 'all') {
      if (domain === 'products') {
        // Products are catalog-wide
      } else {
        mongoFilter.$or = [
          { locationId: filters.storeId },
          { storeId: filters.storeId },
          { businessId: filters.storeId }
        ];
      }
    }

    // Domain-specific query construction
    if (domain === 'invoices') {
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          mongoFilter.isArchived = { $ne: true };
          mongoFilter.status = { $ne: 'VOIDED' };
        } else if (filters.status === 'archived') {
          mongoFilter.isArchived = true;
        } else if (filters.status === 'voided') {
          mongoFilter.status = 'VOIDED';
        } else {
          mongoFilter.status = filters.status;
        }
      }
      if (filters.customerId) {
        mongoFilter.customerId = filters.customerId;
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        mongoFilter.$or = [
          { invoiceNumber: { $regex: s, $options: 'i' } },
          { id: { $regex: s, $options: 'i' } },
          { customerName: { $regex: s, $options: 'i' } },
          { customerPhone: { $regex: s, $options: 'i' } }
        ];
      }
      if (filters.paymentMode && filters.paymentMode !== 'all') {
        mongoFilter.paymentMode = { $regex: new RegExp(`^${filters.paymentMode}$`, 'i') };
      }

      const total = await db.collection('invoices').countDocuments(mongoFilter);
      const records = await db.collection('invoices')
        .find(mongoFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        records: records.map(inv => ({
          ...inv,
          id: inv.id || inv.invoiceNumber || String(inv._id),
          date: inv.date || inv.createdAt,
          itemCount: Array.isArray(inv.items) ? inv.items.length : 0,
          total: inv.grandTotal !== undefined ? inv.grandTotal : (inv.total || 0)
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }

    if (domain === 'purchases') {
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          mongoFilter.isArchived = { $ne: true };
          mongoFilter.status = { $ne: 'VOIDED' };
        } else if (filters.status === 'archived') {
          mongoFilter.isArchived = true;
        } else if (filters.status === 'voided') {
          mongoFilter.status = 'VOIDED';
        }
      }
      if (filters.supplierId) {
        mongoFilter.supplierId = filters.supplierId;
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        mongoFilter.$or = [
          { id: { $regex: s, $options: 'i' } },
          { purchaseId: { $regex: s, $options: 'i' } },
          { invoiceNumber: { $regex: s, $options: 'i' } },
          { supplierName: { $regex: s, $options: 'i' } }
        ];
      }

      const total = await db.collection('purchases').countDocuments(mongoFilter);
      const records = await db.collection('purchases')
        .find(mongoFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        records: records.map(pur => ({
          ...pur,
          id: pur.id || pur.purchaseId || String(pur._id),
          date: pur.date || pur.createdAt,
          itemCount: Array.isArray(pur.items) ? pur.items.length : 0,
          total: pur.grandTotal !== undefined ? pur.grandTotal : (pur.totalAmount || pur.total || 0)
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }

    if (domain === 'products') {
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          mongoFilter.isArchived = { $ne: true };
        } else if (filters.status === 'archived') {
          mongoFilter.isArchived = true;
        }
      }
      if (filters.category && filters.category !== 'all') {
        mongoFilter.category = filters.category;
      }
      if (filters.brand && filters.brand !== 'all') {
        mongoFilter.brand = filters.brand;
      }
      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        mongoFilter.$or = [
          { name: { $regex: s, $options: 'i' } },
          { sku: { $regex: s, $options: 'i' } },
          { barcode: { $regex: s, $options: 'i' } }
        ];
      }

      const total = await db.collection('products').countDocuments(mongoFilter);
      const records = await db.collection('products')
        .find(mongoFilter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        records: records.map(p => ({
          ...p,
          id: p.id || String(p._id),
          sellingPrice: p.sellingPrice ?? p.price ?? 0,
          purchasePrice: p.purchasePrice ?? p.cost ?? 0
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }

    if (domain === 'inventory') {
      if (filters.stockStatus === 'zero') {
        mongoFilter.quantity = { $lte: 0 };
      } else if (filters.stockStatus === 'positive') {
        mongoFilter.quantity = { $gt: 0 };
      }

      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        mongoFilter.$or = [
          { productId: { $regex: s, $options: 'i' } },
          { productName: { $regex: s, $options: 'i' } }
        ];
      }

      const total = await db.collection('inventory').countDocuments(mongoFilter);
      const records = await db.collection('inventory')
        .find(mongoFilter)
        .sort({ productId: 1, locationId: 1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Enrich with Product Name & SKU if missing
      const productIds = Array.from(new Set(records.map(r => r.productId).filter(Boolean)));
      const productMap = new Map();
      if (productIds.length > 0) {
        const prods = await db.collection('products').find({ id: { $in: productIds } }).toArray();
        prods.forEach(p => productMap.set(p.id, p));
      }

      return {
        records: records.map(inv => {
          const prod = productMap.get(inv.productId);
          return {
            ...inv,
            id: inv.id || (inv._id ? String(inv._id) : `${inv.productId}_${inv.locationId || inv.storeId}`),
            productName: inv.productName || prod?.name || inv.productId,
            sku: inv.sku || prod?.sku || 'N/A',
            currentQuantity: parseFloat(inv.quantity) || 0,
            locationId: inv.locationId || inv.storeId || 'all'
          };
        }),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    }

    throw new Error(`Unsupported cleanup domain: '${domain}'`);
  },

  /**
   * 3. Preview Dry-run Cleanup Operation with Deep Dependency & Safety Analysis
   */
  async previewCleanup(domain, action, targetIds = [], filters = {}, user) {
    const { db } = getContext();
    if (!isSuperAdmin(user)) {
      throw new Error("Super Admin authorization required for cleanup preview");
    }

    // Resolve target IDs: either explicit IDs or all IDs matching filters
    let recordIds = [...targetIds];
    if (filters.selectAllFiltered && recordIds.length === 0) {
      const queryRes = await this.queryDomainRecords(domain, filters, { page: 1, limit: 1000 });
      recordIds = queryRes.records.map(r => r.id);
    }

    if (recordIds.length === 0) {
      return {
        domain,
        action,
        totalSelected: 0,
        eligibleCount: 0,
        blockedCount: 0,
        stockReversalUnits: 0,
        financialImpact: 0,
        reversible: action !== 'purge',
        eligibleRecords: [],
        blockedRecords: [],
        warnings: ["No records matched selection."],
        previewToken: null
      };
    }

    const eligibleRecords = [];
    const blockedRecords = [];
    const warnings = [];
    let stockReversalUnits = 0;
    let financialImpact = 0;

    // --- DOMAIN: INVOICES ---
    if (domain === 'invoices') {
      const invoices = await db.collection('invoices').find({
        $or: [{ id: { $in: recordIds } }, { invoiceNumber: { $in: recordIds } }]
      }).toArray();

      for (const inv of invoices) {
        const invId = inv.invoiceNumber || inv.id;
        const total = inv.grandTotal !== undefined ? inv.grandTotal : (inv.total || 0);

        if (action === 'archive') {
          eligibleRecords.push({
            id: invId,
            label: `Invoice #${invId}`,
            action: 'ARCHIVE',
            details: `Archive posted invoice of ₹${total.toLocaleString('en-IN')}`
          });
        } else if (action === 'void') {
          if (inv.status === 'VOIDED' || inv.isArchived) {
            blockedRecords.push({
              id: invId,
              label: `Invoice #${invId}`,
              reason: 'Invoice is already voided/archived.'
            });
          } else {
            let invItemsQty = 0;
            (inv.items || []).forEach(item => {
              invItemsQty += parseFloat(item.quantity || item.qty || 1);
            });
            stockReversalUnits += invItemsQty;
            financialImpact += total;
            eligibleRecords.push({
              id: invId,
              label: `Invoice #${invId}`,
              action: 'VOID_AND_REVERT_STOCK',
              details: `Void invoice, restore +${invItemsQty} units of stock. Amount: ₹${total.toLocaleString('en-IN')}`
            });
          }
        } else if (action === 'purge') {
          // Hard delete allowed only if invoice is already VOIDED or test record
          if (inv.status !== 'VOIDED' && !inv.isArchived && !inv.isTest) {
            blockedRecords.push({
              id: invId,
              label: `Invoice #${invId}`,
              reason: 'Active posted invoice cannot be purged directly. Void it first to reconcile financial and stock ledgers.'
            });
          } else {
            eligibleRecords.push({
              id: invId,
              label: `Invoice #${invId}`,
              action: 'PURGE',
              details: 'Permanent removal of voided/test invoice.'
            });
          }
        }
      }
    }

    // --- DOMAIN: PURCHASES ---
    else if (domain === 'purchases') {
      const purchases = await db.collection('purchases').find({
        $or: [{ id: { $in: recordIds } }, { purchaseId: { $in: recordIds } }]
      }).toArray();

      for (const pur of purchases) {
        const purId = pur.purchaseId || pur.id;
        const total = pur.grandTotal !== undefined ? pur.grandTotal : (pur.totalAmount || 0);

        if (action === 'archive') {
          eligibleRecords.push({
            id: purId,
            label: `Purchase #${purId}`,
            action: 'ARCHIVE',
            details: `Archive purchase entry from ${pur.supplierName || 'supplier'}`
          });
        } else if (action === 'void') {
          if (pur.status === 'VOIDED' || pur.isArchived) {
            blockedRecords.push({
              id: purId,
              label: `Purchase #${purId}`,
              reason: 'Purchase is already voided/archived.'
            });
          } else {
            // Check if stock added by this purchase can be safely deducted without going negative
            let hasStockShortage = false;
            const locId = pur.locationId || pur.storeId || 'all';

            for (const item of (pur.items || [])) {
              const currentStockDoc = await db.collection('inventory').findOne({
                productId: item.productId,
                $or: [{ locationId: locId }, { storeId: locId }]
              });
              const currentQty = currentStockDoc ? (parseFloat(currentStockDoc.quantity) || 0) : 0;
              const purQty = parseFloat(item.quantity || item.qty || 0);
              if (currentQty < purQty) {
                hasStockShortage = true;
                break;
              }
            }

            if (hasStockShortage) {
              warnings.push(`Purchase #${purId}: Stock received has already been partially sold. Reversing will set current stock to remaining available units.`);
            }

            let purItemsQty = 0;
            (pur.items || []).forEach(item => {
              purItemsQty += parseFloat(item.quantity || item.qty || 0);
            });
            stockReversalUnits -= purItemsQty;
            financialImpact += total;

            eligibleRecords.push({
              id: purId,
              label: `Purchase #${purId}`,
              action: 'VOID_AND_DEDUCT_STOCK',
              details: `Void purchase and reverse -${purItemsQty} units of stock. Amount: ₹${total.toLocaleString('en-IN')}`
            });
          }
        } else if (action === 'purge') {
          if (pur.status !== 'VOIDED' && !pur.isArchived) {
            blockedRecords.push({
              id: purId,
              label: `Purchase #${purId}`,
              reason: 'Active purchase cannot be permanently purged. Void it first to adjust inventory.'
            });
          } else {
            eligibleRecords.push({
              id: purId,
              label: `Purchase #${purId}`,
              action: 'PURGE',
              details: 'Permanent removal of voided purchase record.'
            });
          }
        }
      }
    }

    // --- DOMAIN: PRODUCTS ---
    else if (domain === 'products') {
      const products = await db.collection('products').find({
        $or: [{ id: { $in: recordIds } }, { sku: { $in: recordIds } }]
      }).toArray();

      for (const prod of products) {
        const prodId = prod.id;

        if (action === 'archive') {
          eligibleRecords.push({
            id: prodId,
            label: `${prod.name} (${prod.sku})`,
            action: 'ARCHIVE',
            details: 'Move product master to archived catalog status.'
          });
        } else if (action === 'restore') {
          eligibleRecords.push({
            id: prodId,
            label: `${prod.name} (${prod.sku})`,
            action: 'RESTORE',
            details: 'Restore archived product back to active catalog.'
          });
        } else if (action === 'purge') {
          // Deep dependency check across invoices, purchases, inventory, batches
          const invCount = await db.collection('invoices').countDocuments({
            'items.productId': prodId,
            status: { $ne: 'VOIDED' },
            isArchived: { $ne: true }
          });

          const purCount = await db.collection('purchases').countDocuments({
            'items.productId': prodId,
            status: { $ne: 'VOIDED' },
            isArchived: { $ne: true }
          });

          const invStock = await db.collection('inventory').find({
            productId: prodId,
            quantity: { $gt: 0 }
          }).toArray();

          const batchCount = await db.collection('product_batches').countDocuments({
            productId: prodId,
            remainingQuantity: { $gt: 0 }
          });

          const refReasons = [];
          if (invCount > 0) refReasons.push(`${invCount} active invoice(s)`);
          if (purCount > 0) refReasons.push(`${purCount} active purchase(s)`);
          if (invStock.length > 0) refReasons.push(`Stock present at ${invStock.length} location(s)`);
          if (batchCount > 0) refReasons.push(`${batchCount} active batch(es)`);

          if (refReasons.length > 0) {
            blockedRecords.push({
              id: prodId,
              label: `${prod.name} (${prod.sku})`,
              reason: `Cannot purge: Referenced by ${refReasons.join(', ')}. Archive instead.`
            });
          } else {
            eligibleRecords.push({
              id: prodId,
              label: `${prod.name} (${prod.sku})`,
              action: 'PURGE',
              details: 'Unreferenced product master. Cleanly purge product & barcode mappings.'
            });
          }
        }
      }
    }

    // --- DOMAIN: INVENTORY ---
    else if (domain === 'inventory') {
      const inventoryDocs = await db.collection('inventory').find({
        $or: [{ id: { $in: recordIds } }, { productId: { $in: recordIds } }]
      }).toArray();

      for (const inv of inventoryDocs) {
        const invId = inv.id || String(inv._id) || `${inv.productId}_${inv.locationId}`;
        const currentQty = parseFloat(inv.quantity) || 0;

        if (action === 'reset_test_stock') {
          stockReversalUnits -= currentQty;
          eligibleRecords.push({
            id: invId,
            label: `Stock for Product ${inv.productId} at ${inv.locationId || 'all'}`,
            action: 'RESET_STOCK_TO_ZERO',
            details: `Adjust stock from ${currentQty} to 0 with balancing ledger audit movement.`
          });
        } else if (action === 'remove_orphans') {
          const prodExists = await db.collection('products').findOne({ id: inv.productId });
          if (!prodExists && currentQty <= 0) {
            eligibleRecords.push({
              id: invId,
              label: `Orphan Stock: ${inv.productId}`,
              action: 'REMOVE_ORPHAN',
              details: 'Remove empty inventory document whose product master does not exist.'
            });
          } else if (currentQty > 0) {
            blockedRecords.push({
              id: invId,
              label: `Stock for Product ${inv.productId}`,
              reason: `Stock is not zero (${currentQty} units). Reset stock first before removing.`
            });
          } else {
            blockedRecords.push({
              id: invId,
              label: `Stock for Product ${inv.productId}`,
              reason: 'Product master still exists in catalog.'
            });
          }
        }
      }
    }

    const previewToken = `prev-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    return {
      domain,
      action,
      totalSelected: recordIds.length,
      eligibleCount: eligibleRecords.length,
      blockedCount: blockedRecords.length,
      stockReversalUnits,
      financialImpact,
      reversible: action !== 'purge',
      eligibleRecords,
      blockedRecords,
      warnings,
      previewToken
    };
  },

  /**
   * 4. Execute Administrative Cleanup Operation
   */
  async executeCleanup({ domain, action, targetIds = [], filters = {}, previewToken, confirmCode, user, req }) {
    const { db, io } = getContext();
    if (!isSuperAdmin(user)) {
      throw new Error("Super Admin authorization required for cleanup execution");
    }

    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const actorUsername = user.username || user.name || 'superadmin';

    // Step A: Re-run dry-run preview to guarantee freshness and prevent stale browser selection
    const preview = await this.previewCleanup(domain, action, targetIds, filters, user);
    if (preview.eligibleCount === 0) {
      throw new Error("No eligible records found to execute cleanup on.");
    }

    // High-risk Purge verification
    if (action === 'purge') {
      const expectedConfirm = `PURGE ${preview.eligibleCount} RECORDS`;
      if (!confirmCode || confirmCode.trim().toUpperCase() !== expectedConfirm) {
        throw new Error(`Typed confirmation mismatch. Required: '${expectedConfirm}'`);
      }
    }

    // Step B: Record initial operation state in cleanup_operations collection
    const operationDoc = {
      operationId,
      domain,
      action,
      status: 'EXECUTING',
      actorUserId: user.id || user.username,
      actorUsername,
      previewToken,
      reversible: preview.reversible,
      rolledBack: false,
      totalTargeted: preview.eligibleCount,
      successCount: 0,
      failureCount: 0,
      stockReversalUnits: preview.stockReversalUnits,
      financialImpact: preview.financialImpact,
      affectedRecordIds: preview.eligibleRecords.map(r => r.id),
      recoveryManifest: [],
      errors: [],
      createdAt: now,
      updatedAt: now
    };

    await db.collection('cleanup_operations').insertOne(operationDoc);

    const realtimeService = require('./realtimeService');
    const recoveryManifest = [];
    const processedIds = [];

    try {
      // --- EXECUTE INVOICES ---
      if (domain === 'invoices') {
        for (const item of preview.eligibleRecords) {
          const inv = await db.collection('invoices').findOne({
            $or: [{ id: item.id }, { invoiceNumber: item.id }]
          });
          if (!inv) continue;

          // Snapshot pre-state for manifest
          recoveryManifest.push({
            collection: 'invoices',
            id: inv.id || inv.invoiceNumber,
            preState: JSON.parse(JSON.stringify(inv))
          });

          if (action === 'archive') {
            await db.collection('invoices').updateOne(
              { _id: inv._id },
              { $set: { isArchived: true, archivedAt: now, updatedAt: now } }
            );
            processedIds.push(item.id);
          } else if (action === 'void') {
            const locId = inv.locationId || inv.storeId || 'all';
            if (inv.items && locId) {
              await inventoryService.revertStockBatch(
                inv.items,
                locId,
                'VOID',
                'cleanup_void',
                inv.invoiceNumber || inv.id,
                actorUsername
              );
            }
            await db.collection('invoices').updateOne(
              { _id: inv._id },
              { $set: { status: 'VOIDED', isArchived: true, voidedAt: now, voidedBy: actorUsername, updatedAt: now } }
            );
            processedIds.push(item.id);

            // Broadcast canonical realtime void event
            if (io) {
              const envelope = realtimeService.createEventEnvelope(
                'invoice',
                'voided',
                inv.invoiceNumber || inv.id,
                locId,
                { invoiceId: inv.invoiceNumber || inv.id }
              );
              io.to(`store_${locId}`).emit('invoice_voided', envelope);
            }
          } else if (action === 'purge') {
            await db.collection('invoices').deleteOne({ _id: inv._id });
            processedIds.push(item.id);
          }
        }
      }

      // --- EXECUTE PURCHASES ---
      else if (domain === 'purchases') {
        for (const item of preview.eligibleRecords) {
          const pur = await db.collection('purchases').findOne({
            $or: [{ id: item.id }, { purchaseId: item.id }]
          });
          if (!pur) continue;

          recoveryManifest.push({
            collection: 'purchases',
            id: pur.id || pur.purchaseId,
            preState: JSON.parse(JSON.stringify(pur))
          });

          if (action === 'archive') {
            await db.collection('purchases').updateOne(
              { _id: pur._id },
              { $set: { isArchived: true, archivedAt: now, updatedAt: now } }
            );
            processedIds.push(item.id);
          } else if (action === 'void') {
            const locId = pur.locationId || pur.storeId || 'all';
            if (pur.items && locId) {
              await inventoryService.revertStockBatch(
                pur.items,
                locId,
                'purchase_void',
                'cleanup_purchase_void',
                pur.purchaseId || pur.id,
                actorUsername
              );
            }
            await db.collection('purchases').updateOne(
              { _id: pur._id },
              { $set: { status: 'VOIDED', isArchived: true, voidedAt: now, deletedAt: now, updatedAt: now } }
            );
            processedIds.push(item.id);

            if (io) {
              const envelope = realtimeService.createEventEnvelope(
                'purchase',
                'deleted',
                pur.purchaseId || pur.id,
                locId,
                { purchaseId: pur.purchaseId || pur.id }
              );
              io.to(`store_${locId}`).emit('purchase_deleted', envelope);
            }
          } else if (action === 'purge') {
            await db.collection('purchases').deleteOne({ _id: pur._id });
            processedIds.push(item.id);
          }
        }
      }

      // --- EXECUTE PRODUCTS ---
      else if (domain === 'products') {
        for (const item of preview.eligibleRecords) {
          const prod = await db.collection('products').findOne({
            $or: [{ id: item.id }, { sku: item.id }]
          });
          if (!prod) continue;

          recoveryManifest.push({
            collection: 'products',
            id: prod.id,
            preState: JSON.parse(JSON.stringify(prod))
          });

          if (action === 'archive') {
            await db.collection('products').updateOne(
              { _id: prod._id },
              { $set: { isArchived: true, status: 'archived', updatedAt: now } }
            );
            processedIds.push(item.id);

            if (io) {
              const envelope = realtimeService.createEventEnvelope('product', 'updated', prod.id, null, { product: { ...prod, isArchived: true, status: 'archived' } });
              io.to('sync_global').emit('product_updated', envelope);
            }
          } else if (action === 'restore') {
            await db.collection('products').updateOne(
              { _id: prod._id },
              { $set: { isArchived: false, status: 'active', updatedAt: now } }
            );
            processedIds.push(item.id);

            if (io) {
              const envelope = realtimeService.createEventEnvelope('product', 'updated', prod.id, null, { product: { ...prod, isArchived: false, status: 'active' } });
              io.to('sync_global').emit('product_updated', envelope);
            }
          } else if (action === 'purge') {
            // Delete product doc and unbind secondary barcodes
            await db.collection('products').deleteOne({ _id: prod._id });
            await db.collection('product_barcodes').deleteMany({ productId: prod.id });
            processedIds.push(item.id);

            if (io) {
              const envelope = realtimeService.createEventEnvelope('product', 'deleted', prod.id, null, { productId: prod.id });
              io.to('sync_global').emit('product_deleted', envelope);
            }
          }
        }
      }

      // --- EXECUTE INVENTORY ---
      else if (domain === 'inventory') {
        for (const item of preview.eligibleRecords) {
          const invDoc = await db.collection('inventory').findOne({
            $or: [{ id: item.id }, { productId: item.id }]
          });
          if (!invDoc) continue;

          recoveryManifest.push({
            collection: 'inventory',
            id: invDoc.id || String(invDoc._id),
            preState: JSON.parse(JSON.stringify(invDoc))
          });

          if (action === 'reset_test_stock') {
            const locId = invDoc.locationId || invDoc.storeId || 'all';
            const currentQty = parseFloat(invDoc.quantity) || 0;
            if (currentQty !== 0) {
              await inventoryService.recordMovementAtomic({
                productId: invDoc.productId,
                locationId: locId,
                type: 'CLEANUP_RESET',
                quantityDelta: -currentQty,
                unitCost: 0,
                referenceType: 'maintenance_cleanup',
                referenceId: operationId,
                performedBy: actorUsername,
                notes: `Super Admin maintenance reset stock for ${invDoc.productId} to zero`,
                allowNegative: true
              });
            }
            processedIds.push(item.id);
          } else if (action === 'remove_orphans') {
            await db.collection('inventory').deleteOne({ _id: invDoc._id });
            processedIds.push(item.id);
          }
        }
      }

      // Finalize operation status
      await db.collection('cleanup_operations').updateOne(
        { operationId },
        {
          $set: {
            status: 'COMPLETED',
            successCount: processedIds.length,
            recoveryManifest,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );

      // Write structured audit log
      await auditService.writeAuditLog(
        'DATA_CLEANUP_EXECUTED',
        'maintenance',
        operationId,
        null,
        {
          operationId,
          domain,
          action,
          recordCount: processedIds.length,
          actor: actorUsername,
          reversible: preview.reversible
        },
        req
      );

      return {
        success: true,
        operationId,
        domain,
        action,
        processedCount: processedIds.length,
        reversible: preview.reversible,
        completedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error(`[AdminCleanup] Error executing cleanup operation ${operationId}:`, err);
      await db.collection('cleanup_operations').updateOne(
        { operationId },
        {
          $set: {
            status: 'FAILED',
            error: err.message,
            successCount: processedIds.length,
            recoveryManifest,
            failedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );
      throw err;
    }
  },

  /**
   * 5. Get Operation Status & Details
   */
  async getOperation(operationId) {
    const { db } = getContext();
    const op = await db.collection('cleanup_operations').findOne({ operationId });
    if (!op) throw new Error("Operation not found");
    return op;
  },

  /**
   * 6. List Historical Operations
   */
  async listOperations(limit = 20, skip = 0) {
    const { db } = getContext();
    const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const s = Math.max(0, parseInt(skip) || 0);

    const total = await db.collection('cleanup_operations').countDocuments({});
    const operations = await db.collection('cleanup_operations')
      .find({})
      .sort({ createdAt: -1 })
      .skip(s)
      .limit(l)
      .toArray();

    return {
      operations,
      total,
      limit: l,
      skip: s
    };
  },

  /**
   * 7. Rollback Reversible Operation
   */
  async rollbackOperation(operationId, user, req) {
    const { db, io } = getContext();
    if (!isSuperAdmin(user)) {
      throw new Error("Super Admin authorization required for operation rollback");
    }

    const op = await db.collection('cleanup_operations').findOne({ operationId });
    if (!op) throw new Error("Operation not found");
    if (!op.reversible) throw new Error("This operation is non-reversible (hard purge).");
    if (op.rolledBack) throw new Error("This operation has already been rolled back.");

    const now = new Date().toISOString();
    const realtimeService = require('./realtimeService');
    let restoredCount = 0;

    for (const item of (op.recoveryManifest || [])) {
      const col = item.collection;
      const pre = item.preState;

      if (col === 'invoices') {
        if (op.action === 'archive') {
          await db.collection('invoices').updateOne(
            { $or: [{ id: item.id }, { invoiceNumber: item.id }] },
            { $set: { isArchived: pre.isArchived || false, updatedAt: now } }
          );
          restoredCount++;
        }
      } else if (col === 'purchases') {
        if (op.action === 'archive') {
          await db.collection('purchases').updateOne(
            { $or: [{ id: item.id }, { purchaseId: item.id }] },
            { $set: { isArchived: pre.isArchived || false, updatedAt: now } }
          );
          restoredCount++;
        }
      } else if (col === 'products') {
        if (op.action === 'archive') {
          await db.collection('products').updateOne(
            { id: item.id },
            { $set: { isArchived: pre.isArchived || false, status: pre.status || 'active', updatedAt: now } }
          );
          restoredCount++;
          if (io) {
            const envelope = realtimeService.createEventEnvelope('product', 'updated', item.id, null, { product: pre });
            io.to('sync_global').emit('product_updated', envelope);
          }
        }
      }
    }

    await db.collection('cleanup_operations').updateOne(
      { operationId },
      {
        $set: {
          rolledBack: true,
          rolledBackAt: now,
          rolledBackBy: user.username || user.name || 'superadmin',
          updatedAt: now
        }
      }
    );

    await auditService.writeAuditLog(
      'DATA_CLEANUP_ROLLBACK',
      'maintenance',
      operationId,
      null,
      { operationId, restoredCount, domain: op.domain, action: op.action },
      req
    );

    return {
      success: true,
      operationId,
      restoredCount,
      rolledBackAt: now
    };
  }
};

module.exports = adminCleanupService;
