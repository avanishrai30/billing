const authzService = require('../services/authzService');

describe('User Avatar Pipeline & Serializer Backend Suite', () => {
  it('1. toAuthUser preserves avatar and avatarUpdatedAt', () => {
    const dbUser = {
      id: 'usr-rajesh',
      name: 'Rajesh',
      username: 'rajesh',
      role: 'Store Cashier',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      avatar: '/uploads/users/rajesh-profile.webp',
      avatarUpdatedAt: '2026-08-26T07:00:00.000Z',
      status: 'active'
    };

    const authUser = authzService.toAuthUser(dbUser);
    expect(authUser.avatar).toBe('/uploads/users/rajesh-profile.webp');
    expect(authUser.avatarUpdatedAt).toBe('2026-08-26T07:00:00.000Z');
  });

  it('2. toAuthUser defaults null for missing avatar fields without breaking', () => {
    const dbUser = {
      id: 'usr-hemasree',
      name: 'Hemasree',
      username: 'hemasree',
      role: 'Inventory Assistant',
      category: 'employee',
      assignedStoreId: 'store-1',
      assignedStores: ['store-1'],
      status: 'active'
    };

    const authUser = authzService.toAuthUser(dbUser);
    expect(authUser.avatar).toBeNull();
    expect(authUser.avatarUpdatedAt).toBeNull();
  });
});
