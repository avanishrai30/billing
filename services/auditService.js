const { getContext } = require('../modules/context');

/**
 * Audit Domain Service
 * Owns collection: 'audit_logs'
 */
const auditService = {
  /**
   * Sanitizes sensitive fields from audit before/after payloads
   */
  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'currentPassword', 'newPassword', 'jwt', 'authorization'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePayload(sanitized[key]);
      }
    }
    return sanitized;
  },

  /**
   * Writes a structured audit log entry
   */
  async writeAuditLog(eventType, entity, entityId, before, after, req) {
    try {
      const { db } = getContext();
      if (!db) return;

      let userStr = 'System';
      let roleStr = 'SYSTEM';
      let businessId = 'all';
      let businessName = 'All Outlets';
      let viewName = 'system';
      let clientIp = '127.0.0.1';
      let userAgent = 'system';
      let requestId = `req-${Date.now()}`;
      
      if (req) {
        clientIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown';
        userAgent = req.headers['user-agent'] || 'unknown';
        requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

        if (req.user) {
          userStr = `${req.user.name || req.user.username} (@${req.user.username})`;
          roleStr = (req.user.role || req.user.category || 'employee').toUpperCase();
          businessId = req.user.assignedStoreId || 'all';

          if (businessId !== 'all') {
            const biz = await db.collection('businesses').findOne({ id: businessId });
            if (biz) {
              businessName = biz.name;
            }
          }
        }
      }

      const actionMapping = {
        'auth_login': { action: 'auth', view: 'login' },
        'LOGIN_SUCCESS': { action: 'auth', view: 'login' },
        'LOGIN_FAILED': { action: 'auth', view: 'login' },
        'auth_logout': { action: 'auth', view: 'login' },
        'LOGOUT': { action: 'auth', view: 'login' },
        'AUTHORIZATION_DENIED': { action: 'security', view: 'security' },
        'product_created': { action: 'create', view: 'inventory' },
        'product_updated': { action: 'update', view: 'inventory' },
        'product_archived': { action: 'delete', view: 'inventory' },
        'purchase_created': { action: 'create', view: 'purchase' },
        'purchase_deleted': { action: 'delete', view: 'purchase' },
        'inventory_updated': { action: 'update', view: 'inventory' },
        'inventory_transfer': { action: 'transfer', view: 'inventory' },
        'invoice_created': { action: 'billing', view: 'billing' },
        'invoice_voided': { action: 'delete', view: 'invoices' },
        'franchise_created': { action: 'create', view: 'businesses' },
        'franchise_deleted': { action: 'delete', view: 'businesses' },
        'franchise_order_created': { action: 'create', view: 'purchase' },
        'rbac_updated': { action: 'update', view: 'permissions' },
        'user_updated': { action: 'update', view: 'permissions' },
        'user_created': { action: 'create', view: 'permissions' },
        'user_deactivated': { action: 'delete', view: 'permissions' },
        'customer_created': { action: 'create', view: 'customers' },
        'customer_updated': { action: 'update', view: 'customers' },
        'customer_deleted': { action: 'delete', view: 'customers' },
        'supplier_created': { action: 'create', view: 'suppliers' },
        'supplier_updated': { action: 'update', view: 'suppliers' },
        'supplier_deleted': { action: 'delete', view: 'suppliers' },
        'business_updated': { action: 'update', view: 'businesses' },
        'business_deleted': { action: 'delete', view: 'businesses' },
        'store_created': { action: 'create', view: 'stores' },
        'store_updated': { action: 'update', view: 'stores' },
        'store_deleted': { action: 'delete', view: 'stores' },
        'settings_updated': { action: 'update', view: 'settings' },
        'import_completed': { action: 'create', view: 'inventory' }
      };

      const map = actionMapping[eventType] || { action: 'update', view: 'system' };
      const actionType = map.action;
      viewName = map.view;

      let detailsString = eventType;
      if (eventType === 'auth_login' || eventType === 'LOGIN_SUCCESS') {
        detailsString = `User session authenticated successfully`;
      } else if (eventType === 'LOGIN_FAILED') {
        detailsString = `Authentication attempt failed for username: ${after?.username || entityId}`;
      } else if (eventType === 'AUTHORIZATION_DENIED') {
        detailsString = `Security alert: Access denied for ${req?.user?.username || 'user'} on ${after?.method} ${after?.endpoint} (${after?.reason || 'Forbidden'})`;
      } else if (eventType === 'auth_logout' || eventType === 'LOGOUT') {
        detailsString = `User session terminated successfully`;
      } else if (eventType === 'product_created') {
        detailsString = `Added product '${after?.name || entityId}' (SKU: ${after?.sku || 'N/A'}, Price: ₹${after?.price || 0})`;
      } else if (eventType === 'product_updated') {
        detailsString = `Updated product '${after?.name || entityId}' details (SKU: ${after?.sku || 'N/A'}, Price: ₹${after?.price || 0})`;
      } else if (eventType === 'product_archived') {
        detailsString = `Archived product ID: ${entityId}`;
      } else if (eventType === 'purchase_created') {
        detailsString = `Recorded supplier purchase entry (Supplier: ${after?.supplier || 'N/A'}, Invoice: #${after?.invoiceNumber || 'N/A'}, Total: ₹${after?.grandTotal || 0})`;
      } else if (eventType === 'purchase_deleted') {
        detailsString = `Deleted purchase entry ID: ${entityId}`;
      } else if (eventType === 'inventory_updated') {
        detailsString = `Adjusted inventory stock levels for product ID ${entityId} to ${after?.quantity || 0} units`;
      } else if (eventType === 'inventory_transfer') {
        detailsString = `Transferred ${after?.quantity || 0} units of product ID ${entityId} from store ${after?.fromStoreId} to ${after?.toStoreId}`;
      } else if (eventType === 'invoice_created') {
        detailsString = `Completed POS transaction for customer '${after?.customerName || 'Walk-In'}'. Created Invoice #${entityId} (Total: ₹${after?.grandTotal || 0})`;
      } else if (eventType === 'invoice_voided') {
        detailsString = `Voided Invoice #${entityId} and reverted items back to warehouse stock`;
      } else if (eventType === 'user_deactivated') {
        detailsString = `Deactivated user account: ${entityId}`;
      } else if (eventType === 'import_completed') {
        detailsString = `Committed bulk product import session ${entityId} (${after?.imported || 0} products)`;
      }

      await db.collection('audit_logs').insertOne({
        eventType,
        entity,
        entityId,
        before: this.sanitizePayload(before) || {},
        after: this.sanitizePayload(after) || {},
        performedBy: (req && req.user) ? req.user.username : 'system',
        user: userStr,
        role: roleStr,
        action: actionType,
        view: viewName,
        details: detailsString,
        businessId,
        businessName,
        ip: clientIp,
        userAgent,
        requestId,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("[Audit Log] Failed to write structured audit log:", err);
    }
  },

  /**
   * Fetches audit log records with filtering and pagination
   */
  async listAuditLogs(options = {}) {
    const { db } = getContext();
    const limit = Math.min(parseInt(options.limit) || 100, 1000);
    const skip = parseInt(options.skip) || 0;
    const query = {};

    if (options.storeId && options.storeId !== 'all') {
      query.businessId = options.storeId;
    }
    if (options.eventType) {
      query.eventType = options.eventType;
    }
    if (options.entity) {
      query.entity = options.entity;
    }
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = options.startDate;
      if (options.endDate) query.timestamp.$lte = options.endDate;
    }

    return await db.collection('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
};

module.exports = auditService;
