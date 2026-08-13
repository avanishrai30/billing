const { getContext } = require('../modules/context');

/**
 * Audit Domain Service
 * Owns collection: 'audit_logs'
 */
const auditService = {
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
        'settings_updated': { action: 'update', view: 'settings' }
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
      } else if (eventType === 'franchise_created') {
        detailsString = `Saved franchise CRM profile: ${after?.name || entityId}`;
      } else if (eventType === 'franchise_deleted') {
        detailsString = `Removed franchise profile (ID: ${entityId})`;
      } else if (eventType === 'franchise_order_created') {
        detailsString = `Dispatched supply stock order to Franchise Outlet (ID: #${entityId}, Value: ₹${after?.grandTotal || 0})`;
      } else if (eventType === 'rbac_updated') {
        detailsString = `Updated global role-permissions matrix permissions configurations`;
      } else if (eventType === 'user_updated') {
        detailsString = `Modified account profile details for user: ${entityId}`;
      } else if (eventType === 'user_created') {
        detailsString = `Created user account for: ${after?.username || entityId} (Designation: ${after?.role || 'N/A'})`;
      } else if (eventType === 'customer_created' || eventType === 'customer_updated') {
        detailsString = `Saved customer CRM record: ${after?.name || entityId}`;
      } else if (eventType === 'customer_deleted') {
        detailsString = `Deleted customer CRM record ID: ${entityId}`;
      } else if (eventType === 'supplier_created' || eventType === 'supplier_updated') {
        detailsString = `Saved supplier record: ${after?.name || entityId}`;
      } else if (eventType === 'supplier_deleted') {
        detailsString = `Deleted supplier record ID: ${entityId}`;
      } else if (eventType === 'business_updated') {
        detailsString = `Saved business outlet profile: ${after?.name || entityId}`;
      } else if (eventType === 'business_deleted') {
        detailsString = `Deleted business outlet profile ID: ${entityId}`;
      } else if (eventType === 'store_created' || eventType === 'store_updated') {
        detailsString = `Saved store configuration: ${after?.name || entityId}`;
      } else if (eventType === 'store_deleted') {
        detailsString = `Deleted store configuration ID: ${entityId}`;
      } else if (eventType === 'settings_updated') {
        detailsString = `Updated landing page and branding settings`;
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
  },

  /**
   * Fetches audit log records
   */
  async listAuditLogs(limit = 1000) {
    const { db } = getContext();
    return await db.collection('audit_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(Math.min(limit, 1000))
      .toArray();
  }
};

module.exports = auditService;
