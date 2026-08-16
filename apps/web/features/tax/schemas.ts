import { z } from 'zod';

export const taxFilterSchema = z.object({
  storeId: z.string().default('all'),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  tab: z.enum(['overview', 'outward', 'inward', 'franchise', 'slabs', 'b2b_b2c']).default('overview')
});

export type TaxFilterSchemaValues = z.infer<typeof taxFilterSchema>;
