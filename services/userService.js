const bcrypt = require('bcryptjs');
const { getContext } = require('../modules/context');
const auditService = require('./auditService');

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

    const match = bcrypt.compareSync(currentPassword, user.passwordHash || user.password);
    if (!match) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 400;
      throw err;
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { passwordHash: newHash, updatedAt: new Date().toISOString() } }
    );

    await auditService.writeAuditLog('user_updated', 'user', userId, null, null, req);
    if (io) {
      io.to('sync_global').emit('user_updated', { userId });
    }

    return { success: true, message: "Password updated successfully" };
  },

  /**
   * List all users (excluding password hashes)
   */
  async listUsers() {
    const { db } = getContext();
    return await db.collection('users')
      .find({})
      .project({ passwordHash: 0, password: 0 })
      .toArray();
  },

  /**
   * Get user by ID (excluding password hashes)
   */
  async getUserById(id) {
    const { db } = getContext();
    return await db.collection('users')
      .findOne({ id }, { projection: { passwordHash: 0, password: 0 } });
  },

  /**
   * Save or create user account
   */
  async saveUser(userData, req) {
    const { db, io } = getContext();
    const userId = userData.id || `usr-${Date.now()}`;
    const passwordHash = userData.password ? bcrypt.hashSync(userData.password, 12) : undefined;

    const userDoc = {
      ...userData,
      id: userId,
      updatedAt: new Date().toISOString()
    };
    if (passwordHash) {
      userDoc.passwordHash = passwordHash;
    }
    delete userDoc.password;

    if (!userData.id) {
      userDoc.createdAt = new Date().toISOString();
      await db.collection('users').insertOne(userDoc);
      await auditService.writeAuditLog('user_created', 'user', userId, null, userDoc, req);
    } else {
      await db.collection('users').updateOne({ id: userId }, { $set: userDoc });
      await auditService.writeAuditLog('user_updated', 'user', userId, null, userDoc, req);
    }

    if (io) {
      io.to('sync_global').emit('user_updated', { user: userDoc });
    }

    return userDoc;
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
