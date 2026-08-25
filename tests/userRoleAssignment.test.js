const { setupContext } = require('../modules/context');
const authzService = require('../services/authzService');
const realtimeService = require('../services/realtimeService');
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
        if (name === 'businesses') return { id: query.id, name: 'Test Business' };
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

describe('User role assignment source of truth', () => {
  let usersTable;
  let auditLogsTable;
  let emittedToTarget;

  beforeEach(() => {
    usersTable = new Map([
      ['usr-super', {
        id: 'usr-super',
        name: 'Super Admin',
        username: 'owner',
        role: 'Enterprise Owner',
        category: 'super admin',
        assignedStoreId: 'all',
        assignedStores: ['all'],
        status: 'active',
        tokenVersion: 1
      }],
      ['usr-target', {
        id: 'usr-target',
        name: 'Target User',
        username: 'target',
        role: 'Warehouse Manager',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        permissions: [],
        permissionGrants: [],
        permissionDenies: [],
        status: 'active',
        tokenVersion: 1
      }]
    ]);
    auditLogsTable = [];
    emittedToTarget = [];

    const socket = {
      id: 'socket-target',
      emit: (eventName, payload) => emittedToTarget.push({ eventName, payload })
    };
    const sockets = new Map([[socket.id, socket]]);
    realtimeService.setup({ sockets: { sockets } });
    realtimeService.registerUserSocket('usr-target', socket);
    setupContext(createCollectionBackedDb(usersTable, auditLogsTable), null, 'test-secret');
  });

  test('display title alone never grants authorization when category is employee', async () => {
    const details = await authzService.resolveUserPermissionDetails({
      id: 'usr-target',
      role: 'Super Admin',
      category: 'employee',
      permissions: [],
      permissionGrants: [],
      permissionDenies: []
    });

    expect(details.category).toBe('employee');
    expect(details.effectivePermissions).not.toContain('*');
    expect(details.effectivePermissions).not.toContain('users.update');
    expect(authzService.isSuperAdmin({ role: 'Super Admin', category: 'employee' })).toBe(false);
  });

  test('category update is persisted and drives effective permissions in both directions', async () => {
    const actor = usersTable.get('usr-super');
    const employee = usersTable.get('usr-target');

    const promoted = await userService.saveUser({
      ...employee,
      role: 'Warehouse Manager',
      category: 'admin'
    }, {
      user: actor,
      headers: {},
      socket: {}
    });

    expect(promoted.category).toBe('admin');
    expect(promoted.role).toBe('Warehouse Manager');
    expect(usersTable.get('usr-target').category).toBe('admin');

    const promotedPermissions = await userService.getEffectivePermissions('usr-target');
    expect(promotedPermissions.category).toBe('admin');
    expect(promotedPermissions.effectivePermissions).toContain('users.view');
    expect(promotedPermissions.effectivePermissions).toContain('roles.update');
    expect(emittedToTarget.some((event) => event.eventName === 'user_access_updated')).toBe(true);

    const demoted = await userService.saveUser({
      ...usersTable.get('usr-target'),
      category: 'employee'
    }, {
      user: actor,
      headers: {},
      socket: {}
    });

    expect(demoted.category).toBe('employee');
    expect(demoted.role).toBe('Warehouse Manager');
    expect(usersTable.get('usr-target').category).toBe('employee');

    const demotedPermissions = await userService.getEffectivePermissions('usr-target');
    expect(demotedPermissions.category).toBe('employee');
    expect(demotedPermissions.effectivePermissions).not.toContain('users.view');
    expect(demotedPermissions.effectivePermissions).not.toContain('roles.update');
  });
});
