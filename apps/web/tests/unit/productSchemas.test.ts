import { productFormSchema, barcodeMappingSchema } from '../../features/products/schemas';

describe('Product Schema Validation Suite', () => {
  it('1. Validates valid product creation payload successfully', () => {
    const payload = {
      name: 'Organic Desi Cow Ghee 500ml',
      sku: 'GHEE-500M',
      barcode: '8901234567890',
      category: 'Dairy',
      brand: 'VC Organic',
      supplier: 'Green Pastures Dairy',
      purchasePrice: 350,
      sellingPrice: 520,
      gst: 12,
      unit: 'bottle',
      sellingMode: 'packaged',
      type: 'OWN',
      status: 'active',
      reorderLevel: 10,
      maxStock: 200,
      barcodes: [
        {
          barcode: '8901234567891',
          type: 'ALTERNATE',
          variantName: 'Twin Pack'
        }
      ]
    };

    const parsed = productFormSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Organic Desi Cow Ghee 500ml');
      expect(parsed.data.sku).toBe('GHEE-500M');
      expect(parsed.data.sellingPrice).toBe(520);
      expect(parsed.data.gst).toBe(12);
      expect(parsed.data.barcodes?.length).toBe(1);
    }
  });

  it('2. Rejects product payload missing required name and SKU', () => {
    const invalidPayload = {
      name: '',
      sku: '',
      purchasePrice: -10,
      sellingPrice: 100
    };

    const parsed = productFormSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
      expect(fieldErrors.sku).toBeDefined();
      expect(fieldErrors.purchasePrice).toBeDefined();
    }
  });

  it('3. Barcode mapping schema defaults and validates', () => {
    const validBarcode = {
      barcode: '123456789012',
      type: 'VARIANT',
      variantName: 'Pack of 3',
      active: true
    };

    const parsed = barcodeMappingSchema.safeParse(validBarcode);
    expect(parsed.success).toBe(true);

    const emptyBarcode = { barcode: '' };
    expect(barcodeMappingSchema.safeParse(emptyBarcode).success).toBe(false);
  });
});
