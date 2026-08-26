const { setupContext } = require('../modules/context');
const authzService = require('../services/authzService');
const userService = require('../services/userService');
const storeService = require('../services/storeService');

function createCollectionBackedDb(storesTable, usersTable, auditLogsTable, invoicesTable, inventoryTable) {
  return {
    collection: (name) => ({
      findOne: async (query) => {
        if (name === 'stores') {
          if (query.id) return storesTable.get(query.id) || null;
          return null;
        }
        if (name === 'users') {
          if (query.id) return usersTable.get(query.id) || null;
          if (query.username) {
            for (const user of usersTable.values()) {
              if (user.username === query.username) return user;
            }
          }
          return null;
        }
        if (name === 'role_permissions') return null;
        return null;
      },
      find: (filter = {}) => ({
        project: () => ({
          toArray: async () => {
            if (name === 'stores') return Array.from(storesTable.values());
            if (name === 'users') return Array.from(usersTable.values());
            if (name === 'invoices') return Array.from(invoicesTable.values());
            if (name === 'inventory') return Array.from(inventoryTable.values());
            return [];
          }
        }),
        sort: () => ({
          skip: () => ({
            limit: () => ({
              toArray: async () => {
                if (name === 'invoices') return Array.from(invoicesTable.values());
                return [];
              }
            })
          })
        }),
        toArray: async () => {
          if (name === 'stores') return Array.from(storesTable.values());
          if (name === 'users') {
            if (filter.$or) {
              const matching = [];
              for (const u of usersTable.values()) {
                const assigned = Array.isArray(u.assignedStores) ? u.assignedStores : [u.assignedStoreId];
                if (filter.$or.some(cond => cond.assignedStores === 'store-1' ? assigned.includes('store-1') : u.assignedStoreId === 'store-1')) {
                  matching.push(u);
                }
              }
              return matching;
            }
            return Array.from(usersTable.values());
          }
          if (name === 'invoices') return Array.from(invoicesTable.values());
          if (name === 'inventory') return Array.from(inventoryTable.values());
          if (name === 'products') return [];
          return [];
        }
      }),
      countDocuments: async () => {
        if (name === 'invoices') return invoicesTable.size;
        return 0;
      },
      insertOne: async (doc) => {
        if (name === 'stores') storesTable.set(doc.id, doc);
        if (name === 'users') usersTable.set(doc.id, doc);
        if (name === 'audit_logs') auditLogsTable.push(doc);
        return { acknowledged: true, insertedId: doc.id };
      },
      updateOne: async (filter, update) => {
        const table = name === 'stores' ? storesTable : (name === 'users' ? usersTable : null);
        if (!table) return { matchedCount: 0, modifiedCount: 0 };
        const current = table.get(filter.id);
        if (!current) return { matchedCount: 0, modifiedCount: 0 };
        const next = { ...current, ...(update.$set || {}) };
        if (update.$unset) {
          for (const key of Object.keys(update.$unset)) delete next[key];
        }
        table.set(filter.id, next);
        return { matchedCount: 1, modifiedCount: 1 };
      },
      findOneAndUpdate: async (filter, update) => {
        const table = name === 'stores' ? storesTable : (name === 'users' ? usersTable : null);
        if (!table) return null;
        const current = table.get(filter.id);
        if (!current) return null;
        const next = { ...current, ...(update.$set || {}) };
        table.set(filter.id, next);
        return next;
      },
      deleteOne: async (filter) => {
        const table = name === 'stores' ? storesTable : (name === 'users' ? usersTable : null);
        if (!table) return { deletedCount: 0 };
        const existed = table.delete(filter.id);
        return { deletedCount: existed ? 1 : 0 };
      }
    })
  };
}

describe('Store-Centric Operating Model & Multi-Store Scoping Backend Suite', () => {
  let storesTable;
  let usersTable;
  let auditLogsTable;
  let invoicesTable;
  let inventoryTable;
  let emittedEvents;

  beforeEach(() => {
    storesTable = new Map([
      ['store-1', { id: 'store-1', name: 'Mumbai Flagship', code: 'ST-MUM', status: 'active', isHub: false, hubPriority: 1 }],
      ['store-2', { id: 'store-2', name: 'Thane Hub', code: 'ST-THN', status: 'active', isHub: true, hubPriority: 10 }],
      ['store-3', { id: 'store-3', name: 'Pune Outlet', code: 'ST-PUN', status: 'active', isHub: false, hubPriority: 1 }]
    ]);

    usersTable = new Map([
      ['usr-super', {
        id: 'usr-super',
        name: 'Super Admin',
        username: 'admin',
        role: 'Enterprise Owner',
        category: 'super admin',
        assignedStoreId: 'all',
        assignedStores: ['all'],
        status: 'active'
      }],
      ['usr-cashier-1', {
        id: 'usr-cashier-1',
        name: 'Amit Cashier',
        username: 'amit.cashier',
        role: 'Cashier Staff',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1'],
        status: 'active'
      }],
      ['usr-multi-manager', {
        id: 'usr-multi-manager',
        name: 'Vikram Multi',
        username: 'vikram.mgr',
        role: 'Area Manager',
        category: 'employee',
        assignedStoreId: 'store-1',
        assignedStores: ['store-1', 'store-2'],
        status: 'active'
      }]
    ]);

    auditLogsTable = [];
    invoicesTable = new Map();
    inventoryTable = new Map();
    emittedEvents = [];

    const mockIo = {
      to: (room) => ({
        emit: (eventName, payload) => {
          emittedEvents.push({ room, eventName, payload });
        }
      })
    };

    const mockDb = createCollectionBackedDb(storesTable, usersTable, auditLogsTable, invoicesTable, inventoryTable);
    setupContext(mockDb, mockIo, 'test-secret');
  });

  describe('1. Store Authorization & Access Assertions', () => {
    it('Super Admin has access to all stores and wildcard', () => {
      const superUser = usersTable.get('usr-super');
      expect(authzService.getAuthorizedStoreIds(superUser)).toEqual(['*']);
      expect(authzService.hasStoreAccess(superUser, 'store-1')).toBe(true);
      expect(authzService.hasStoreAccess(superUser, 'store-2')).toBe(true);
      expect(authzService.hasStoreAccess(superUser, 'store-3')).toBe(true);
      expect(() => authzService.assertStoreAccess(superUser, 'store-3')).not.toThrow();
    });

    it('Single-store employee has access only to assigned store', () => {
      const cashier = usersTable.get('usr-cashier-1');
      expect(authzService.getAuthorizedStoreIds(cashier)).toEqual(['store-1']);
      expect(authzService.hasStoreAccess(cashier, 'store-1')).toBe(true);
      expect(authzService.hasStoreAccess(cashier, 'store-2')).toBe(false);
      expect(authzService.hasStoreAccess(cashier, 'store-3')).toBe(false);
      expect(() => authzService.assertStoreAccess(cashier, 'store-1')).not.toThrow();
      expect(() => authzService.assertStoreAccess(cashier, 'store-2')).toThrow(/Forbidden/);
    });

    it('Multi-store employee has access to all assigned stores and cannot access unauthorized stores', () => {
      const manager = usersTable.get('usr-multi-manager');
      const authorized = authzService.getAuthorizedStoreIds(manager);
      expect(authorized).toContain('store-1');
      expect(authorized).toContain('store-2');
      expect(authzService.hasStoreAccess(manager, 'store-1')).toBe(true);
      expect(authzService.hasStoreAccess(manager, 'store-2')).toBe(true);
      expect(authzService.hasStoreAccess(manager, 'store-3')).toBe(false);
      expect(authzService.hasStoreAccess(manager, 'all')).toBe(false);
      expect(() => authzService.assertStoreAccess(manager, 'store-1')).not.toThrow();
      expect(() => authzService.assertStoreAccess(manager, 'store-2')).not.toThrow();
      expect(() => authzService.assertStoreAccess(manager, 'store-3')).toThrow(/Forbidden/);
    });
  });

  describe('2. User Store Normalization & Assignment Rules', () => {
    it('Normalizes multi-store employee assignment correctly', async () => {
      const user = await userService.saveUser({
        name: 'Ramesh Multi',
        username: 'ramesh.multi',
        password: 'password123',
        category: 'employee',
        role: 'Supervisor',
        assignedStores: ['store-1', 'store-3'],
        assignedStoreId: 'store-3'
      }, { user: { id: 'usr-super', category: 'super admin' }, headers: {} });

      expect(user.assignedStores).toEqual(['store-1', 'store-3']);
      expect(user.assignedStoreId).toBe('store-3');
    });

    it('Rejects "all" stores assignment for regular employee', async () => {
      await expect(userService.saveUser({
        name: 'Invalid Employee',
        username: 'invalid.emp',
        password: 'password123',
        category: 'employee',
        role: 'Cashier',
        assignedStores: ['all'],
        assignedStoreId: 'all'
      }, { user: { id: 'usr-super', category: 'super admin' }, headers: {} })).rejects.toThrow(/Employees must be assigned to at least one physical store/);
    });

    it('Rejects non-existent store IDs in user assignment', async () => {
      await expect(userService.saveUser({
        name: 'Ghost Store User',
        username: 'ghost.user',
        password: 'password123',
        category: 'employee',
        role: 'Staff',
        assignedStores: ['non-existent-store-xyz'],
        assignedStoreId: 'non-existent-store-xyz'
      }, { user: { id: 'usr-super', category: 'super admin' }, headers: {} })).rejects.toThrow(/Store 'non-existent-store-xyz' was not found/);
    });
  });

  describe('3. Distribution Hub Promotion & Management', () => {
    it('Promotes active store to distribution HUB and updates status', async () => {
      const result = await storeService.setStoreHubStatus('store-1', true, 5, { id: 'usr-super' }, { headers: {} });
      expect(result.success).toBe(true);
      expect(result.store.isHub).toBe(true);
      expect(result.store.hubPriority).toBe(5);

      const storeInDb = storesTable.get('store-1');
      expect(storeInDb.isHub).toBe(true);
    });

    it('Demotes distribution HUB status', async () => {
      const result = await storeService.setStoreHubStatus('store-2', false, 1, { id: 'usr-super' }, { headers: {} });
      expect(result.success).toBe(true);
      expect(result.store.isHub).toBe(false);

      const storeInDb = storesTable.get('store-2');
      expect(storeInDb.isHub).toBe(false);
    });

    it('Aggregates store summary metrics including hub count', async () => {
      const summary = await storeService.getStoreSummaryMetrics();
      expect(summary.totalStores).toBe(3);
      expect(summary.activeStoresCount).toBe(3);
      expect(summary.inactiveStoresCount).toBe(0);
      expect(summary.hubStoresCount).toBe(1); // store-2 isHub=true
    });
  });

  describe('4. Store Team Membership Operations', () => {
    it('Adds an employee to a store team and updates user assignedStores', async () => {
      const result = await storeService.addEmployeeToStore('store-3', 'usr-cashier-1', { id: 'usr-super' }, { headers: {} });
      expect(result.success).toBe(true);
      expect(result.user.assignedStores).toContain('store-1');
      expect(result.user.assignedStores).toContain('store-3');

      const userInDb = usersTable.get('usr-cashier-1');
      expect(userInDb.assignedStores).toContain('store-3');
    });

    it('Removes an employee from a secondary store team', async () => {
      const result = await storeService.removeEmployeeFromStore('store-2', 'usr-multi-manager', { id: 'usr-super' }, { headers: {} });
      expect(result.success).toBe(true);
      expect(result.user.assignedStores).toEqual(['store-1']);
    });

    it('Prevents removing employee from their only remaining store', async () => {
      await expect(
        storeService.removeEmployeeFromStore('store-1', 'usr-cashier-1', { id: 'usr-super' }, { headers: {} })
      ).rejects.toThrow(/Cannot remove user from their only assigned store/);
    });
  });
});
