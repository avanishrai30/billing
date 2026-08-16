import { z } from 'zod';

export const businessSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  name: z.string().min(1, 'Business name is required'),
  subtitle: z.string().optional(),
  owner: z.string().optional(),
  gstin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  upiId: z.string().optional(),
  terms: z.string().optional(),
  logo: z.string().optional(),
  status: z.string().default('active'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const businessFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Business name is required').trim(),
  subtitle: z.string().optional(),
  owner: z.string().optional(),
  gstin: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  upiId: z.string().optional(),
  terms: z.string().optional(),
  logo: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export type BusinessFormValues = z.infer<typeof businessFormSchema>;
