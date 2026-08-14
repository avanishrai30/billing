/**
 * Centralized Realtime & Socket.IO Event Dispatcher
 * Enforces standard event envelopes, store isolation, user socket tracking, and session revocation.
 */

let ioInstance = null;
let getDbInstance = null;
const userSockets = new Map(); // userId -> Set<socket.id>

function setup(io, getDb) {
  ioInstance = io;
  getDbInstance = getDb;
}

/**
 * Creates canonical event envelope for realtime messages
 */
function createEventEnvelope(entity, action, entityId, locationId = null, data = {}, version = 1) {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    entity,
    action,
    entityId: String(entityId || ''),
    locationId: locationId || null,
    version: typeof version === 'number' ? version : 1,
    timestamp: new Date().toISOString(),
    data: data || {}
  };
}

/**
 * Emits an event to a specific store room
 */
function emitToStore(storeId, eventName, payload) {
  if (!ioInstance || !storeId) return;
  const room = `store_${storeId}`;
  ioInstance.to(room).emit(eventName, payload);
}

/**
 * Emits an event to sync_global (strictly for genuinely global metadata)
 */
function emitGlobal(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to('sync_global').emit(eventName, payload);
}

/**
 * Register active socket for user
 */
function registerUserSocket(userId, socket) {
  if (!userId || !socket) return;
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
}

/**
 * Unregister socket for user
 */
function unregisterUserSocket(userId, socketId) {
  if (!userId || !socketId) return;
  if (userSockets.has(userId)) {
    const set = userSockets.get(userId);
    set.delete(socketId);
    if (set.size === 0) {
      userSockets.delete(userId);
    }
  }
}

/**
 * Revoke all active sockets for a specific user (on password change or deactivation)
 */
function revokeUserSockets(userId) {
  if (!userId || !userSockets.has(userId)) return;
  const socketIds = userSockets.get(userId);
  if (ioInstance && ioInstance.sockets && ioInstance.sockets.sockets) {
    for (const socketId of socketIds) {
      const sock = ioInstance.sockets.sockets.get(socketId);
      if (sock) {
        console.log(`[Realtime] Disconnecting revoked session for socket ${socketId} (user: ${userId})`);
        sock.emit('SESSION_REVOKED', {
          code: 'SESSION_REVOKED',
          message: 'Your session has been invalidated or updated. Please log in again.'
        });
        sock.disconnect(true);
      }
    }
  }
  userSockets.delete(userId);
}

module.exports = {
  setup,
  createEventEnvelope,
  emitToStore,
  emitGlobal,
  registerUserSocket,
  unregisterUserSocket,
  revokeUserSockets,
  getUserSocketCount(userId) {
    return userSockets.has(userId) ? userSockets.get(userId).size : 0;
  }
};
