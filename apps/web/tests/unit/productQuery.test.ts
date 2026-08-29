import { productsApi } from '../../features/products/api';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Product API Client Unit Suite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. getProducts constructs query parameters correctly', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce([
      { id: 'prd-1', name: 'A2 Milk 1L', sku: 'MILK-1' }
    ]);

    const result = await productsApi.getProducts({
      search: 'Milk',
      category: 'Dairy',
      type: 'OWN',
      sellingMode: 'packaged'
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/v1/products?search=Milk&category=Dairy&type=OWN&sellingMode=packaged'
    );
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('A2 Milk 1L');
  });

  it('2. saveProduct calls POST /api/v1/products', async () => {
    const mockPayload = {
      name: 'Organic Butter 200g',
      sku: 'BUT-200',
      purchasePrice: 120,
      sellingPrice: 180,
      gst: 12,
      unit: 'pack',
      sellingMode: 'packaged' as const,
      type: 'OWN' as const,
      status: 'active' as const,
      reorderLevel: 5,
      maxStock: 50,
      barcodes: [],
      variants: []
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      product: { id: 'prd-new', ...mockPayload }
    });

    const res = await productsApi.saveProduct(mockPayload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/products', mockPayload);
    expect(res.success).toBe(true);
    expect(res.product.id).toBe('prd-new');
  });

  it('3. archiveProduct calls DELETE /api/v1/products/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Product archived successfully'
    });

    const res = await productsApi.archiveProduct('prd-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/products/prd-123');
    expect(res.success).toBe(true);
  });

  it('4. uploadProductImage includes canonical Product Master ID', async () => {
    const mockRes = {
      success: true,
      imagePath: '/uploads/products/a2-ghee.webp',
      imageId: 'img-1',
      productId: 'prod-ghee-1'
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockRes);

    const res = await productsApi.uploadProductImage(
      'prod-ghee-1',
      'A2 Ghee.png',
      'data:image/png;base64,1234'
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/upload?type=products&productId=prod-ghee-1',
      {
        fileName: 'A2 Ghee.png',
        base64Data: 'data:image/png;base64,1234'
      }
    );
    expect(res.productId).toBe('prod-ghee-1');
  });
});
