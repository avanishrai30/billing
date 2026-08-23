import { productsApi } from '../../features/products/api';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Product Batches & Barcode API Suite', () => {
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

  it('2. Atomically requests candidate AIA barcode sequence from server', async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      barcode: 'AIA000105'
    });

    const res = await productsApi.generateAIavroBarcode();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/products/generate-barcode');
    expect(res.barcode).toBe('AIA000105');
  });

  it('3. Registers a new batch with lot number and expiry date', async () => {
    const newBatch = {
      id: 'bat-102',
      productId: 'prd-organic-ghee',
      lotNumber: 'LOT-2026-09',
      expiryDate: '2027-09-30',
      receivedQuantity: 50,
      remainingQuantity: 50,
      status: 'active' as const
    };

    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      batch: newBatch
    });

    const res = await productsApi.createProductBatch('prd-organic-ghee', {
      lotNumber: 'LOT-2026-09',
      expiryDate: '2027-09-30',
      receivedQuantity: 50
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/products/prd-organic-ghee/batches',
      expect.objectContaining({
        lotNumber: 'LOT-2026-09',
        expiryDate: '2027-09-30',
        receivedQuantity: 50
      })
    );
    expect(res.batch.lotNumber).toBe('LOT-2026-09');
  });
});
