import { z } from 'zod';

export const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Full name is required').trim(),
  username: z
    .string()
    .min(1, 'Username is required')
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]+$/, 'Username can only contain lowercase alphanumeric characters, dots, hyphens, and underscores'),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? '' : value),
    z.string().trim().email('Invalid email address').optional().or(z.literal(''))
  ),
  phone: z.string().trim().max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional()
    .or(z.literal('')),
  role: z.string().min(1, 'Job title / display title is required').trim(),
  category: z.enum(['super admin', 'admin', 'employee', 'auditor']).default('employee'),
  assignedStoreId: z.string().trim().default('all'),
  assignedStores: z.array(z.string()).default(['all']),
  permissions: z.array(z.string()).default([]),
  permissionGrants: z.array(z.string()).default([]),
  permissionDenies: z.array(z.string()).default([]),
  status: z.enum(['active', 'suspended', 'inactive']).default('active')
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword']
  });

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? '' : value),
    z.string().trim().email('Invalid email address').optional().or(z.literal(''))
  ),
  phone: z.string().trim().optional().or(z.literal(''))
});

export type UserFormValues = z.infer<typeof userFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
