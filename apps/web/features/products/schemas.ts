import { z } from 'zod';

export const barcodeSourceSchema = z.enum(['AIAVRO', 'EXTERNAL', 'MANUAL']);

export const barcodeMappingSchema = z.object({
  barcode: z.string().trim().min(1, 'Barcode string is required'),
  type: z.enum(['PRIMARY', 'ALTERNATE', 'VARIANT']).default('ALTERNATE'),
  source: barcodeSourceSchema.default('MANUAL'),
  variantId: z.string().trim().optional(),
  variantName: z.string().trim().optional(),
  active: z.boolean().default(true)
});

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  sellingPrice: z.number().min(0, 'Selling price must be >= 0').optional(),
  purchasePrice: z.number().min(0, 'Purchase price must be >= 0').optional(),
  unit: z.string().trim().optional(),
  weight: z.number().min(0).optional(),
  status: z.string().trim().default('active')
});

export const productFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Product name is required'),
  sku: z.string().trim().min(1, 'SKU code is required'),
  barcode: z.string().trim().optional().nullable(),
  barcodeSource: barcodeSourceSchema.optional().nullable(),
  barcodeType: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brandId: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  supplier: z.string().trim().optional(),
  purchasePrice: z.coerce.number().min(0, 'Purchase cost must be >= 0').default(0),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be >= 0').default(0),
  gst: z.coerce.number().min(0).max(100).default(0),
  unit: z.string().trim().default('pc'),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.string().trim().optional(),
  sellingMode: z.enum(['packaged', 'loose', 'weight_based']).default('packaged'),
  type: z.enum(['OWN', 'EXTERNAL']).default('OWN'),
  dom: z.string().trim().optional(),
  doe: z.string().trim().optional(),
  emoji: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  description: z.string().trim().optional(),
  image: z.string().trim().optional(),
  imageId: z.string().trim().optional(),
  reorderLevel: z.coerce.number().min(0).default(5),
  maxStock: z.coerce.number().min(0).default(100),
  barcodes: z.array(barcodeMappingSchema).default([]),
  variants: z.array(productVariantSchema).default([])
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
