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

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeOptionalEmail(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStoreScopePayload(userData, existingUser) {
  const category = userData.category || existingUser?.category || authzService.normalizeCategory(userData);
  const hasAssignedStores = Object.prototype.hasOwnProperty.call(userData, 'assignedStores');
  const rawAssignedStoreId = userData.assignedStoreId ?? existingUser?.assignedStoreId;
  
  let assignedStores = normalizePermissionArray(
    hasAssignedStores
      ? userData.assignedStores
      : (existingUser?.assignedStores || (rawAssignedStoreId ? [rawAssignedStoreId] : ['all']))
  ).map(storeId => String(storeId).trim()).filter(Boolean);

  // Super Admin is always global
  if (category === 'super admin') {
    return { assignedStoreId: 'all', assignedStores: ['all'] };
  }

  // Global Admin
  if (category === 'admin' && (rawAssignedStoreId === 'all' || assignedStores.includes('all'))) {
    return { assignedStoreId: 'all', assignedStores: ['all'] };
  }

  // Filter out 'all' for store-restricted users (employees, auditors, non-global admins)
  assignedStores = assignedStores.filter(s => s !== 'all');

  if (assignedStores.length === 0) {
    if (rawAssignedStoreId && rawAssignedStoreId !== 'all') {
      assignedStores = [rawAssignedStoreId];
    } else if (category === 'employee' || category === 'auditor') {
      throw createHttpError('Employees must be assigned to at least one physical store.', 400, 'INVALID_STORE_SCOPE');
    } else {
      return { assignedStoreId: 'all', assignedStores: ['all'] };
    }
  }

  // Primary store must be one of the assigned stores
  let assignedStoreId = String(rawAssignedStoreId || '').trim();
  if (!assignedStoreId || assignedStoreId === 'all' || !assignedStores.includes(assignedStoreId)) {
    assignedStoreId = assignedStores[0];
  }

  return { assignedStoreId, assignedStores };
}

async function assertStoreScopeExists(db, scope) {
  if (scope.assignedStores.includes('all') || scope.assignedStoreId === 'all') return;
  for (const storeId of scope.assignedStores) {
    const store = await db.collection('stores').findOne({ id: storeId });
    if (!store) {
      throw createHttpError(`Store '${storeId}' was not found. Select an active Store Scope from the stores list.`, 409, 'STORE_NOT_FOUND');
    }
  }
}

function normalizeUserAccessPayload(userData, existingUser) {
  const category = userData.category || existingUser?.category || authzService.normalizeCategory(userData);
  const storeScope = normalizeStoreScopePayload(userData, existingUser);
  const hasEmailField = Object.prototype.hasOwnProperty.call(userData, 'email');
  const normalizedEmail = normalizeOptionalEmail(hasEmailField ? userData.email : existingUser?.email);
  const emailPayload = normalizedEmail ? { email: normalizedEmail } : {};
  const { email, ...restUserData } = userData;
  const avatar = Object.prototype.hasOwnProperty.call(userData, 'avatar')
    ? (userData.avatar || null)
    : (existingUser?.avatar || null);
  const avatarUpdatedAt = Object.prototype.hasOwnProperty.call(userData, 'avatarUpdatedAt')
    ? (userData.avatarUpdatedAt || null)
    : (existingUser?.avatarUpdatedAt || null);
  return {
    ...restUserData,
    username: normalizeUsername(userData.username || existingUser?.username),
    ...emailPayload,
    avatar,
    avatarUpdatedAt,
    category,
    ...storeScope,
    permissions: normalizePermissionArray(userData.permissions || existingUser?.permissions || []),
    permissionGrants: normalizePermissionArray(userData.permissionGrants || existingUser?.permissionGrants || []),
    permissionDenies: normalizePermissionArray(userData.permissionDenies || existingUser?.permissionDenies || [])
  };
}

async function assertUniqueUserIdentity(db, userDoc, existingUser) {
  const duplicateUsername = await db.collection('users').findOne({ username: userDoc.username });
  if (duplicateUsername && duplicateUsername.id !== existingUser?.id) {
    throw createHttpError(`Username '${userDoc.username}' is already in use.`, 409, 'USERNAME_ALREADY_EXISTS');
  }

  const normalizedEmail = normalizeOptionalEmail(userDoc.email);
  if (normalizedEmail) {
    const duplicateEmail = await db.collection('users').findOne({ email: normalizedEmail });
    if (duplicateEmail && duplicateEmail.id !== existingUser?.id) {
      throw createHttpError(`Email '${normalizedEmail}' is already in use.`, 409, 'USER_EMAIL_ALREADY_EXISTS');
    }
  }

  if (!existingUser) {
    const duplicateId = await db.collection('users').findOne({ id: userDoc.id });
    if (duplicateId) {
      throw createHttpError('User ID collision detected. Please retry user creation.', 409, 'USER_ID_ALREADY_EXISTS');
    }
  }
}

function mapDuplicateKeyError(err) {
  if (!err || err.code !== 11000) return null;
  const keyPattern = err.keyPattern || {};
  const keyValue = err.keyValue || {};
  if (keyPattern.username || keyValue.username) {
    return createHttpError(`Username '${keyValue.username || ''}' is already in use.`, 409, 'USERNAME_ALREADY_EXISTS');
  }
  if (keyPattern.email || keyValue.email) {
    const normalizedEmail = normalizeOptionalEmail(keyValue.email);
    const message = normalizedEmail
      ? `Email '${normalizedEmail}' is already in use.`
      : 'Optional email must be blank or a unique email address.';
    return createHttpError(message, 409, 'USER_EMAIL_ALREADY_EXISTS');
  }
  if (keyPattern.id || keyValue.id) {
    return createHttpError('User ID collision detected. Please retry user creation.', 409, 'USER_ID_ALREADY_EXISTS');
  }
  return createHttpError('User already exists.', 409, 'USER_ALREADY_EXISTS');
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

function emitUserAccessUpdated(userId, changedFields = [], userDoc = null) {
  const realtimeService = require('./realtimeService');
  const updatedAt = userDoc?.updatedAt || new Date().toISOString();
  realtimeService.emitToUser(userId, 'user_access_updated', {
    targetUserId: userId,
    userId,
    category: userDoc?.category,
    role: userDoc?.role,
    changedFields,
    reason: 'USER_ACCESS_UPDATED',
    authorizationVersion: Date.parse(updatedAt) || Date.now(),
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

    if (!existingUser && !passwordHash) {
      throw createHttpError('Password is required when creating a new user.', 400, 'PASSWORD_REQUIRED');
    }

    await assertStoreScopeExists(db, normalizedData);

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
    await assertUniqueUserIdentity(db, userDoc, existingUser);

    if (!normalizedData.id) {
      userDoc.createdAt = new Date().toISOString();
      userDoc.tokenVersion = 1;
      try {
        await db.collection('users').insertOne(userDoc);
      } catch (err) {
        const duplicateErr = mapDuplicateKeyError(err);
        if (duplicateErr) throw duplicateErr;
        throw err;
      }
      await auditService.writeAuditLog('user_created', 'user', userId, null, userDoc, req);
    } else {
      const updatePayload = {
        $set: userDoc,
        $unset: { password: "" }
      };
      if (!userDoc.email) {
        updatePayload.$unset.email = "";
      }

      if (passwordHash) {
        const nextTokenVersion = (existingUser && existingUser.tokenVersion && existingUser.tokenVersion >= 1)
          ? existingUser.tokenVersion + 1
          : 2;
        updatePayload.$set.tokenVersion = nextTokenVersion;
        
        const realtimeService = require('./realtimeService');
        realtimeService.revokeUserSockets(userId);
      }

      try {
        await db.collection('users').updateOne({ id: userId }, updatePayload);
      } catch (err) {
        const duplicateErr = mapDuplicateKeyError(err);
        if (duplicateErr) throw duplicateErr;
        throw err;
      }
      await auditService.writeAuditLog('user_updated', 'user', userId, existingUser, userDoc, req);
    }

    if (io) {
      io.to('sync_global').emit(normalizedData.id ? 'user_updated' : 'user_created', { user: userDoc });
      io.to('sync_global').emit('user_updated', { user: userDoc });
    }
    if (!passwordHash && (!existingUser || accessFieldChanged(existingUser, userDoc))) {
      emitUserAccessUpdated(userId, ACCESS_FIELDS.filter(field => JSON.stringify(existingUser?.[field] || null) !== JSON.stringify(userDoc[field] || null)), userDoc);
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
    emitUserAccessUpdated(userId, ['permissionGrants', 'permissionDenies'], updated);

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
    const existingUser = await db.collection('users').findOne({ id: userId });
    if (!existingUser) {
      throw createHttpError('User not found', 404, 'USER_NOT_FOUND');
    }

    const normalizedEmail = normalizeOptionalEmail(email);
    if (normalizedEmail) {
      const duplicateEmail = await db.collection('users').findOne({ email: normalizedEmail });
      if (duplicateEmail && duplicateEmail.id !== userId) {
        throw createHttpError(`Email '${normalizedEmail}' is already in use.`, 409, 'USER_EMAIL_ALREADY_EXISTS');
      }
    }

    const updatePayload = {
      $set: {
        name: String(name || '').trim(),
        phone: String(phone || '').trim(),
        updatedAt: new Date().toISOString()
      }
    };
    if (normalizedEmail) {
      updatePayload.$set.email = normalizedEmail;
    } else {
      updatePayload.$unset = {};
      updatePayload.$unset.email = "";
    }

    try {
      await db.collection('users').updateOne({ id: userId }, updatePayload);
    } catch (err) {
      const duplicateErr = mapDuplicateKeyError(err);
      if (duplicateErr) throw duplicateErr;
      throw err;
    }
    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog('user_updated', 'user', userId, existingUser, {
      name: updatePayload.$set.name,
      email: normalizedEmail || null,
      phone: updatePayload.$set.phone
    }, req);
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
    const finalAvatar = avatarPath || null;
    const now = new Date().toISOString();
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { avatar: finalAvatar, avatarUpdatedAt: now, updatedAt: now } }
    );
    const updated = await this.getUserById(userId);
    await auditService.writeAuditLog('user_updated', 'user', userId, null, { avatar: finalAvatar }, req);
    if (io) {
      io.to('sync_global').emit('user_updated', {
        userId,
        avatar: finalAvatar,
        avatarUpdatedAt: now,
        user: updated
      });
    }
    return updated;
  }
};

module.exports = userService;
