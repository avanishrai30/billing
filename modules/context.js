const jwt = require('jsonwebtoken');
const { z } = require('zod');

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

// JWT Verification Middleware
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

// Body Validation Middleware
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

// Backward-compatibility delegators
async function writeAuditLog(eventType, entity, entityId, before, after, req) {
  const auditService = require('../services/auditService');
  return await auditService.writeAuditLog(eventType, entity, entityId, before, after, req);
}

async function recordInventoryMovement(productId, locationId, type, quantity, referenceType, referenceId, performedBy) {
  const inventoryService = require('../services/inventoryService');
  return await inventoryService.recordInventoryMovement(productId, locationId, type, quantity, referenceType, referenceId, performedBy);
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
