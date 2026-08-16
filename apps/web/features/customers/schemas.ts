import { z } from 'zod';

export const customerSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstin: z.string().optional(),
  gst: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export const customerFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Customer name is required').trim(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .trim()
    .refine((val) => val.replace(/\D/g, '').length >= 10, {
      message: 'Phone number must be at least 10 digits'
    }),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format')
    .optional()
    .or(z.literal('')),
  address: z.string().optional()
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
