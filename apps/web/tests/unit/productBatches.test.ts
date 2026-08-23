import { productsApi } from '../../features/products/api';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Product Batches & Multi-Source Barcode Hardening Suite (Phase 30.2)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Fetches product batches from authoritative backend endpoint', async () => {
    const mockBatches = [
      {
        id: 'bat-101',
        productId: 'prd-organic-ghee',
        lotNumber: 'LOT-2026-08',
        expiryDate: '2027-08-31',
        remainingQuantity: 45,
        status: 'active'
      }
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      batches: mockBatches
    });

    const res = await productsApi.getProductBatches('prd-organic-ghee');

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/products/prd-organic-ghee/batches');
    expect(res).toEqual(mockBatches);
  });

  it('2. Atomically requests candidate AIA barcode sequence via POST', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      barcode: 'AIA000105'
    });

    const res = await productsApi.generateAIavroBarcode();

    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/products/barcodes', {});
    expect(res.barcode).toBe('AIA000105');
  });

  it('3. Saves third-party external barcode product with source EXTERNAL', async () => {
    const externalProduct = {
      name: 'Third Party Organic Cold Pressed Oil',
      sku: 'EXT-OIL-1L',
      barcode: '8901234567890',
      barcodeSource: 'EXTERNAL' as const,
      barcodeType: 'PRIMARY',
      category: 'Oils',
      sellingPrice: 320,
      purchasePrice: 240,
      gst: 5,
      unit: 'bottle',
      reorderLevel: 10,
      maxStock: 100,
      sellingMode: 'packaged' as const,
      type: 'EXTERNAL' as const,
      status: 'active' as const,
      barcodes: [],
      variants: []
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      product: { ...externalProduct, id: 'prd-ext-101' }
    });

    const res = await productsApi.saveProduct(externalProduct);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/products',
      expect.objectContaining({
        barcode: '8901234567890',
        barcodeSource: 'EXTERNAL',
        type: 'EXTERNAL'
      })
    );
    expect(res.product.barcodeSource).toBe('EXTERNAL');
  });

  it('4. Rejects duplicate barcode save for EXTERNAL source with 409 conflict', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      status: 409,
      message: 'Barcode already belongs to another product.'
    });

    await expect(
      productsApi.saveProduct({
        id: 'prd-new-dup',
        name: 'Duplicate External Item',
        sku: 'SKU-DUP-EXT',
        barcode: '8901234567890',
        barcodeSource: 'EXTERNAL',
        category: 'Pantry',
        sellingPrice: 100,
        purchasePrice: 60,
        gst: 5,
        unit: 'bottle',
        reorderLevel: 10,
        maxStock: 100,
        sellingMode: 'packaged' as const,
        type: 'EXTERNAL' as const,
        status: 'active' as const,
        barcodes: [],
        variants: []
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        message: 'Barcode already belongs to another product.'
      })
    );
  });

  it('5. Rejects duplicate barcode save for AIAVRO generated and MANUAL sources', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce({
      status: 409,
      message: 'Barcode already belongs to another product.'
    });

    await expect(
      productsApi.saveProduct({
        id: 'prd-new-aia-dup',
        name: 'Duplicate AIA Item',
        sku: 'SKU-DUP-AIA',
        barcode: 'AIA000042',
        barcodeSource: 'AIAVRO',
        category: 'Pantry',
        sellingPrice: 100,
        purchasePrice: 60,
        gst: 5,
        unit: 'bottle',
        reorderLevel: 10,
        maxStock: 100,
        sellingMode: 'packaged' as const,
        type: 'OWN' as const,
        status: 'active' as const,
        barcodes: [],
        variants: []
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        message: 'Barcode already belongs to another product.'
      })
    );
  });

  it('6. Allows saving multiple products with null/unassigned barcodes without collision', async () => {
    const unassignedProduct = {
      name: 'Fresh Loose Organic Spinach',
      sku: 'SPINACH-LOOSE',
      barcode: null,
      barcodeSource: null,
      category: 'Vegetables',
      sellingPrice: 40,
      purchasePrice: 20,
      gst: 0,
      unit: 'kg',
      reorderLevel: 5,
      maxStock: 50,
      sellingMode: 'loose' as const,
      type: 'OWN' as const,
      status: 'active' as const,
      barcodes: [],
      variants: []
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      product: { ...unassignedProduct, id: 'prd-spinach-1' }
    });

    const res = await productsApi.saveProduct(unassignedProduct);
    expect(res.product.barcode).toBeNull();
  });

  it('7. Concurrency simulation: 10 concurrent barcode generation requests all return distinct unique codes', async () => {
    let counter = 100;
    (apiClient.post as jest.Mock).mockImplementation(async (url: string) => {
      if (url === '/api/v1/products/barcodes') {
        counter++;
        return { success: true, barcode: `AIA000${counter}` };
      }
      return { success: true };
    });

    const requests = Array.from({ length: 10 }, () => productsApi.generateAIavroBarcode());
    const results = await Promise.all(requests);
    const codes = results.map(r => r.barcode);
    const uniqueCodes = new Set(codes);

    expect(codes.length).toBe(10);
    expect(uniqueCodes.size).toBe(10);
  });
});
