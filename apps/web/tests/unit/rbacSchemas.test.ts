import { rolePermissionsMatrixSchema } from '../../features/permissions/schemas';

describe('RBAC Validation Schemas Suite', () => {
  it('1. rolePermissionsMatrixSchema validates valid role matrix payload', () => {
    const validMatrix = {
      admin: ['dashboard.view', 'products.view', 'inventory.view'],
      employee: ['invoices.create', 'invoices.view', 'scanner.use'],
      auditor: ['invoices.view', 'audit.view']
    };

    const parsed = rolePermissionsMatrixSchema.safeParse(validMatrix);
    expect(parsed.success).toBe(true);
  });

  it('2. rolePermissionsMatrixSchema provides defaults for missing keys', () => {
    const parsed = rolePermissionsMatrixSchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.admin).toEqual([]);
      expect(parsed.data.employee).toEqual([]);
      expect(parsed.data.auditor).toEqual([]);
    }
  });
});
