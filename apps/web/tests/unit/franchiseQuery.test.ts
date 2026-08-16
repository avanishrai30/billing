import { franchiseApi } from '../../features/franchises/api';
import { franchiseQueryKeys } from '../../features/franchises/hooks';
import { apiClient } from '../../lib/api/client';

jest.mock('../../lib/api/client');

describe('Franchise API & Query Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. franchiseQueryKeys generates deterministic cache keys', () => {
    expect(franchiseQueryKeys.list()).toEqual(['franchises', 'list']);
    expect(franchiseQueryKeys.detail('fran-101')).toEqual(['franchises', 'detail', 'fran-101']);
    expect(franchiseQueryKeys.supplyOrders()).toEqual(['franchise-supply-orders', 'list']);
  });

  it('2. franchiseApi.getFranchises calls GET /api/v1/franchises', async () => {
    const mockList = [{ id: 'fran-1', name: 'Outlet 1' }];
    (apiClient.get as jest.Mock).mockResolvedValue(mockList);

    const result = await franchiseApi.getFranchises();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/franchises');
    expect(result).toEqual(mockList);
  });

  it('3. franchiseApi.saveFranchise calls POST /api/v1/franchises', async () => {
    const payload = {
      name: 'Thane Outlet',
      location: 'Thane',
      owner: 'Vikram',
      status: 'active' as const
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, franchise: { ...payload, id: 'fran-1' } });

    const result = await franchiseApi.saveFranchise(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/franchises', payload);
    expect(result.success).toBe(true);
  });

  it('4. franchiseApi.createSupplyOrder calls POST /api/v1/franchise-supply-orders', async () => {
    const payload = {
      franchiseId: 'fran-1',
      items: [{ productId: 'p1', name: 'Ghee', qty: 10, supplyPrice: 500, gst: 5 }],
      subtotal: 5000,
      tax: 250,
      grandTotal: 5250,
      paymentStatus: 'paid' as const
    };
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true, order: { ...payload, id: 'fso-1' } });

    const result = await franchiseApi.createSupplyOrder(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/franchise-supply-orders', payload);
    expect(result.success).toBe(true);
  });
});
