const crypto = require('crypto');
const { getContext } = require('../modules/context');
const auditService = require('./auditService');
const inventoryService = require('./inventoryService');
const authzService = require('./authzService');

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

/**
 * Computes deterministic cryptographic state fingerprint for staleness detection
 */
function computeStateFingerprint(records = []) {
  const normalized = records.map(r => ({
    id: r.id || r.invoiceNumber || r.purchaseId || (r._id ? String(r._id) : ''),
    status: r.status || '',
    isArchived: !!r.isArchived,
    quantity: r.quantity !== undefined ? parseFloat(r.quantity) : null,
    remainingQuantity: r.remainingQuantity !== undefined ? parseFloat(r.remainingQuantity) : null,
    updatedAt: r.updatedAt || r.createdAt || '',
    itemCount: Array.isArray(r.items) ? r.items.length : 0
  })).sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function getInventoryRecordId(inv = {}) {
  return inv.id || `${inv.productId || 'missing'}__${inv.locationId || inv.storeId || 'all'}`;
}

function getInventoryLocationId(inv = {}) {
  return inv.locationId || inv.storeId || 'all';
}

function getInventoryQuantity(inv = {}) {
  return parseFloat(inv.quantity) || 0;
}

function isActiveDocument(doc = {}) {
  return doc.isArchived !== true && doc.status !== 'VOIDED' && doc.status !== 'voided' && doc.status !== 'archived';
}

async function findInventoryRecordsByIds(db, recordIds = []) {
  const targetIds = new Set(recordIds);
  if (targetIds.size === 0) return [];

  const candidateProductIds = Array.from(targetIds)
    .map(id => String(id).includes('__') ? String(id).split('__')[0] : id);

  const mongoFilter = candidateProductIds.length > 0
    ? { $or: [{ id: { $in: Array.from(targetIds) } }, { productId: { $in: candidateProductIds } }] }
    : { id: { $in: Array.from(targetIds) } };

  const candidates = await db.collection('inventory').find(mongoFilter).toArray();
  return candidates.filter(inv => targetIds.has(getInventoryRecordId(inv)) || targetIds.has(inv.id) || targetIds.has(inv.productId));
}

async function getOrphanInventoryDependencyReport(db, inv) {
  const productId = inv.productId;
  const locationId = getInventoryLocationId(inv);

  const batches = await db.collection('product_batches').find({
    productId,
    status: { $ne: 'archived' },
    remainingQuantity: { $gt: 0 }
  }).toArray();

  const invoices = await db.collection('invoices').find({
    'items.productId': productId,
    $or: [{ locationId }, { storeId: locationId }, { locationId: { $exists: false } }]
  }).toArray();

  const purchases = await db.collection('purchases').find({
    'items.productId': productId,
    $or: [{ locationId }, { storeId: locationId }, { locationId: { $exists: false } }]
  }).toArray();

  const ledgerRefs = await db.collection('inventory_ledger').find({ productId }).toArray();
  const activeInvoices = invoices.filter(isActiveDocument);
  const activePurchases = purchases.filter(isActiveDocument);

  return {
    batches,
    activeInvoices,
    activePurchases,
    ledgerRefs
  };
}

const adminCleanupService = {
  /**
   * 1. Get high-level domain summary stats for Dashboard cards
   */
  async getDomainSummary(user) {
    if (user && !authzService.isSuperAdmin(user)) {
      const err = new Error("Forbidden: Super Admin authorization required.");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

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
    const inventoryRecords = await db.collection('inventory').find({}).toArray();
    const inventoryProductIds = Array.from(new Set(inventoryRecords.map(inv => inv.productId).filter(Boolean)));
    const existingProducts = inventoryProductIds.length > 0
      ? await db.collection('products').find({ id: { $in: inventoryProductIds } }).toArray()
      : [];
    const existingProductIds = new Set(existingProducts.map(p => p.id));
    const orphanInventory = inventoryRecords.filter(inv => inv.productId && !existingProductIds.has(inv.productId));
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
        orphanRecords: orphanInventory.length,
        orphanQuantity: orphanInventory.reduce((sum, inv) => sum + getInventoryQuantity(inv), 0),
        potentialCleanup: orphanInventory.length
      },
      lastOperation: lastOp[0] || null
    };
  },

  /**
   * 2. Query domain records with server-side filtering
   */
  async queryDomainRecords(domain, filters = {}, pagination = {}, user) {
    if (user && !authzService.isSuperAdmin(user)) {
      const err = new Error("Forbidden: Super Admin authorization required.");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

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

      let records = await db.collection('inventory')
        .find(mongoFilter)
        .sort({ productId: 1, locationId: 1 })
        .toArray();

      // Enrich with Product Name & SKU if missing
      const productIds = Array.from(new Set(records.map(r => r.productId).filter(Boolean)));
      const productMap = new Map();
      if (productIds.length > 0) {
        const prods = await db.collection('products').find({ id: { $in: productIds } }).toArray();
        prods.forEach(p => productMap.set(p.id, p));
      }

      records = records.filter(inv => filters.stockStatus !== 'orphan' || !productMap.has(inv.productId));
      const total = records.length;
      const pagedRecords = records.slice(skip, skip + limit);

      return {
        records: pagedRecords.map(inv => {
          const prod = productMap.get(inv.productId);
          const isOrphan = !prod;
          return {
            ...inv,
            id: getInventoryRecordId(inv),
            productName: prod?.name || (isOrphan ? 'Product Master Missing' : inv.productName || inv.productId),
            sku: prod?.sku || (isOrphan ? '' : inv.sku || 'N/A'),
            isOrphan,
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
   * 3. Preview Dry-run Cleanup Operation with Deep Dependency & Safety Analysis & Fingerprinting
   */
  async previewCleanup(domain, action, targetIds = [], filters = {}, user) {
    if (!authzService.isSuperAdmin(user)) {
      const err = new Error("Super Admin authorization required for cleanup preview");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

    const { db } = getContext();

    // Resolve target IDs: either explicit IDs or all IDs matching filters
    let recordIds = [...targetIds];
    if (filters.selectAllFiltered && recordIds.length === 0) {
      const queryRes = await this.queryDomainRecords(domain, filters, { page: 1, limit: 1000 }, user);
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
        previewToken: null,
        stateFingerprint: null
      };
    }

    const eligibleRecords = [];
    const blockedRecords = [];
    const warnings = [];
    let stockReversalUnits = 0;
    let financialImpact = 0;
    let fetchedRawRecords = [];
    let orphanInventoryImpact = null;

    // --- DOMAIN: INVOICES ---
    if (domain === 'invoices') {
      fetchedRawRecords = await db.collection('invoices').find({
        $or: [{ id: { $in: recordIds } }, { invoiceNumber: { $in: recordIds } }]
      }).toArray();

      for (const inv of fetchedRawRecords) {
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
      fetchedRawRecords = await db.collection('purchases').find({
        $or: [{ id: { $in: recordIds } }, { purchaseId: { $in: recordIds } }]
      }).toArray();

      for (const pur of fetchedRawRecords) {
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
      fetchedRawRecords = await db.collection('products').find({
        $or: [{ id: { $in: recordIds } }, { sku: { $in: recordIds } }]
      }).toArray();

      for (const prod of fetchedRawRecords) {
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
      fetchedRawRecords = await findInventoryRecordsByIds(db, recordIds);
      const locationTotals = new Map();
      const batchReferences = [];
      const ledgerReferences = [];

      for (const inv of fetchedRawRecords) {
        const invId = getInventoryRecordId(inv);
        const currentQty = parseFloat(inv.quantity) || 0;
        const locId = getInventoryLocationId(inv);

        if (action === 'reset_test_stock') {
          stockReversalUnits -= currentQty;
          eligibleRecords.push({
            id: invId,
            label: `Stock for Product ${inv.productId} at ${locId}`,
            action: 'RESET_STOCK_TO_ZERO',
            details: `Adjust stock from ${currentQty} to 0 with balancing ledger audit movement.`
          });
        } else if (action === 'remove_orphans') {
          const prodExists = await db.collection('products').findOne({ id: inv.productId });
          const dependencyReport = await getOrphanInventoryDependencyReport(db, inv);
          const blockReasons = [];

          if (prodExists) {
            blockReasons.push('Product Master now exists in catalog.');
          }
          if (dependencyReport.batches.length > 0) {
            blockReasons.push(`${dependencyReport.batches.length} active batch reference(s)`);
          }
          if (dependencyReport.activeInvoices.length > 0) {
            blockReasons.push(`${dependencyReport.activeInvoices.length} active invoice reference(s)`);
          }
          if (dependencyReport.activePurchases.length > 0) {
            blockReasons.push(`${dependencyReport.activePurchases.length} active purchase reference(s)`);
          }

          dependencyReport.batches.forEach(batch => {
            batchReferences.push({
              inventoryId: invId,
              productId: inv.productId,
              batchId: batch.id || (batch._id ? String(batch._id) : ''),
              lotNumber: batch.lotNumber || 'N/A',
              remainingQuantity: parseFloat(batch.remainingQuantity) || 0,
              locationId: batch.locationId || batch.storeId || locId
            });
          });
          dependencyReport.ledgerRefs.forEach(ref => {
            ledgerReferences.push({
              inventoryId: invId,
              productId: inv.productId,
              movementId: ref.movementId || ref.id || (ref._id ? String(ref._id) : ''),
              referenceType: ref.referenceType || '',
              referenceId: ref.referenceId || '',
              quantity: parseFloat(ref.quantity) || 0,
              locationId: ref.locationId || ref.storeId || locId
            });
          });

          if (blockReasons.length === 0) {
            stockReversalUnits += currentQty;
            locationTotals.set(locId, (locationTotals.get(locId) || 0) + currentQty);
            eligibleRecords.push({
              id: invId,
              label: `ORPHAN INVENTORY at ${locId}`,
              action: 'ORPHAN_INVENTORY_CLEANUP',
              details: `${currentQty} units will be removed because Product Master is missing.`
            });
          } else {
            blockedRecords.push({
              id: invId,
              label: `Inventory at ${locId}`,
              reason: blockReasons.join('; ')
            });
          }
        }
      }

      if (action === 'remove_orphans') {
        orphanInventoryImpact = {
          recordCount: eligibleRecords.length,
          totalQuantity: stockReversalUnits,
          locations: Array.from(locationTotals.entries()).map(([locationId, quantity]) => ({ locationId, quantity })),
          batchReferences,
          ledgerReferences
        };
        warnings.push(`${eligibleRecords.length} orphan records`);
        warnings.push(`${stockReversalUnits} total units`);
        Array.from(locationTotals.entries()).forEach(([locationId, quantity]) => {
          warnings.push(`${locationId}: ${quantity}`);
        });
        if (batchReferences.length > 0) warnings.push(`${batchReferences.length} active batch reference(s) blocked`);
        if (ledgerReferences.length > 0) warnings.push(`${ledgerReferences.length} inventory ledger reference(s) present`);
      }
    }

    const stateFingerprint = computeStateFingerprint(fetchedRawRecords);
    const previewToken = `prev-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Store preview record for staleness and double-execution guards
    await db.collection('cleanup_previews').insertOne({
      previewToken,
      domain,
      action,
      recordIds,
      stateFingerprint,
      eligibleCount: eligibleRecords.length,
      blockedCount: blockedRecords.length,
      stockReversalUnits,
      financialImpact,
      orphanInventoryImpact,
      reversible: action !== 'purge',
      executed: false,
      createdAt: new Date().toISOString()
    });

    return {
      domain,
      action,
      totalSelected: recordIds.length,
      eligibleCount: eligibleRecords.length,
      blockedCount: blockedRecords.length,
      stockReversalUnits,
      financialImpact,
      orphanInventoryImpact,
      reversible: action !== 'purge',
      eligibleRecords,
      blockedRecords,
      warnings,
      previewToken,
      stateFingerprint
    };
  },

  /**
   * 4. Execute Administrative Cleanup Operation with Stale-Preview and Double-Execution Guard
   */
  async executeCleanup({ domain, action, targetIds = [], filters = {}, previewToken, confirmCode, user, req }) {
    if (!authzService.isSuperAdmin(user)) {
      const err = new Error("Super Admin authorization required for cleanup execution");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

    const { db, io } = getContext();

    if (!previewToken) {
      const err = new Error("Preview token is required before executing cleanup.");
      err.code = "PREVIEW_REQUIRED";
      throw err;
    }

    // Step A: Validate Preview Token & Double-Execution Guard
    const previewDoc = await db.collection('cleanup_previews').findOne({ previewToken });
    if (!previewDoc) {
      const err = new Error("Preview token is invalid or expired. Please generate a fresh preview.");
      err.code = "INVALID_PREVIEW";
      throw err;
    }

    if (previewDoc.executed) {
      const err = new Error("This cleanup operation has already been executed. Duplicate execution rejected.");
      err.code = "DUPLICATE_EXECUTION";
      throw err;
    }

    // Step B: Stale Preview Check — inspect current state of targeted records
    let currentRawRecords = [];
    const targetQueryIds = previewDoc.recordIds || targetIds;

    if (domain === 'invoices') {
      currentRawRecords = await db.collection('invoices').find({
        $or: [{ id: { $in: targetQueryIds } }, { invoiceNumber: { $in: targetQueryIds } }]
      }).toArray();
    } else if (domain === 'purchases') {
      currentRawRecords = await db.collection('purchases').find({
        $or: [{ id: { $in: targetQueryIds } }, { purchaseId: { $in: targetQueryIds } }]
      }).toArray();
    } else if (domain === 'products') {
      currentRawRecords = await db.collection('products').find({
        $or: [{ id: { $in: targetQueryIds } }, { sku: { $in: targetQueryIds } }]
      }).toArray();
    } else if (domain === 'inventory') {
      currentRawRecords = await findInventoryRecordsByIds(db, targetQueryIds);
    }

    const currentStateFingerprint = computeStateFingerprint(currentRawRecords);
    if (currentStateFingerprint !== previewDoc.stateFingerprint) {
      const err = new Error("Target records have changed since preview was generated. STALE PREVIEW / RE-PREVIEW REQUIRED.");
      err.code = "STALE_PREVIEW";
      throw err;
    }

    // Mark preview token as executed atomically
    await db.collection('cleanup_previews').updateOne(
      { previewToken },
      { $set: { executed: true, executedAt: new Date().toISOString(), executedBy: user.username || user.name } }
    );

    const operationId = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const actorUsername = user.username || user.name || 'superadmin';

    // Step C: Run preview evaluation to get exact current eligible records
    const preview = await this.previewCleanup(domain, action, targetQueryIds, filters, user);
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

    // Step D: Record initial operation state in cleanup_operations collection
    const operationDoc = {
      operationId,
      domain,
      action,
      operationType: domain === 'inventory' && action === 'remove_orphans' ? 'ORPHAN_INVENTORY_CLEANUP' : action.toUpperCase(),
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
      orphanInventoryImpact: preview.orphanInventoryImpact || null,
      affectedRecordIds: preview.eligibleRecords.map(r => r.id),
      affectedProductIds: [],
      affectedLocations: [],
      beforeSnapshot: [],
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
          const [invDoc] = await findInventoryRecordsByIds(db, [item.id]);
          if (!invDoc) continue;

          recoveryManifest.push({
            collection: 'inventory',
            id: getInventoryRecordId(invDoc),
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
            const productExists = await db.collection('products').findOne({ id: invDoc.productId });
            if (productExists) {
              const err = new Error(`Product Master now exists for '${invDoc.productId}'. Orphan cleanup blocked.`);
              err.code = 'STALE_PREVIEW';
              throw err;
            }

            const dependencyReport = await getOrphanInventoryDependencyReport(db, invDoc);
            if (
              dependencyReport.batches.length > 0 ||
              dependencyReport.activeInvoices.length > 0 ||
              dependencyReport.activePurchases.length > 0
            ) {
              const err = new Error(`Inventory record '${getInventoryRecordId(invDoc)}' now has active dependencies. Orphan cleanup blocked.`);
              err.code = 'DEPENDENCY_BLOCKED';
              err.details = {
                batches: dependencyReport.batches.length,
                activeInvoices: dependencyReport.activeInvoices.length,
                activePurchases: dependencyReport.activePurchases.length
              };
              throw err;
            }

            await db.collection('inventory').deleteOne({ _id: invDoc._id });
            processedIds.push(item.id);

            const locId = getInventoryLocationId(invDoc);
            if (io) {
              const envelope = realtimeService.createEventEnvelope(
                'inventory',
                'deleted',
                invDoc.productId,
                locId,
                {
                  productId: invDoc.productId,
                  locationId: locId,
                  storeId: locId,
                  reason: 'ORPHAN_INVENTORY_CLEANUP'
                },
                invDoc.version || 1
              );
              io.to(`store_${locId}`).emit('inventory.updated', envelope);
              io.to('sync_global').emit('inventory.updated', envelope);
            }
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
            affectedProductIds: Array.from(new Set(recoveryManifest.map(item => item.preState?.productId).filter(Boolean))),
            affectedLocations: Array.from(new Set(recoveryManifest.map(item => getInventoryLocationId(item.preState)).filter(Boolean))),
            beforeSnapshot: recoveryManifest.map(item => item.preState),
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );

      // Write structured audit log
      await auditService.writeAuditLog(
        operationDoc.operationType === 'ORPHAN_INVENTORY_CLEANUP' ? 'ORPHAN_INVENTORY_CLEANUP' : 'DATA_CLEANUP_EXECUTED',
        'maintenance',
        operationId,
        null,
        {
          operationId,
          domain,
          action,
          operationType: operationDoc.operationType,
          recordCount: processedIds.length,
          actor: actorUsername,
          reversible: preview.reversible,
          recordIds: processedIds,
          productIds: Array.from(new Set(recoveryManifest.map(item => item.preState?.productId).filter(Boolean))),
          locations: Array.from(new Set(recoveryManifest.map(item => getInventoryLocationId(item.preState)).filter(Boolean))),
          quantities: recoveryManifest.map(item => ({
            id: item.id,
            productId: item.preState?.productId,
            locationId: getInventoryLocationId(item.preState),
            quantity: getInventoryQuantity(item.preState)
          })),
          beforeSnapshot: recoveryManifest.map(item => item.preState)
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
  async getOperation(operationId, user) {
    if (user && !authzService.isSuperAdmin(user)) {
      const err = new Error("Forbidden: Super Admin authorization required.");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

    const { db } = getContext();
    const op = await db.collection('cleanup_operations').findOne({ operationId });
    if (!op) throw new Error("Operation not found");
    return op;
  },

  /**
   * 6. List Historical Operations
   */
  async listOperations(limit = 20, skip = 0, user) {
    if (user && !authzService.isSuperAdmin(user)) {
      const err = new Error("Forbidden: Super Admin authorization required.");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

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
    if (!authzService.isSuperAdmin(user)) {
      const err = new Error("Super Admin authorization required for operation rollback");
      err.code = "FORBIDDEN";
      err.statusCode = 403;
      throw err;
    }

    const { db, io } = getContext();
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
