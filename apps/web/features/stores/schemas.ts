import { z } from 'zod';

export const storeSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  name: z.string().min(1, 'Store name is required'),
  code: z.string().min(1, 'Store code is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  businessId: z.string().optional(),
  locationType: z.enum(['WAREHOUSE', 'STORE']).optional().default('STORE'),
  status: z.enum(['active', 'inactive']).default('active'),
  isHub: z.boolean().optional(),
  hubPriority: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const storeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Store name is required').trim(),
  code: z.string().min(1, 'Store code is required').trim().toUpperCase(),
  address: z.string().optional(),
  phone: z.string().optional(),
  businessId: z.string().optional(),
  locationType: z.enum(['WAREHOUSE', 'STORE']).optional().default('STORE'),
  status: z.enum(['active', 'inactive']).default('active'),
  isHub: z.boolean().optional(),
  hubPriority: z.number().optional()
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;
