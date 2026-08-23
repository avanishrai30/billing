import { productFormSchema, barcodeMappingSchema, barcodeSourceSchema } from '../../features/products/schemas';

describe('Product Schema Validation Suite (Phase 30.2)', () => {
  it('1. Validates valid product creation payload with barcodeSource successfully', () => {
    const payload = {
      name: 'Organic Desi Cow Ghee 500ml',
      sku: 'GHEE-500M',
      barcode: '8901234567890',
      barcodeSource: 'EXTERNAL' as const,
      barcodeType: 'PRIMARY',
      category: 'Dairy',
      brand: 'VC Organic',
      supplier: 'Green Pastures Dairy',
      purchasePrice: 350,
      sellingPrice: 520,
      gst: 12,
      unit: 'bottle',
      sellingMode: 'packaged' as const,
      type: 'OWN' as const,
      status: 'active' as const,
      reorderLevel: 10,
      maxStock: 200,
      barcodes: [
        {
          barcode: '8901234567891',
          type: 'ALTERNATE' as const,
          source: 'EXTERNAL' as const,
          variantName: 'Twin Pack'
        }
      ]
    };

    const parsed = productFormSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Organic Desi Cow Ghee 500ml');
      expect(parsed.data.sku).toBe('GHEE-500M');
      expect(parsed.data.barcodeSource).toBe('EXTERNAL');
      expect(parsed.data.sellingPrice).toBe(520);
      expect(parsed.data.gst).toBe(12);
      expect(parsed.data.barcodes?.length).toBe(1);
      expect(parsed.data.barcodes?.[0].source).toBe('EXTERNAL');
    }
  });

  it('2. Validates barcodeSource enum values and rejects invalid source strings', () => {
    expect(barcodeSourceSchema.safeParse('AIAVRO').success).toBe(true);
    expect(barcodeSourceSchema.safeParse('EXTERNAL').success).toBe(true);
    expect(barcodeSourceSchema.safeParse('MANUAL').success).toBe(true);
    expect(barcodeSourceSchema.safeParse('UNKNOWN_SOURCE').success).toBe(false);
    expect(barcodeSourceSchema.safeParse(12345).success).toBe(false);
  });

  it('3. Rejects product payload missing required name and SKU', () => {
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

  it('4. Barcode mapping schema defaults and validates', () => {
    const validBarcode = {
      barcode: '123456789012',
      type: 'VARIANT' as const,
      source: 'MANUAL' as const,
      variantName: 'Pack of 3',
      active: true
    };

    const parsed = barcodeMappingSchema.safeParse(validBarcode);
    expect(parsed.success).toBe(true);

    const emptyBarcode = { barcode: '' };
    expect(barcodeMappingSchema.safeParse(emptyBarcode).success).toBe(false);
  });
});
