const { getContext } = require('../modules/context');
const auditService = require('./auditService');

/**
 * Granular Permission Definitions & Canonical Defaults
 */
const DEFAULT_ROLE_PERMISSIONS = {
  'super admin': ['*'],
  'owner': ['*'],
  'admin': [
    'dashboard.view',
    'products.view',
    'products.create',
    'products.update',
    'products.archive',
    'products.import.preview',
    'products.import.commit',
    'inventory.view',
    'inventory.adjust',
    'inventory.transfer',
    'purchases.view',
    'purchases.create',
    'purchases.void',
    'invoices.view',
    'invoices.create',
    'invoices.void',
    'invoices.print',
    'customers.view',
    'customers.create',
    'customers.update',
    'customers.delete',
    'suppliers.view',
    'suppliers.create',
    'suppliers.update',
    'suppliers.delete',
    'businesses.view',
    'businesses.create',
    'businesses.update',
    'businesses.delete',
    'stores.view',
    'stores.create',
    'stores.update',
    'stores.delete',
    'franchise.view',
    'franchise.manage',
    'users.view',
    'users.create',
    'users.update',
    'users.deactivate',
    'roles.view',
    'roles.update',
    'audit.view',
    'settings.view',
    'settings.update',
    'scanner.use'
  ],
  'employee': [
    'dashboard.view',
    'products.view',
    'inventory.view',
    'invoices.view',
    'invoices.create',
    'invoices.print',
    'purchases.view',
    'purchases.create',
    'customers.view',
    'customers.create',
    'customers.update',
    'suppliers.view',
    'settings.view',
    'scanner.use'
  ],
  'auditor': [
    'dashboard.view',
    'products.view',
    'inventory.view',
    'purchases.view',
    'invoices.view',
    'invoices.print',
    'audit.view'
  ]
};

// Legacy module permission expansion mapping
const LEGACY_MODULE_EXPANSION = {
  'dashboard': ['dashboard.view'],
  'billing': ['invoices.view', 'invoices.create', 'invoices.print'],
  'inventory': ['inventory.view'],
  'purchase': ['purchases.view', 'purchases.create'],
  'businesses': ['businesses.view', 'businesses.create', 'businesses.update'],
  'customers': ['customers.view', 'customers.create', 'customers.update'],
  'invoices': ['invoices.view', 'invoices.print'],
  'settings': ['settings.view', 'settings.update'],
  'auditor': ['audit.view'],
  'permissions': ['roles.view', 'roles.update', 'users.view', 'users.create', 'users.update'],
  'scanner': ['scanner.use'],
  'verification': ['products.view'],
  'remote-scanner': ['scanner.use'],
  'refunds': ['invoices.void']
};

/**
 * Normalizes user category/role into canonical category
 */
function normalizeCategory(user) {
  if (!user) return 'employee';
  const raw = (user.category || user.role || 'employee').toLowerCase().trim();
  if (raw === 'owner' || raw.includes('super')) return 'super admin';
  if (raw.includes('admin')) return 'admin';
  if (raw.includes('audit')) return 'auditor';
  return 'employee';
}

/**
 * Checks if user is Super Admin / Owner
 */
function isSuperAdmin(user) {
  if (!user) return false;
  const cat = normalizeCategory(user);
  const role = (user.role || '').toUpperCase();
  return cat === 'super admin' || role === 'SUPER ADMIN' || role === 'OWNER';
}

function expandPermissionList(permissionList = []) {
  const expanded = new Set();
  permissionList.forEach(item => {
    if (!item) return;
    if (LEGACY_MODULE_EXPANSION[item]) {
      LEGACY_MODULE_EXPANSION[item].forEach(p => expanded.add(p));
    } else {
      expanded.add(item);
    }
  });
  return Array.from(expanded);
}

function uniquePermissions(permissionList = []) {
  return Array.from(new Set((permissionList || []).filter(Boolean)));
}

function createAuthorizationError(message, code = 'PERMISSION_GRANT_FORBIDDEN') {
  const err = new Error(message);
  err.statusCode = 403;
  err.code = code;
  return err;
}

async function assertCanGrantPermissions(actor, requestedPermissions = []) {
  if (!actor) {
    throw createAuthorizationError('Authentication required.', 'UNAUTHORIZED');
  }
  if (isSuperAdmin(actor)) return;

  const actorPermissions = await resolveUserPermissions(actor);
  if (actorPermissions.includes('*')) return;

  const allowed = new Set(actorPermissions);
  const requested = uniquePermissions(expandPermissionList(requestedPermissions));
  const forbidden = requested.filter(permission => permission === '*' || !allowed.has(permission));

  if (forbidden.length > 0) {
    throw createAuthorizationError(
      `Cannot grant permissions outside actor authority: ${forbidden.join(', ')}`
    );
  }
}

async function assertRoleMatrixUpdateAllowed(actor, matrix = {}) {
  const allowedRoleKeys = new Set(['admin', 'employee', 'auditor']);
  const roleKeys = Object.keys(matrix || {});
  const invalidKeys = roleKeys.filter(key => !allowedRoleKeys.has(String(key).toLowerCase()));
  if (invalidKeys.length > 0) {
    throw createAuthorizationError(
      `Role matrix can only update Admin, Employee, and Auditor templates: ${invalidKeys.join(', ')}`,
      'ROLE_TEMPLATE_FORBIDDEN'
    );
  }

  const requestedPermissions = roleKeys.flatMap(key => Array.isArray(matrix[key]) ? matrix[key] : []);
  await assertCanGrantPermissions(actor, requestedPermissions);
}

async function getRolePermissionsForCategory(category) {
  let basePermissions = DEFAULT_ROLE_PERMISSIONS[category] || DEFAULT_ROLE_PERMISSIONS.employee;

  try {
    const { db } = getContext();
    if (db) {
      const doc = await db.collection('role_permissions').findOne({ key: 'matrix' });
      if (doc && doc.permissions && doc.permissions[category]) {
        const expanded = expandPermissionList(doc.permissions[category]);
        if (expanded.length > 0) {
          basePermissions = expanded;
        }
      }
    }
  } catch (err) {
    console.warn('[AuthZ] Failed to load role_permissions matrix, using defaults:', err.message);
  }

  return uniquePermissions(basePermissions);
}

async function resolveUserPermissionDetails(user) {
  if (!user) {
    return {
      category: 'employee',
      rolePermissions: [],
      permissionGrants: [],
      permissionDenies: [],
      effectivePermissions: []
    };
  }

  if (isSuperAdmin(user)) {
    return {
      category: 'super admin',
      rolePermissions: ['*'],
      permissionGrants: [],
      permissionDenies: [],
      effectivePermissions: ['*']
    };
  }

  const category = normalizeCategory(user);
  const rolePermissions = await getRolePermissionsForCategory(category);
  const permissionGrants = uniquePermissions([
    ...expandPermissionList(user.permissions || []),
    ...expandPermissionList(user.permissionGrants || [])
  ]);
  const permissionDenies = uniquePermissions(expandPermissionList(user.permissionDenies || []));
  const denied = new Set(permissionDenies);
  const effectivePermissions = uniquePermissions([...rolePermissions, ...permissionGrants])
    .filter(permission => !denied.has(permission));

  return {
    category,
    rolePermissions,
    permissionGrants,
    permissionDenies,
    effectivePermissions
  };
}

function toAuthUser(dbUser, tokenUser = {}) {
  return {
    id: dbUser.id,
    name: dbUser.name,
    username: dbUser.username,
    email: dbUser.email,
    phone: dbUser.phone,
    role: dbUser.role || tokenUser.role || 'Employee',
    category: dbUser.category || tokenUser.category || normalizeCategory(dbUser),
    assignedStoreId: dbUser.assignedStoreId || tokenUser.assignedStoreId || 'all',
    assignedStores: dbUser.assignedStores || tokenUser.assignedStores || ['all'],
    permissionGrants: dbUser.permissionGrants || [],
    permissionDenies: dbUser.permissionDenies || [],
    permissions: dbUser.permissions || [],
    avatar: dbUser.avatar || '',
    status: dbUser.status || 'active',
    tokenVersion: dbUser.tokenVersion || tokenUser.tokenVersion || 1
  };
}

/**
 * Resolves effective permissions list for a user
 */
async function resolveUserPermissions(user) {
  const details = await resolveUserPermissionDetails(user);
  return details.effectivePermissions;
}

/**
 * Core permission check helper
 */
async function checkPermission(user, requiredPermission) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const permissions = await resolveUserPermissions(user);
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
}

/**
 * Standard 403 Response Builder
 */
function sendForbiddenResponse(res, req, message, code = 'FORBIDDEN') {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
  return res.status(403).json({
    success: false,
    error: {
      code,
      message: message || "You do not have permission to perform this action"
    },
    requestId
  });
}

/**
 * Middleware: Requires single granular permission
 */
function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" }
      });
    }

    const hasAccess = await checkPermission(req.user, permission);
    if (!hasAccess) {
      await auditService.writeAuditLog(
        'AUTHORIZATION_DENIED',
        'security',
        req.user.id || req.user.username,
        null,
        {
          requiredPermission: permission,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          reason: `Missing permission: ${permission}`
        },
        req
      );
      return sendForbiddenResponse(res, req, `Forbidden: Missing required permission '${permission}'`);
    }

    next();
  };
}

/**
 * Middleware: Requires at least one permission from the array
 */
function requireAnyPermission(permissions = []) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" }
      });
    }

    if (isSuperAdmin(req.user)) return next();

    const userPerms = await resolveUserPermissions(req.user);
    if (userPerms.includes('*')) return next();

    const hasAny = permissions.some(p => userPerms.includes(p));
    if (!hasAny) {
      await auditService.writeAuditLog(
        'AUTHORIZATION_DENIED',
        'security',
        req.user.id || req.user.username,
        null,
        {
          requiredAnyOf: permissions,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          reason: `Missing any of permissions: ${permissions.join(', ')}`
        },
        req
      );
      return sendForbiddenResponse(res, req, `Forbidden: Missing required permissions`);
    }

    next();
  };
}

/**
 * Middleware: Enforces Store Scope on mutation endpoints
 */
function requireStoreScope(targetLocationExtractor) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" }
      });
    }

    if (isSuperAdmin(req.user) || !req.user.assignedStoreId || req.user.assignedStoreId === 'all') {
      return next();
    }

    const targetLocationId = typeof targetLocationExtractor === 'function'
      ? targetLocationExtractor(req)
      : (req.body.locationId || req.body.storeId || req.body.businessId || req.query.locationId || req.query.storeId);

    if (targetLocationId && targetLocationId !== 'all' && targetLocationId !== req.user.assignedStoreId) {
      auditService.writeAuditLog(
        'AUTHORIZATION_DENIED',
        'security',
        req.user.id || req.user.username,
        null,
        {
          userStore: req.user.assignedStoreId,
          targetLocationId,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          reason: `Store scope mismatch: user assigned to '${req.user.assignedStoreId}', tried to access '${targetLocationId}'`
        },
        req
      );
      return sendForbiddenResponse(res, req, `Forbidden: You are not authorized to perform operations for store '${targetLocationId}'`, 'STORE_ACCESS_DENIED');
    }

    next();
  };
}

/**
 * Query helper: Generates MongoDB store filter for reads
 */
function getStoreScopeFilter(user, fieldNames = ['locationId', 'storeId']) {
  if (!user || isSuperAdmin(user) || !user.assignedStoreId || user.assignedStoreId === 'all') {
    return {};
  }
  const storeId = user.assignedStoreId;
  const orConditions = fieldNames.map(f => ({ [f]: storeId }));
  return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
}

module.exports = {
  DEFAULT_ROLE_PERMISSIONS,
  LEGACY_MODULE_EXPANSION,
  expandPermissionList,
  uniquePermissions,
  assertCanGrantPermissions,
  assertRoleMatrixUpdateAllowed,
  normalizeCategory,
  isSuperAdmin,
  getRolePermissionsForCategory,
  resolveUserPermissionDetails,
  resolveUserPermissions,
  toAuthUser,
  checkPermission,
  requirePermission,
  requireAnyPermission,
  requireStoreScope,
  getStoreScopeFilter,
  sendForbiddenResponse
};
