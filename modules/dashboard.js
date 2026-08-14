const express = require('express');
const { getContext, verifyJWT } = require('./context');
const { requirePermission, isSuperAdmin } = require('../services/authzService');

const router = express.Router();

/**
 * GET /api/v1/dashboard/metrics - Server-side Aggregated KPIs & Analytics (Stage 12 P0)
 * Eliminates multi-megabyte raw array client downloads and computes financial metrics,
 * stock valuations, and watchlists directly in MongoDB.
 */
router.get('/metrics', verifyJWT, requirePermission('dashboard.view'), async (req, res) => {
  const { db } = getContext();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  try {
    let activeStoreId = req.query.storeId || req.query.locationId || req.query.businessId;

    // Enforce store scope for non-super admins
    if (!isSuperAdmin(req.user) && req.user.assignedStoreId && req.user.assignedStoreId !== 'all') {
      activeStoreId = req.user.assignedStoreId;
    }

    const invoiceMatch = {
      isArchived: { $ne: true },
      status: { $in: ['COMPLETED', 'PAID', 'paid', 'completed'] }
    };

    if (activeStoreId && activeStoreId !== 'all' && activeStoreId !== 'default') {
      invoiceMatch.$or = [
        { locationId: activeStoreId },
        { storeId: activeStoreId },
        { businessId: activeStoreId }
      ];
    }

    // 1. Aggregate Invoice Sales & Financials
    const invoiceAgg = await db.collection('invoices').aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $ifNull: ["$grandTotal", { $ifNull: ["$grandtotal", 0] }] } },
          subtotal: { $sum: { $ifNull: ["$subtotal", 0] } },
          tax: { $sum: { $ifNull: ["$tax", 0] } },
          discount: { $sum: { $ifNull: ["$discount", 0] } },
          invoiceCount: { $sum: 1 },
          totalCost: {
            $sum: {
              $reduce: {
                input: { $ifNull: ["$items", []] },
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $multiply: [
                        { $ifNull: ["$$this.quantity", 0] },
                        { $ifNull: ["$$this.cost", { $ifNull: ["$$this.purchasePrice", 0] }] }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ]).toArray();

    const salesStats = invoiceAgg[0] || {
      totalSales: 0,
      subtotal: 0,
      tax: 0,
      discount: 0,
      invoiceCount: 0,
      totalCost: 0
    };

    const totalSales = Math.round(salesStats.totalSales * 100) / 100;
    const netProfit = Math.max(0, Math.round((totalSales - salesStats.totalCost) * 100) / 100);

    // 2. Fetch Products & Compute Inventory Valuations
    const productFilter = { isArchived: { $ne: true } };
    const allProducts = await db.collection('products').find(productFilter).toArray();

    let totalProducts = allProducts.length;
    let ownProducts = 0;
    let externalProducts = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let stockAssetValuationCost = 0;
    let stockAssetValuationRetail = 0;
    let expiryWarningsCount = 0;
    const categoriesSet = new Set();
    const brandsSet = new Set();
    const suppliersSet = new Set();
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const enrichedProducts = allProducts.map(p => {
      const stock = parseFloat(p.stock) || 0;
      const cost = parseFloat(p.cost || p.purchasePrice) || 0;
      const price = parseFloat(p.price || p.sellingPrice) || 0;
      const reorder = parseFloat(p.reorder || p.reorderLevel) || 10;

      if (p.type === 'own' || (p.sku && p.sku.startsWith("AIA"))) ownProducts++;
      else externalProducts++;

      if (stock <= 0) outOfStockCount++;
      else if (stock <= reorder) lowStockCount++;

      if (p.category) categoriesSet.add(p.category);
      if (p.brand) brandsSet.add(p.brand);
      if (p.supplier) suppliersSet.add(p.supplier);

      stockAssetValuationCost += (stock * cost);
      stockAssetValuationRetail += (stock * price);

      if (p.doe) {
        const doeDate = new Date(p.doe);
        if (!isNaN(doeDate.getTime()) && doeDate <= thirtyDaysAhead) {
          expiryWarningsCount++;
        }
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        sku: p.sku,
        stock,
        reorder,
        cost,
        price,
        unit: p.unit || 'unit',
        image: p.image || null
      };
    });

    // Top 5 Low Stock Items
    const lowStockWatchlist = enrichedProducts
      .filter(p => p.stock <= p.reorder)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    // 3. Purchases Aggregation
    const purchaseMatch = { isArchived: { $ne: true }, status: { $ne: 'VOIDED' } };
    if (activeStoreId && activeStoreId !== 'all' && activeStoreId !== 'default') {
      purchaseMatch.$or = [{ locationId: activeStoreId }, { storeId: activeStoreId }];
    }

    const purchaseAgg = await db.collection('purchases').aggregate([
      { $match: purchaseMatch },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: { $ifNull: ["$grandTotal", { $ifNull: ["$total", 0] }] } },
          purchaseCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const purchaseStats = purchaseAgg[0] || { totalPurchases: 0, purchaseCount: 0 };

    // 4. Franchise Earnings Aggregation
    let franchiseEarnings = 0;
    try {
      const franAgg = await db.collection('franchise_supply_orders').aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$grandTotal", { $ifNull: ["$total", 0] }] } } } }
      ]).toArray();
      franchiseEarnings = franAgg[0] ? Math.round(franAgg[0].total * 100) / 100 : 0;
    } catch (e) {}

    // 5. Recent 5 Invoices & Purchases for Dashboard Tables
    const recentInvoices = await db.collection('invoices')
      .find(invoiceMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ items: 0 })
      .toArray();

    const recentPurchases = await db.collection('purchases')
      .find(purchaseMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ items: 0 })
      .toArray();

    res.json({
      success: true,
      metrics: {
        totalSales,
        netProfit,
        totalPurchases: Math.round(purchaseStats.totalPurchases * 100) / 100,
        franchiseEarnings,
        stockAssetValuationCost: Math.round(stockAssetValuationCost * 100) / 100,
        stockAssetValuationRetail: Math.round(stockAssetValuationRetail * 100) / 100,
        totalProducts,
        ownProducts,
        externalProducts,
        lowStockCount,
        outOfStockCount,
        categoriesCount: categoriesSet.size,
        brandsCount: brandsSet.size || 1,
        suppliersCount: suppliersSet.size,
        expiryWarningsCount,
        invoiceCount: salesStats.invoiceCount,
        purchaseCount: purchaseStats.purchaseCount
      },
      lowStockWatchlist,
      recentInvoices,
      recentPurchases,
      activeStoreId: activeStoreId || 'all'
    });
  } catch (err) {
    console.error("[Dashboard] Metrics aggregation error:", err);
    res.status(500).json({
      success: false,
      error: { code: "METRICS_AGGREGATION_FAILED", message: err.message || "Failed to aggregate dashboard metrics" },
      requestId
    });
  }
});

module.exports = router;
