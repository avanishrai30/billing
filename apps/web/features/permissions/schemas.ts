import { z } from 'zod';

export const rolePermissionsMatrixSchema = z.object({
  admin: z.array(z.string()).default([]),
  employee: z.array(z.string()).default([]),
  auditor: z.array(z.string()).default([])
});

export type RolePermissionsMatrixValues = z.infer<typeof rolePermissionsMatrixSchema>;
