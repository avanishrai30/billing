const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Product name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  barcode: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  supplier: z.string().trim().optional(),
  costPrice: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  cost: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  sellingPrice: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  price: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  stock: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  reorder: z.number().or(z.string().transform(v => parseFloat(v) || 0)).optional(),
  maxStock: z.number().or(z.string().transform(v => parseFloat(v) || 100)).optional(),
  gst: z.number().or(z.string().transform(v => parseInt(v) || 0)).optional(),
  unit: z.string().trim().optional(),
  weightUnit: z.string().trim().optional(),
  sellingMode: z.string().trim().optional(),
  type: z.string().trim().optional(),
  dom: z.string().trim().optional(),
  doe: z.string().trim().optional(),
  emoji: z.string().trim().optional(),
  status: z.string().trim().optional(),
  imageId: z.string().trim().optional(),
  image: z.string().trim().optional(),
  images: z.array(z.string()).optional(),
  store: z.string().trim().optional(),
  barcodes: z.array(z.object({
    barcode: z.string().trim(),
    variantName: z.string().trim()
  })).optional()
});

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(1).optional(),
  role: z.string().trim().min(1, "Role is required"),
  permissions: z.array(z.string()).optional(),
  assignedStoreId: z.string().trim().optional(),
  assignedStores: z.array(z.string()).optional(),
  status: z.string().trim().optional()
});

let context = {
  db: null,
  io: null,
  JWT_SECRET: null,
  UPLOAD_ROOT: null,
  UPLOAD_SUBDIRS: null,
  activePresences: null
};

function setupContext(appDb, appIo, appSecret, appUploadRoot, appUploadSubdirs, appPresences) {
  context.db = appDb;
  context.io = appIo;
  context.JWT_SECRET = appSecret;
  context.UPLOAD_ROOT = appUploadRoot;
  context.UPLOAD_SUBDIRS = appUploadSubdirs;
  context.activePresences = appPresences;
}

function getContext() {
  return context;
}

// Middlewares & helpers
function verifyJWT(req, res, next) {
  let token = req.query.token;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: "Missing authorization token" });

  jwt.verify(token, context.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Request validation failed",
        errors: result.error.errors
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

async function writeAuditLog(eventType, entity, entityId, before, after, req) {
  try {
    const db = context.db;
    let userStr = 'System';
    let roleStr = 'SYSTEM';
    let businessId = 'all';
    let businessName = 'All Outlets';
    let viewName = 'system';
    
    if (req && req.user) {
      const dbUser = await db.collection('users').findOne({ username: req.user.username });
      if (dbUser) {
        userStr = `${dbUser.name} (@${dbUser.username})`;
        roleStr = (dbUser.role || 'employee').toUpperCase();
        
        const bizId = dbUser.assignedStoreId || 'all';
        if (bizId !== 'all') {
          const biz = await db.collection('businesses').findOne({ id: bizId });
          if (biz) {
            businessId = biz.id;
            businessName = biz.name;
          }
        }
      }
    }

    const actionMapping = {
      'auth_login': { action: 'auth', view: 'login' },
      'auth_logout': { action: 'auth', view: 'login' },
      'product_created': { action: 'create', view: 'inventory' },
      'product_updated': { action: 'update', view: 'inventory' },
      'product_archived': { action: 'delete', view: 'inventory' },
      'purchase_created': { action: 'create', view: 'purchase' },
      'inventory_updated': { action: 'update', view: 'inventory' },
      'invoice_created': { action: 'billing', view: 'billing' },
      'invoice_voided': { action: 'delete', view: 'invoices' },
      'franchise_created': { action: 'create', view: 'businesses' },
      'franchise_deleted': { action: 'delete', view: 'businesses' },
      'franchise_order_created': { action: 'create', view: 'purchase' },
      'rbac_updated': { action: 'update', view: 'permissions' },
      'user_updated': { action: 'update', view: 'permissions' },
      'user_created': { action: 'create', view: 'permissions' }
    };

    const map = actionMapping[eventType] || { action: 'update', view: 'system' };
    const actionType = map.action;
    viewName = map.view;

    let detailsString = eventType;
    if (eventType === 'auth_login') {
      detailsString = `User session authenticated successfully`;
    } else if (eventType === 'auth_logout') {
      detailsString = `User session terminated successfully`;
    } else if (eventType === 'product_created') {
      detailsString = `Added product '${after.name}' (SKU: ${after.sku}, Price: ₹${after.price})`;
    } else if (eventType === 'product_updated') {
      detailsString = `Updated product '${after.name}' details (SKU: ${after.sku}, Price: ₹${after.price})`;
    } else if (eventType === 'product_archived') {
      detailsString = `Archived product ID: ${entityId}`;
    } else if (eventType === 'purchase_created') {
      detailsString = `Recorded supplier purchase entry (Supplier: ${after.supplier || 'N/A'}, Invoice: #${after.invoiceNumber || 'N/A'}, Total: ₹${after.grandTotal || 0})`;
    } else if (eventType === 'inventory_updated') {
      detailsString = `Adjusted inventory stock levels for product ID ${entityId} to ${after.quantity} units`;
    } else if (eventType === 'invoice_created') {
      detailsString = `Completed POS transaction for customer '${after.customerName || 'Walk-In'}'. Created Invoice #${entityId} (Total: ₹${after.grandTotal || 0})`;
    } else if (eventType === 'invoice_voided') {
      detailsString = `Voided Invoice #${entityId} and reverted items back to warehouse stock`;
    } else if (eventType === 'franchise_created') {
      detailsString = `Saved franchise CRM profile: ${after.name}`;
    } else if (eventType === 'franchise_deleted') {
      detailsString = `Removed franchise profile (ID: ${entityId})`;
    } else if (eventType === 'franchise_order_created') {
      detailsString = `Dispatched supply stock order to Franchise Outlet (ID: #${entityId}, Value: ₹${after.grandTotal || 0})`;
    } else if (eventType === 'rbac_updated') {
      detailsString = `Updated global role-permissions matrix permissions configurations`;
    } else if (eventType === 'user_updated') {
      detailsString = `Modified account profile details for user: ${entityId}`;
    } else if (eventType === 'user_created') {
      detailsString = `Created user account for: ${after.username} (Designation: ${after.role})`;
    }

    await db.collection('audit_logs').insertOne({
      eventType,
      entity,
      entityId,
      before: before || {},
      after: after || {},
      performedBy: (req && req.user) ? req.user.username : 'system',
      user: userStr,
      role: roleStr,
      action: actionType,
      view: viewName,
      details: detailsString,
      businessId,
      businessName,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("[Audit Log] Failed to write structured audit log:", err);
  }
}

// ERP V3: Immutable Ledger Inventory Movement helper
async function recordInventoryMovement(productId, locationId, type, quantity, referenceType, referenceId, performedBy) {
  const db = context.db;
  const currentInv = await db.collection('inventory').findOne({ productId, storeId: locationId });
  const beforeQuantity = currentInv ? (parseFloat(currentInv.quantity) || 0) : 0;
  const afterQuantity = beforeQuantity + parseFloat(quantity);

  // Update real-time inventory count
  await db.collection('inventory').updateOne(
    { productId, storeId: locationId },
    { 
      $set: { quantity: afterQuantity, updatedAt: new Date().toISOString() },
      $setOnInsert: { productId, storeId: locationId, reservedQuantity: 0, reorderLevel: 10 }
    },
    { upsert: true }
  );

  // Insert ledger record
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
    performedBy,
    createdAt: new Date().toISOString()
  });

  // Emit Socket update to the store room
  context.io.to(`store_${locationId}`).emit('inventory.updated', {
    productId,
    storeId: locationId,
    quantity: afterQuantity
  });

  return afterQuantity;
}

module.exports = {
  setupContext,
  getContext,
  verifyJWT,
  validateBody,
  writeAuditLog,
  recordInventoryMovement,
  schemas: {
    loginSchema,
    productSchema,
    userSchema
  }
};
