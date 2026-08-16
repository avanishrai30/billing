import { storesApi } from '../../features/stores/api';
import { businessesApi } from '../../features/businesses/api';
import { storeQueryKeys } from '../../features/stores/hooks';
import { businessQueryKeys } from '../../features/businesses/hooks';
import { calculateStoreMetrics } from '../../features/stores/calculations';
import { apiClient } from '../../lib/api/client';
import type { StoreDoc } from '../../features/stores/types';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Store & Business API, Query Keys & Calculation Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Generates deterministic store and business query keys', () => {
    expect(storeQueryKeys.list()).toEqual(['stores', 'list']);
    expect(storeQueryKeys.detail('st-101')).toEqual(['store', 'st-101']);
    expect(businessQueryKeys.list()).toEqual(['businesses', 'list']);
    expect(businessQueryKeys.detail('biz-1')).toEqual(['business', 'biz-1']);
  });

  it('2. storesApi.getStores requests GET /api/v1/stores', async () => {
    const mockStores: StoreDoc[] = [
      { id: 's1', name: 'Store 1', code: 'ST-01', status: 'active' }
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockStores);

    const res = await storesApi.getStores();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/stores');
    expect(res).toEqual(mockStores);
  });

  it('3. storesApi.createStore posts payload to /api/v1/stores', async () => {
    const payload = { name: 'New Store', code: 'ST-NEW', status: 'active' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      store: { id: 's2', ...payload }
    });

    const res = await storesApi.createStore(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/stores', payload);
    expect(res.success).toBe(true);
  });

  it('4. businessesApi.getBusinesses requests GET /api/v1/businesses', async () => {
    const mockBiz = [{ id: 'b1', name: 'VC Organic', status: 'active' }];
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockBiz);

    const res = await businessesApi.getBusinesses();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/businesses');
    expect(res).toEqual(mockBiz);
  });

  it('5. calculateStoreMetrics computes active and inactive counts', () => {
    const sampleList: StoreDoc[] = [
      { id: '1', name: 'S1', code: 'C1', status: 'active' },
      { id: '2', name: 'S2', code: 'C2', status: 'active' },
      { id: '3', name: 'S3', code: 'C3', status: 'inactive' }
    ];

    const metrics = calculateStoreMetrics(sampleList);
    expect(metrics.totalStores).toBe(3);
    expect(metrics.activeStoresCount).toBe(2);
    expect(metrics.inactiveStoresCount).toBe(1);
  });
});
