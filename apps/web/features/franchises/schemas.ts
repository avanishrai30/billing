import { z } from 'zod';

export const franchiseSupplyListItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  name: z.string().min(1, 'Product name is required'),
  supplyPrice: z.number().min(0, 'Wholesale supply price must be non-negative'),
  retailPrice: z.number().min(0, 'Retail price must be non-negative'),
  isCustom: z.boolean().optional()
});

export const franchiseFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Franchise store name is required').trim(),
  location: z.string().min(1, 'Location / city is required').trim(),
  owner: z.string().min(1, 'Owner / contact person is required').trim(),
  phone: z.string().max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid Indian 15-character GSTIN format')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  supplyList: z.array(franchiseSupplyListItemSchema).default([])
});

export const supplyOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  name: z.string().min(1, 'Item name is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  supplyPrice: z.number().min(0, 'Supply price must be non-negative'),
  gst: z.number().min(0, 'GST rate must be non-negative').default(0),
  isCustom: z.boolean().optional()
});

export const supplyOrderFormSchema = z.object({
  franchiseId: z.string().min(1, 'Target franchise partner is required'),
  date: z.string().optional(),
  items: z.array(supplyOrderItemSchema).min(1, 'At least one item is required in supply order'),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  grandTotal: z.number().min(0),
  paymentStatus: z.enum(['paid', 'pending', 'credit', 'unpaid']).default('paid'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal(''))
});

export type FranchiseFormValues = z.infer<typeof franchiseFormSchema>;
export type SupplyOrderFormValues = z.infer<typeof supplyOrderFormSchema>;
