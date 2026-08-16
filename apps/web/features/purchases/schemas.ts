import { z } from 'zod';

export const PurchaseItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().min(1, 'Product description is required'),
  sku: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  hsn: z.string().optional().default(''),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('unit'),
  cost: z.number().min(0, 'Rate cannot be negative'),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().default(0),
  gstRate: z.number().min(0).default(0),
  taxableValue: z.number().default(0),
  taxAmount: z.number().default(0),
  lineTotal: z.number().default(0)
});

export const PurchaseTransportSchema = z.object({
  enabled: z.boolean().default(false),
  transporter: z.string().optional().default(''),
  mode: z.string().optional().default('ROAD'),
  docketNumber: z.string().optional().default(''),
  transportDate: z.string().optional().default(''),
  charge: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(5),
  taxAmount: z.number().default(0),
  paymentStatus: z.string().optional().default('TO_PAY'),
  notes: z.string().optional().default('')
});

export const PurchaseFormSchema = z.object({
  supplierId: z.string().optional().default(''),
  supplierName: z.string().min(1, 'Supplier name is required'),
  invoiceNumber: z.string().min(1, 'Supplier invoice/bill # is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  locationId: z.string().min(1, 'Receiving destination store is required'),
  reference: z.string().optional().default(''),
  paymentStatus: z.enum(['PAID', 'PARTIALLY_PAID', 'UNPAID']).default('PAID'),
  notes: z.string().optional().default(''),
  items: z.array(PurchaseItemSchema).min(1, 'At least one item is required in the purchase entry'),
  transport: PurchaseTransportSchema.optional(),
  otherCharges: z.number().min(0).default(0)
});

export type PurchaseFormValues = z.infer<typeof PurchaseFormSchema>;

export const PurchaseDocSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  purchaseId: z.string().optional(),
  transactionId: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional().default('General Supplier'),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().default(() => new Date().toISOString()),
  locationId: z.string(),
  storeId: z.string().optional(),
  reference: z.string().optional(),
  paymentStatus: z.string().default('PAID'),
  notes: z.string().optional(),
  items: z.array(z.any()).default([]),
  transport: z.any().optional(),
  subtotal: z.number().default(0),
  taxAmount: z.number().default(0),
  shipping: z.number().optional().default(0),
  otherCharges: z.number().optional().default(0),
  grandTotal: z.number().default(0),
  status: z.string().default('RECEIVED'),
  isArchived: z.boolean().optional().default(false),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  voidedAt: z.string().optional()
});

export const PurchasesListResponseSchema = z.object({
  success: z.boolean().default(true),
  purchases: z.array(PurchaseDocSchema).default([]),
  pagination: z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
    total: z.number().default(0),
    totalPages: z.number().default(1),
    hasNext: z.boolean().default(false),
    hasPrev: z.boolean().default(false)
  }),
  requestId: z.string().optional()
});
