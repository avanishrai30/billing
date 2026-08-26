const { setupContext } = require('../modules/context');
const userService = require('../services/userService');

function createCollectionBackedDb(usersTable, auditLogsTable) {
  return {
    collection: (name) => ({
      findOne: async (query) => {
        if (name === 'users') {
          if (query.id) return usersTable.get(query.id) || null;
          return null;
        }
        if (name === 'role_permissions') return null;
        if (name === 'stores') return { id: query.id, name: 'Test Store' };
        return null;
      },
      find: () => ({
        project: () => ({
          toArray: async () => Array.from(usersTable.values())
        }),
        toArray: async () => Array.from(usersTable.values())
      }),
      insertOne: async (doc) => {
        if (name === 'users') usersTable.set(doc.id, doc);
        if (name === 'audit_logs') auditLogsTable.push(doc);
        return { acknowledged: true, insertedId: doc.id };
      },
      updateOne: async (filter, update) => {
        if (name !== 'users') return { matchedCount: 0, modifiedCount: 0 };
        const current = usersTable.get(filter.id);
        if (!current) return { matchedCount: 0, modifiedCount: 0 };
        const next = { ...current, ...(update.$set || {}) };
        if (update.$unset) {
          for (const key of Object.keys(update.$unset)) delete next[key];
        }
        usersTable.set(filter.id, next);
        return { matchedCount: 1, modifiedCount: 1 };
      }
    })
  };
}

describe('User Profile Avatar System Backend Suite', () => {
  let usersTable;
  let auditLogsTable;
  let emittedEvents;

  beforeEach(() => {
    usersTable = new Map([
      ['usr-1', {
        id: 'usr-1',
        name: 'Rajesh Patil',
        username: 'rajesh',
        role: 'Store Manager',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        status: 'active',
        avatar: null
      }]
    ]);
    auditLogsTable = [];
    emittedEvents = [];

    const mockIo = {
      to: (room) => ({
        emit: (eventName, payload) => {
          emittedEvents.push({ room, eventName, payload });
        }
      })
    };

    const mockDb = createCollectionBackedDb(usersTable, auditLogsTable);
    setupContext(mockDb, mockIo, 'test-secret');
  });

  it('1. Uploads and updates user avatar with timestamp versioning', async () => {
    const updated = await userService.updateAvatar('usr-1', '/uploads/users/rajesh-1723321234.webp', {
      user: { id: 'usr-1', username: 'rajesh' },
      headers: {}
    });

    expect(updated.avatar).toBe('/uploads/users/rajesh-1723321234.webp');
    expect(updated.avatarUpdatedAt).toBeDefined();

    // Verify user document in DB
    const userInDb = usersTable.get('usr-1');
    expect(userInDb.avatar).toBe('/uploads/users/rajesh-1723321234.webp');
    expect(userInDb.avatarUpdatedAt).toBe(updated.avatarUpdatedAt);

    // Verify realtime event was broadcast
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].eventName).toBe('user_updated');
    expect(emittedEvents[0].payload.userId).toBe('usr-1');
    expect(emittedEvents[0].payload.avatar).toBe('/uploads/users/rajesh-1723321234.webp');
    expect(emittedEvents[0].payload.avatarUpdatedAt).toBe(updated.avatarUpdatedAt);
  });

  it('2. Clears user avatar and sets avatar to null with updated timestamp', async () => {
    const req = { user: { id: 'usr-1', username: 'rajesh' }, headers: {} };
    // First set avatar
    await userService.updateAvatar('usr-1', '/uploads/users/rajesh-1723321234.webp', req);
    emittedEvents.length = 0;

    // Now clear avatar
    const cleared = await userService.updateAvatar('usr-1', null, req);
    expect(cleared.avatar).toBeNull();
    expect(cleared.avatarUpdatedAt).toBeDefined();

    const userInDb = usersTable.get('usr-1');
    expect(userInDb.avatar).toBeNull();

    // Verify realtime broadcast for clear
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].eventName).toBe('user_updated');
    expect(emittedEvents[0].payload.userId).toBe('usr-1');
    expect(emittedEvents[0].payload.avatar).toBeNull();
  });

  it('3. Preserves avatar and avatarUpdatedAt when user details are saved by admin', async () => {
    const req = { user: { id: 'usr-1', username: 'rajesh' }, headers: {} };
    await userService.updateAvatar('usr-1', '/uploads/users/rajesh-1723321234.webp', req);
    const initialAvatarUpdatedAt = usersTable.get('usr-1').avatarUpdatedAt;

    // Admin updates user role without changing avatar
    const saved = await userService.saveUser({
      id: 'usr-1',
      name: 'Rajesh Patil Senior',
      username: 'rajesh',
      role: 'Regional Manager',
      category: 'admin',
      assignedStoreId: 'all',
      assignedStores: ['all']
    }, { user: { id: 'usr-super', category: 'super admin' }, headers: {} });

    expect(saved.avatar).toBe('/uploads/users/rajesh-1723321234.webp');
    expect(saved.avatarUpdatedAt).toBe(initialAvatarUpdatedAt);
    expect(saved.name).toBe('Rajesh Patil Senior');
  });
});
