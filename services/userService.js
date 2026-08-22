const bcrypt = require('bcryptjs');
const { getContext } = require('../modules/context');
const auditService = require('./auditService');
const authzService = require('./authzService');

const ACCESS_FIELDS = [
  'role',
  'category',
  'assignedStoreId',
  'assignedStores',
  'permissions',
  'permissionGrants',
  'permissionDenies',
  'status'
];

function createHttpError(message, statusCode = 400, code = 'USER_UPDATE_REJECTED') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function normalizePermissionArray(value = []) {
  return Array.from(new Set((Array.isArray(value) ? value : []).filter(Boolean)));
}

function normalizeUserAccessPayload(userData, existingUser) {
  const category = userData.category || existingUser?.category || authzService.normalizeCategory(userData);
  return {
    ...userData,
    category,
    assignedStoreId: userData.assignedStoreId || existingUser?.assignedStoreId || 'all',
    assignedStores: userData.assignedStores || existingUser?.assignedStores || [userData.assignedStoreId || existingUser?.assignedStoreId || 'all'],
    permissions: normalizePermissionArray(userData.permissions || existingUser?.permissions || []),
    permissionGrants: normalizePermissionArray(userData.permissionGrants || existingUser?.permissionGrants || []),
    permissionDenies: normalizePermissionArray(userData.permissionDenies || existingUser?.permissionDenies || [])
  };
}

function accessFieldChanged(before = {}, after = {}) {
  return ACCESS_FIELDS.some(field => JSON.stringify(before[field] || null) !== JSON.stringify(after[field] || null));
}

async function countActiveSuperAdmins(db, excludingUserId = null) {
  const users = await db.collection('users').find({}).project({ passwordHash: 0, password: 0 }).toArray();
  return users.filter(user => {
    if (excludingUserId && user.id === excludingUserId) return false;
    if (user.status === 'suspended' || user.status === 'inactive') return false;
    return authzService.isSuperAdmin(user);
  }).length;
}

async function assertPrivilegeUpdateAllowed(db, existingUser, nextUser, req) {
  const actor = req?.user;
  if (!actor) return;

  const actorIsSuperAdmin = authzService.isSuperAdmin(actor);
  const targetWasSuperAdmin = existingUser ? authzService.isSuperAdmin(existingUser) : false;
  const targetWillBeSuperAdmin = authzService.isSuperAdmin(nextUser);
  const targetId = nextUser.id || existingUser?.id;
  const isSelf = actor.id && targetId && actor.id === targetId;

  if (!actorIsSuperAdmin && (targetWasSuperAdmin || targetWillBeSuperAdmin)) {
    throw createHttpError('Only a Super Admin can create or modify Super Admin accounts.', 403, 'SUPER_ADMIN_REQUIRED');
  }

  const directGrants = [
    ...(nextUser.permissions || []),
    ...(nextUser.permissionGrants || [])
  ];
  if (!actorIsSuperAdmin && directGrants.includes('*')) {
    throw createHttpError('Wildcard permissions cannot be granted by this account.', 403, 'WILDCARD_GRANT_FORBIDDEN');
  }
  await authzService.assertCanGrantPermissions(actor, directGrants);

  if (targetWasSuperAdmin && !targetWillBeSuperAdmin) {
    if (isSelf) {
      throw createHttpError('You cannot demote your own Super Admin account.', 403, 'SELF_DEMOTION_FORBIDDEN');
    }
    const remaining = await countActiveSuperAdmins(db, existingUser.id);
    if (remaining < 1) {
      throw createHttpError('At least one active Super Admin account must remain.', 403, 'LAST_SUPER_ADMIN_FORBIDDEN');
    }
  }
}

function emitUserAccessUpdated(userId, changedFields = []) {
  const realtimeService = require('./realtimeService');
  const updatedAt = new Date().toISOString();
  realtimeService.emitToUser(userId, 'user_access_updated', {
    targetUserId: userId,
    userId,
    changedFields,
    reason: 'USER_ACCESS_UPDATED',
    authorizationVersion: Date.parse(updatedAt),
    updatedAt,
    timestamp: updatedAt
  });
}

/**
 * User & Identity Domain Service
 * Owns collection: 'users'
 */
const userService = {
  /**
   * Centralized Password Change Logic
   * Used by both /api/v1/auth/change-password and /api/v1/users/change-password
   */
  async changePassword(userId, currentPassword, newPassword, req) {
    if (!currentPassword || !newPassword) {
      throw new Error("Missing current or new password");
    }
    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const { db, io } = getContext();
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    // Verify against passwordHash or legacy plaintext password
    let match = false;
    if (user.passwordHash) {
      match = bcrypt.compareSync(currentPassword, user.passwordHash);
    } else if (user.password) {
      match = (currentPassword === user.password);
    }

    if (!match) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 400;
      throw err;
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    const nextTokenVersion = (user.tokenVersion && user.tokenVersion >= 1) ? user.tokenVersion + 1 : 2;

    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: { passwordHash: newHash, tokenVersion: nextTokenVersion, updatedAt: new Date().toISOString() },
        $unset: { password: "" }
      }
    );

    await auditService.writeAuditLog('user_updated', 'user', userId, null, { action: 'PASSWORD_CHANGED' }, req);
    
    // Revoke active Socket.IO sessions immediately
    const realtimeService = require('./realtimeService');
    realtimeService.revokeUserSockets(userId);

    if (io) {
      io.to('sync_global').emit('user_updated', { userId });
    }

    return { success: true, message: "Password updated successfully. Other active sessions invalidated." };
  },

  /**
   * List all users (excluding password hashes and legacy passwords)
   */
  async listUsers() {
    const { db } = getContext();
    return await db.collection('users')
      .find({})
      .project({ passwordHash: 0, password: 0 })
      .toArray();
  },

  /**
   * Get user by ID (excluding password hashes and legacy passwords)
   */
  async getUserById(id) {
    const { db } = getContext();
    return await db.collection('users')
      .findOne({ id }, { projection: { passwordHash: 0, password: 0 } });
  },

  /**
   * Save or create user account (Guarantees passwordHash only)
   */
  async saveUser(userData, req) {
    const { db, io } = getContext();
    const userId = userData.id || `usr-${Date.now()}`;
    const passwordHash = userData.password ? bcrypt.hashSync(userData.password, 12) : undefined;
    const existingUser = userData.id ? await db.collection('users').findOne({ id: userId }) : null;
    const normalizedData = normalizeUserAccessPayload(userData, existingUser);

    const userDoc = {
      ...normalizedData,
      id: userId,
      status: normalizedData.status || existingUser?.status || 'active',
      updatedAt: new Date().toISOString()
    };
    if (passwordHash) {
      userDoc.passwordHash = passwordHash;
    }
    delete userDoc.password; // Plaintext password is NEVER preserved

    await assertPrivilegeUpdateAllowed(db, existingUser, userDoc, req);

    if (!normalizedData.id) {
      userDoc.createdAt = new Date().toISOString();
      userDoc.tokenVersion = 1;
      await db.collection('users').insertOne(userDoc);
      await auditService.writeAuditLog('user_created', 'user', userId, null, userDoc, req);
    } else {
      const updatePayload = {
        $set: userDoc,
        $unset: { password: "" }
      };

      if (passwordHash) {
        const nextTokenVersion = (existingUser && existingUser.tokenVersion && existingUser.tokenVersion >= 1)
          ? existingUser.tokenVersion + 1
          : 2;
        updatePayload.$set.tokenVersion = nextTokenVersion;
        
        const realtimeService = require('./realtimeService');
        realtimeService.revokeUserSockets(userId);
      }

      await db.collection('users').updateOne({ id: userId }, updatePayload);
      await auditService.writeAuditLog('user_updated', 'user', userId, existingUser, userDoc, req);
    }

    if (io) {
      io.to('sync_global').emit('user_updated', { user: userDoc });
    }
    if (!passwordHash && (!existingUser || accessFieldChanged(existingUser, userDoc))) {
      emitUserAccessUpdated(userId, ACCESS_FIELDS.filter(field => JSON.stringify(existingUser?.[field] || null) !== JSON.stringify(userDoc[field] || null)));
    }

    return userDoc;
  },

  async getEffectivePermissions(userId) {
    const user = await this.getUserById(userId);
    if (!user) return null;
    return {
      userId,
      ...await authzService.resolveUserPermissionDetails(user)
    };
  },

  async updatePermissionOverrides(userId, { permissionGrants = [], permissionDenies = [] }, req) {
    const { db, io } = getContext();
    const existingUser = await db.collection('users').findOne({ id: userId });
    if (!existingUser) {
      throw createHttpError('User not found', 404, 'USER_NOT_FOUND');
    }

    const nextUser = normalizeUserAccessPayload({
      ...existingUser,
      permissionGrants,
      permissionDenies
    }, existingUser);

    await assertPrivilegeUpdateAllowed(db, existingUser, nextUser, req);

    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          permissionGrants: nextUser.permissionGrants,
          permissionDenies: nextUser.permissionDenies,
          updatedAt: new Date().toISOString()
        }
      }
    );

    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog(
      'user_updated',
      'user',
      userId,
      {
        permissionGrants: existingUser.permissionGrants || [],
        permissionDenies: existingUser.permissionDenies || []
      },
      {
        action: 'PERMISSION_OVERRIDES_UPDATED',
        permissionGrants: updated.permissionGrants || [],
        permissionDenies: updated.permissionDenies || []
      },
      req
    );

    if (io) {
      io.to('sync_global').emit('user_updated', { user: updated });
    }
    emitUserAccessUpdated(userId, ['permissionGrants', 'permissionDenies']);

    return {
      success: true,
      user: updated,
      permissions: await this.getEffectivePermissions(userId)
    };
  },

  /**
   * Deactivate a user account and immediately revoke their active sessions
   */
  async deactivateUser(userId, req) {
    const { db, io } = getContext();
    const now = new Date().toISOString();
    const existingUser = await db.collection('users').findOne({ id: userId });
    if (!existingUser) return null;
    if (req?.user?.id === userId) {
      throw createHttpError('You cannot deactivate your own account.', 403, 'SELF_DEACTIVATION_FORBIDDEN');
    }
    if (authzService.isSuperAdmin(existingUser)) {
      const remaining = await countActiveSuperAdmins(db, userId);
      if (remaining < 1) {
        throw createHttpError('At least one active Super Admin account must remain.', 403, 'LAST_SUPER_ADMIN_FORBIDDEN');
      }
    }
    const nextTokenVersion = (existingUser && existingUser.tokenVersion && existingUser.tokenVersion >= 1)
      ? existingUser.tokenVersion + 1
      : 2;
    
    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: { status: 'suspended', tokenVersion: nextTokenVersion, updatedAt: now }
      }
    );

    // Revoke active Socket.IO sessions immediately
    const realtimeService = require('./realtimeService');
    realtimeService.revokeUserSockets(userId);

    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog('user_deactivated', 'user', userId, null, { status: 'suspended' }, req);

    if (io) {
      io.to('sync_global').emit('user_updated', { user: updated });
    }

    return updated;
  },

  /**
   * Update self profile details
   */
  async updateProfile(userId, { name, email, phone }, req) {
    const { db, io } = getContext();
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { name, email, phone, updatedAt: new Date().toISOString() } }
    );
    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog('user_updated', 'user', userId, null, { name, email, phone }, req);
    if (io) {
      io.to('sync_global').emit('user_updated', { user: updated });
    }
    return updated;
  },

  /**
   * Update self avatar path
   */
  async updateAvatar(userId, avatarPath, req) {
    const { db, io } = getContext();
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { avatar: avatarPath, updatedAt: new Date().toISOString() } }
    );
    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog('user_updated', 'user', userId, null, { avatar: avatarPath }, req);
    if (io) {
      io.to('sync_global').emit('user_updated', { user: updated });
    }
    return updated;
  }
};

module.exports = userService;
