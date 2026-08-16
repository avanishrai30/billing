import { z } from 'zod';

export const invoiceLineItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  sku: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
  gst: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  discountPercent: z.number().nonnegative().optional(),
  lineTotal: z.number().nonnegative()
});

export const invoiceSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  invoiceNumber: z.string(),
  transactionId: z.string().optional(),
  locationId: z.string(),
  storeId: z.string().optional(),
  businessId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGst: z.string().optional(),
  items: z.array(invoiceLineItemSchema),
  subtotal: z.number(),
  discount: z.number().default(0),
  tax: z.number().default(0),
  grandTotal: z.number(),
  grandtotal: z.number().optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'BANK']).optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.enum(['PAID', 'PENDING', 'FAILED', 'REFUNDED']).optional(),
  status: z.enum(['COMPLETED', 'PAID', 'PENDING', 'VOIDED']).default('COMPLETED'),
  cashier: z.string().optional(),
  cashierName: z.string().optional(),
  notes: z.string().optional(),
  isArchived: z.boolean().optional(),
  voidedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  date: z.string().optional()
});

export const invoicesResponseSchema = z.object({
  success: z.boolean(),
  invoices: z.array(invoiceSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  }),
  requestId: z.string().optional()
});

export const invoiceQueryParamsSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(50),
  status: z.string().optional(),
  customerId: z.string().optional(),
  locationId: z.string().optional(),
  storeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional()
});

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  reason: z.string().min(3, 'Void reason must be at least 3 characters')
});

export type VoidInvoiceFormValues = z.infer<typeof voidInvoiceSchema>;
