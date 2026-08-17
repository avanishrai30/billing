import { z } from 'zod';

export const BrandingFormSchema = z.object({
  title: z.string().min(1, 'Portal title is required').max(100, 'Title cannot exceed 100 characters'),
  logo: z.string().min(1, 'Brand logo path is required')
});

export type BrandingFormValues = z.infer<typeof BrandingFormSchema>;

export const StoreProfileFormSchema = z.object({
  name: z.string().min(1, 'Business / Store name is required').max(100, 'Name cannot exceed 100 characters'),
  subtitle: z.string().max(150, 'Subtitle cannot exceed 150 characters').optional().default(''),
  gstin: z.string().max(20, 'GSTIN cannot exceed 20 characters').optional().default(''),
  phone: z.string().max(25, 'Phone cannot exceed 25 characters').optional().default(''),
  email: z.string().email('Please enter a valid email address').or(z.literal('')).optional().default(''),
  upiId: z.string().max(50, 'UPI ID cannot exceed 50 characters').optional().default(''),
  address: z.string().max(250, 'Address cannot exceed 250 characters').optional().default(''),
  logo: z.string().optional().default(''),
  invoicePrefix: z.string().max(20, 'Invoice prefix cannot exceed 20 characters').optional().default('INV-'),
  currency: z.string().max(10, 'Currency cannot exceed 10 characters').optional().default('INR'),
  isActive: z.boolean().optional().default(true),
  inventoryAlertThreshold: z.number().min(0, 'Threshold cannot be negative').optional().default(5)
});

export type StoreProfileFormSchemaType = z.infer<typeof StoreProfileFormSchema>;

export const PreferencesSchema = z.object({
  showProductImages: z.boolean().default(true)
});

export type PreferencesSchemaType = z.infer<typeof PreferencesSchema>;
