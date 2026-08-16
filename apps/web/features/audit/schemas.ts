import { z } from 'zod';

export const auditQuerySchema = z.object({
  limit: z.number().int().min(1).max(1000).default(200),
  skip: z.number().int().min(0).default(0),
  eventType: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  storeId: z.string().trim().optional()
});

export const auditFilterSchema = z.object({
  eventType: z.string().default('ALL'),
  entity: z.string().default('ALL'),
  action: z.string().default('ALL'),
  storeId: z.string().default('all'),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  search: z.string().default('')
});

export type AuditQueryValues = z.infer<typeof auditQuerySchema>;
export type AuditFilterValues = z.infer<typeof auditFilterSchema>;
