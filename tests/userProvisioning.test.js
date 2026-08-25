const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { setupContext } = require('../modules/context');
const usersRouter = require('../modules/users');
const userService = require('../services/userService');

function createMockDb({ usersTable, storesTable, auditLogsTable }) {
  return {
    collection: (name) => ({
      async findOne(query = {}) {
        if (name === 'users') {
          if (query.id) return usersTable.get(query.id) || null;
          if (query.username) {
            return Array.from(usersTable.values()).find(user => user.username === query.username) || null;
          }
          if (query.email) {
            return Array.from(usersTable.values()).find(user => user.email === query.email) || null;
          }
          if (query.$or) {
            for (const clause of query.$or) {
              const match = await this.findOne(clause);
              if (match) return match;
            }
          }
          return null;
        }
        if (name === 'stores') {
          if (query.id) return storesTable.get(query.id) || null;
          return null;
        }
        if (name === 'role_permissions') return null;
        return null;
      },
      find() {
        return {
          project: () => ({ toArray: async () => Array.from(usersTable.values()) }),
          toArray: async () => {
            if (name === 'users') return Array.from(usersTable.values());
            if (name === 'stores') return Array.from(storesTable.values());
            return [];
          }
        };
      },
      async insertOne(doc) {
        if (name === 'users') {
          if (Array.from(usersTable.values()).some(user => user.username === doc.username)) {
            const err = new Error('duplicate key');
            err.code = 11000;
            err.keyPattern = { username: 1 };
            err.keyValue = { username: doc.username };
            throw err;
          }
          if (doc.email && Array.from(usersTable.values()).some(user => user.email === doc.email)) {
            const err = new Error('duplicate key');
            err.code = 11000;
            err.keyPattern = { email: 1 };
            err.keyValue = { email: doc.email };
            throw err;
          }
          usersTable.set(doc.id, doc);
        }
        if (name === 'audit_logs') auditLogsTable.push(doc);
        return { acknowledged: true, insertedId: doc.id || doc._id };
      },
      async updateOne(filter, update) {
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

describe('Employee and store-scoped user provisioning', () => {
  const JWT_SECRET = 'user-provisioning-secret';
  let app;
  let usersTable;
  let storesTable;
  let auditLogsTable;
  let emittedEvents;
  let superAdmin;
  let admin;
  let unauthorizedActor;

  function tokenFor(user) {
    return jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
      category: user.category,
      assignedStoreId: user.assignedStoreId,
      tokenVersion: user.tokenVersion || 1
    }, JWT_SECRET);
  }

  function employeePayload(overrides = {}) {
    return {
      name: 'Pradeep H',
      username: `pradeep.${Date.now()}`,
      email: '',
      phone: '9999999999',
      password: 'EmployeePass123!',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'all',
      assignedStores: ['all'],
      permissions: [],
      permissionGrants: [],
      permissionDenies: [],
      status: 'active',
      ...overrides
    };
  }

  beforeEach(() => {
    emittedEvents = [];
    auditLogsTable = [];
    superAdmin = {
      id: 'usr-super',
      name: 'Super Admin',
      username: 'superadmin',
      role: 'Enterprise Owner',
      category: 'super admin',
      assignedStoreId: 'all',
      assignedStores: ['all'],
      permissions: [],
      permissionGrants: [],
      permissionDenies: [],
      passwordHash: bcrypt.hashSync('AdminPass123!', 4),
      status: 'active',
      tokenVersion: 1
    };
    admin = {
      id: 'usr-admin',
      name: 'Store Admin',
      username: 'storeadmin',
      role: 'Admin',
      category: 'admin',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      permissions: ['users.create', 'users.update', 'users.view'],
      permissionGrants: [],
      permissionDenies: [],
      passwordHash: bcrypt.hashSync('AdminPass123!', 4),
      status: 'active',
      tokenVersion: 1
    };
    unauthorizedActor = {
      id: 'usr-employee',
      name: 'Employee Actor',
      username: 'employeeactor',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      permissions: [],
      permissionGrants: [],
      permissionDenies: [],
      passwordHash: bcrypt.hashSync('EmployeePass123!', 4),
      status: 'active',
      tokenVersion: 1
    };
    usersTable = new Map([
      [superAdmin.id, superAdmin],
      [admin.id, admin],
      [unauthorizedActor.id, unauthorizedActor]
    ]);
    storesTable = new Map([
      ['store-1', { id: 'store-1', name: 'Store 1', code: 'ST-1', status: 'active' }],
      ['store-2', { id: 'store-2', name: 'Store 2', code: 'ST-2', status: 'active' }]
    ]);
    const io = {
      to: room => ({
        emit: (eventName, payload) => emittedEvents.push({ room, eventName, payload })
      })
    };
    setupContext(createMockDb({ usersTable, storesTable, auditLogsTable }), io, JWT_SECRET, '/tmp', {}, new Map());

    app = express();
    app.use(express.json());
    app.use('/api/v1/users', usersRouter);
  });

  test('Super Admin creates Employee for all stores', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'pradeep.all', assignedStoreId: 'all', assignedStores: ['all'] }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      username: 'pradeep.all',
      category: 'employee',
      assignedStoreId: 'all',
      assignedStores: ['all']
    });
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeDefined();
    expect(res.body.user.email).toBeUndefined();
  });

  test('Super Admin creates Employee for Store 1 and Store 2', async () => {
    for (const storeId of ['store-1', 'store-2']) {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
        .send(employeePayload({
          name: `Pradeep ${storeId}`,
          username: `pradeep.${storeId}`,
          assignedStoreId: storeId,
          assignedStores: [storeId]
        }));

      expect(res.status).toBe(200);
      expect(res.body.user.assignedStoreId).toBe(storeId);
      expect(res.body.user.assignedStores).toEqual([storeId]);
    }
  });

  test('Admin with user creation permission creates Admin for Store 1', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send(employeePayload({
        name: 'Branch Admin',
        username: 'branch.admin',
        role: 'Admin',
        category: 'admin',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1']
      }));

    expect(res.status).toBe(200);
    expect(res.body.user.category).toBe('admin');
    expect(res.body.user.assignedStoreId).toBe('store-1');
  });

  test('invalid store ID returns STORE_NOT_FOUND and does not create user', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({
        username: 'invalid.store.user',
        assignedStoreId: 'missing-store',
        assignedStores: ['missing-store']
      }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STORE_NOT_FOUND');
    expect(await usersTable.get('invalid.store.user')).toBeUndefined();
    expect(Array.from(usersTable.values()).some(user => user.username === 'invalid.store.user')).toBe(false);
  });

  test('contradictory store scope returns INVALID_STORE_SCOPE', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({
        username: 'bad.scope.user',
        assignedStoreId: 'store-1',
        assignedStores: ['all']
      }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STORE_SCOPE');
  });

  test('duplicate username returns USERNAME_ALREADY_EXISTS', async () => {
    const first = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'duplicate.user' }));
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'duplicate.user', email: 'dupe@example.com' }));

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });

  test('username is normalized lowercase and trimmed before uniqueness checks', async () => {
    const first = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: ' Trimmed.User ' }));

    expect(first.status).toBe(200);
    expect(first.body.user.username).toBe('trimmed.user');

    const second = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'trimmed.user' }));

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });

  test('optional empty email does not participate in duplicate checks', async () => {
    const first = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'pradeep1', email: '', assignedStoreId: 'all', assignedStores: ['all'] }));
    expect(first.status).toBe(200);
    expect(first.body.user.email).toBeUndefined();

    const second = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'pradeep2', email: '', assignedStoreId: 'store-1', assignedStores: ['store-1'] }));
    expect(second.status).toBe(200);
    expect(second.body.user.email).toBeUndefined();
    expect(second.body.user.assignedStoreId).toBe('store-1');
  });

  test('whitespace email is normalized away', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'whitespace.email', email: '   ' }));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeUndefined();
  });

  test('duplicate real email returns USER_EMAIL_ALREADY_EXISTS with normalized email', async () => {
    const first = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'email.owner', email: 'info@vcorganics.com' }));
    expect(first.status).toBe(200);
    expect(first.body.user.email).toBe('info@vcorganics.com');

    const duplicate = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'pradeep3', email: ' INFO@vcorganics.com ' }));

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('USER_EMAIL_ALREADY_EXISTS');
    expect(duplicate.body.error.message).toBe("Email 'info@vcorganics.com' is already in use.");
    expect(duplicate.body.error.message).not.toContain("Email ''");
  });

  test('missing password on create returns PASSWORD_REQUIRED', async () => {
    const payload = employeePayload({ username: 'missing.password' });
    delete payload.password;

    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PASSWORD_REQUIRED');
    expect(Array.from(usersTable.values()).some(user => user.username === 'missing.password')).toBe(false);
  });

  test('non-authorized actor cannot create users', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(unauthorizedActor)}`)
      .send(employeePayload({ username: 'forbidden.user' }));

    expect(res.status).toBe(403);
    expect(Array.from(usersTable.values()).some(user => user.username === 'forbidden.user')).toBe(false);
  });

  test('existing employee edit without password can change store scope and category subject to privilege rules', async () => {
    const created = await userService.saveUser(employeePayload({
      username: 'editable.employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1']
    }), { user: superAdmin, headers: {} });

    const edited = await userService.saveUser({
      ...created,
      category: 'auditor',
      assignedStoreId: 'store-2',
      assignedStores: ['store-2']
    }, { user: superAdmin, headers: {} });

    expect(edited.category).toBe('auditor');
    expect(edited.assignedStoreId).toBe('store-2');
    expect(edited.assignedStores).toEqual(['store-2']);
    expect(edited.password).toBeUndefined();
  });

  test('existing employee edit can clear email without duplicate failure', async () => {
    const created = await userService.saveUser(employeePayload({
      username: 'email.clear',
      email: 'clear@example.com'
    }), { user: superAdmin, headers: {} });

    const edited = await userService.saveUser({
      ...created,
      email: ''
    }, { user: superAdmin, headers: {} });

    expect(edited.email).toBeUndefined();
    expect(usersTable.get(created.id).email).toBeUndefined();
  });

  test('profile update can clear blank email and rejects duplicate real email', async () => {
    const owner = await userService.saveUser(employeePayload({
      username: 'profile.email.owner',
      email: 'profile.owner@example.com'
    }), { user: superAdmin, headers: {} });
    const target = await userService.saveUser(employeePayload({
      username: 'profile.email.target',
      email: 'profile.target@example.com'
    }), { user: superAdmin, headers: {} });

    const cleared = await userService.updateProfile(target.id, {
      name: target.name,
      email: '   ',
      phone: target.phone
    }, { user: target, headers: {} });

    expect(cleared.email).toBeUndefined();
    expect(usersTable.get(target.id).email).toBeUndefined();

    await expect(userService.updateProfile(target.id, {
      name: target.name,
      email: owner.email.toUpperCase(),
      phone: target.phone
    }, { user: target, headers: {} })).rejects.toMatchObject({
      code: 'USER_EMAIL_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  test('existing employee edit to duplicate email returns USER_EMAIL_ALREADY_EXISTS', async () => {
    const owner = await userService.saveUser(employeePayload({
      username: 'email.dupe.owner',
      email: 'owner@example.com'
    }), { user: superAdmin, headers: {} });
    const target = await userService.saveUser(employeePayload({
      username: 'email.dupe.target',
      email: ''
    }), { user: superAdmin, headers: {} });

    await expect(userService.saveUser({
      ...target,
      email: owner.email
    }, { user: superAdmin, headers: {} })).rejects.toMatchObject({
      code: 'USER_EMAIL_ALREADY_EXISTS',
      statusCode: 409
    });
  });

  test('successful create emits user realtime synchronization events', async () => {
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(superAdmin)}`)
      .send(employeePayload({ username: 'realtime.user' }));

    expect(emittedEvents.some(event => event.eventName === 'user_created')).toBe(true);
    expect(emittedEvents.some(event => event.eventName === 'user_updated')).toBe(true);
  });
});
