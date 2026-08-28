import { z } from 'zod';

export const posProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().nonnegative(),
  sellingPrice: z.number().optional(),
  cost: z.number().optional(),
  purchasePrice: z.number().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  unit: z.string().default('unit'),
  gst: z.number().default(0),
  tax: z.number().optional(),
  image: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional(),
  sellingMode: z.string().optional(),
  stock: z.number().optional(),
  inventory: z.number().optional(),
  isArchived: z.boolean().optional()
});

export const posCartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().optional(),
  unit: z.string().default('unit'),
  price: z.number().positive(),
  cost: z.number().default(0),
  gst: z.number().default(0),
  quantity: z.number().positive(),
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
  taxableValue: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  lineTotal: z.number().positive(),
  stockAvailable: z.number().optional()
});

export const posCheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.string().default('unit'),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  cost: z.number().default(0),
  tax: z.number().default(0),
  gst: z.number().default(0),
  lineTotal: z.number().nonnegative()
});

export const posCheckoutPayloadSchema = z.object({
  transactionId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  locationId: z.string().min(1, 'Store location is required'),
  storeId: z.string().optional(),
  businessId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'BANK']),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK']).optional(),
  amountPaid: z.number().nonnegative().optional(),
  changeDue: z.number().nonnegative().optional(),
  receiptTemplateId: z.string().optional(),
  receiptTemplate: z.any().optional(),
  items: z.array(posCheckoutItemSchema).min(1, 'At least one item required for checkout'),
  subtotal: z.number().nonnegative(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  grandTotal: z.number().nonnegative(),
  notes: z.string().optional()
});

export const posCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  address: z.string().optional(),
  loyaltyPoints: z.number().optional()
});
