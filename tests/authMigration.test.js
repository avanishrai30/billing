const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { setupContext, getContext } = require('../modules/context');
const authRouter = require('../modules/auth');
const usersRouter = require('../modules/users');
const userService = require('../services/userService');

describe('Stage 10 Patch: Legacy Password Migration & Token Invalidation', () => {
  let app;
  let mockDb;
  let usersTable;
  let auditLogsTable;
  const JWT_SECRET = 'test_auth_patch_secret_2026';

  beforeEach(() => {
    usersTable = new Map();
    auditLogsTable = [];

    mockDb = {
      collection: (name) => ({
        findOne: async (query) => {
          if (name === 'users') {
            if (query.id) return usersTable.get(query.id) || null;
            if (query.$or) {
              for (const cond of query.$or) {
                for (const u of usersTable.values()) {
                  if (cond.username && u.username.toLowerCase() === cond.username.toLowerCase()) return u;
                  if (cond.email && u.email && u.email.toLowerCase() === cond.email.toLowerCase()) return u;
                }
              }
            }
            return null;
          }
          return null;
        },
        find: () => ({
          project: () => ({
            toArray: async () => Array.from(usersTable.values())
          }),
          toArray: async () => auditLogsTable
        }),
        insertOne: async (doc) => {
          if (name === 'users') usersTable.set(doc.id, { ...doc });
          if (name === 'audit_logs') auditLogsTable.push(doc);
          return { insertedId: doc.id || doc._id };
        },
        updateOne: async (filter, update) => {
          if (name === 'users') {
            let target = null;
            if (filter.id) target = usersTable.get(filter.id);
            else if (filter._id) {
              for (const u of usersTable.values()) {
                if (u._id === filter._id || u.id === filter._id) {
                  target = u;
                  break;
                }
              }
            }
            if (target) {
              if (update.$set) Object.assign(target, update.$set);
              if (update.$unset) {
                for (const key of Object.keys(update.$unset)) {
                  delete target[key];
                }
              }
              if (update.$inc) {
                for (const [k, v] of Object.entries(update.$inc)) {
                  target[k] = (target[k] || 0) + v;
                }
              }
              usersTable.set(target.id, target);
            }
          }
        },
        deleteOne: async () => ({ deletedCount: 1 })
      })
    };

    setupContext(mockDb, null, JWT_SECRET, '', {}, new Map());

    // 1. Standard user with passwordHash
    const standardHash = bcrypt.hashSync('StandardPass123!', 10);
    usersTable.set('usr-standard-1', {
      _id: 'usr-standard-1',
      id: 'usr-standard-1',
      username: 'standarduser',
      name: 'Standard User',
      role: 'Admin',
      category: 'admin',
      assignedStoreId: 'all',
      status: 'active',
      passwordHash: standardHash,
      tokenVersion: 1
    });

    // 2. Legacy user with ONLY plaintext password (like Rajesh)
    usersTable.set('usr-rajesh-1', {
      _id: 'usr-rajesh-1',
      id: 'usr-rajesh-1',
      username: 'rajesh',
      name: 'Rajesh Sharma',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-blr-1',
      status: 'active',
      password: 'LegacyPlaintextPass123!',
      tokenVersion: 1
    });

    // 3. Deactivated user with passwordHash
    usersTable.set('usr-suspended-1', {
      _id: 'usr-suspended-1',
      id: 'usr-suspended-1',
      username: 'suspendeduser',
      name: 'Suspended User',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-blr-1',
      status: 'suspended',
      passwordHash: standardHash,
      tokenVersion: 1
    });

    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/users', usersRouter);
  });

  function generateToken(user, tokenVersion) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        category: user.category,
        assignedStoreId: user.assignedStoreId,
        tokenVersion: tokenVersion !== undefined ? tokenVersion : user.tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  test('1. passwordHash login succeeds with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'standarduser', password: 'StandardPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('2. wrong password fails with 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'standarduser', password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('3 & 4 & 5. Legacy password user authenticates once -> auto-migrated to passwordHash, plaintext password deleted, tokenVersion incremented', async () => {
    const rajeshBefore = usersTable.get('usr-rajesh-1');
    expect(rajeshBefore.passwordHash).toBeUndefined();
    expect(rajeshBefore.password).toBe('LegacyPlaintextPass123!');
    expect(rajeshBefore.tokenVersion).toBe(1);

    // First login with legacy password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'rajesh', password: 'LegacyPlaintextPass123!' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();

    // Verify MongoDB document state after login migration
    const rajeshAfter = usersTable.get('usr-rajesh-1');
    expect(rajeshAfter.passwordHash).toBeDefined();
    expect(bcrypt.compareSync('LegacyPlaintextPass123!', rajeshAfter.passwordHash)).toBe(true);
    expect(rajeshAfter.password).toBeUndefined(); // Plaintext field removed ($unset)
    expect(rajeshAfter.tokenVersion).toBe(2); // tokenVersion >= 2

    // Subsequent login strictly verifies against passwordHash
    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'rajesh', password: 'LegacyPlaintextPass123!' });

    expect(secondLogin.status).toBe(200);
    expect(secondLogin.body.success).toBe(true);
  });

  test('6 & 7 & 8. Password change increments tokenVersion, rejects old JWT, and accepts new JWT', async () => {
    const user = usersTable.get('usr-standard-1');
    const oldToken = generateToken(user, 1);

    // Verify old token works initially
    const preCheck = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(preCheck.status).toBe(200);

    // User changes password
    const changeRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: 'StandardPass123!', newPassword: 'BrandNewPassword2026!' });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // Database user tokenVersion incremented
    const updatedUser = usersTable.get('usr-standard-1');
    expect(updatedUser.tokenVersion).toBe(2);

    // Old JWT with version 1 is now REJECTED
    const postCheckOld = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(postCheckOld.status).toBe(401);
    expect(postCheckOld.body.error.code).toBe('SESSION_REVOKED');

    // New login issues JWT with tokenVersion 2, which succeeds
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'standarduser', password: 'BrandNewPassword2026!' });
    expect(newLogin.status).toBe(200);

    const postCheckNew = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${newLogin.body.token}`);
    expect(postCheckNew.status).toBe(200);
  });

  test('9. New user creation stores only passwordHash and never stores plaintext password', async () => {
    const newUserDoc = await userService.saveUser({
      name: 'New Cashier',
      username: 'newcashier',
      role: 'Employee',
      category: 'employee',
      assignedStoreId: 'store-blr-1',
      password: 'InitialPassword789!'
    }, null);

    expect(newUserDoc.passwordHash).toBeDefined();
    expect(newUserDoc.password).toBeUndefined();

    const storedInDb = usersTable.get(newUserDoc.id);
    expect(storedInDb.passwordHash).toBeDefined();
    expect(storedInDb.password).toBeUndefined();
    expect(bcrypt.compareSync('InitialPassword789!', storedInDb.passwordHash)).toBe(true);
  });

  test('10. Deactivated/suspended user is rejected at login and on active tokens', async () => {
    // Rejected at login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'suspendeduser', password: 'StandardPass123!' });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_SUSPENDED');

    // Active token rejected
    const suspendedUser = usersTable.get('usr-suspended-1');
    const token = generateToken(suspendedUser, 1);

    const verifyRes = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });
});
