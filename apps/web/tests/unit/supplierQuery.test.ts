import { suppliersApi } from '../../features/suppliers/api';
import { supplierQueryKeys } from '../../features/suppliers/hooks';
import {
  calculateSupplierMetrics,
  formatSupplierContact,
  formatSupplierGst
} from '../../features/suppliers/calculations';
import { apiClient } from '../../lib/api/client';
import type { SupplierDoc } from '../../features/suppliers/types';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Supplier API, Query Keys & Calculation Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Generates deterministic supplier query keys', () => {
    expect(supplierQueryKeys.list()).toEqual(['suppliers', 'list']);
    expect(supplierQueryKeys.detail('sup-101')).toEqual(['supplier', 'sup-101']);
  });

  it('2. suppliersApi.getSuppliers requests GET /api/v1/suppliers', async () => {
    const mockSuppliers: SupplierDoc[] = [
      { id: 's1', name: 'Golden Ghee Co.', contact: '9876543210' }
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockSuppliers);

    const res = await suppliersApi.getSuppliers();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/suppliers');
    expect(res).toEqual(mockSuppliers);
  });

  it('3. suppliersApi.createSupplier posts payload to /api/v1/suppliers', async () => {
    const payload = { name: 'Golden Ghee Co.', contact: '9876543210' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      supplier: { id: 's1', ...payload }
    });

    const res = await suppliersApi.createSupplier(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/suppliers', payload);
    expect(res.success).toBe(true);
  });

  it('4. suppliersApi.updateSupplier patches payload to /api/v1/suppliers/:id', async () => {
    const payload = { name: 'Golden Ghee Enterprises' };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      success: true,
      supplier: { id: 's1', name: 'Golden Ghee Enterprises', contact: '9876543210' }
    });

    const res = await suppliersApi.updateSupplier('s1', payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/suppliers/s1', payload);
    expect(res.success).toBe(true);
  });

  it('5. suppliersApi.deleteSupplier deletes /api/v1/suppliers/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Supplier deleted successfully'
    });

    const res = await suppliersApi.deleteSupplier('s1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/suppliers/s1');
    expect(res.success).toBe(true);
  });

  it('6. calculateSupplierMetrics computes total suppliers, GST accounts, and email counts', () => {
    const sampleList: SupplierDoc[] = [
      { id: '1', name: 'A', contact: '1', gst: '27AAAAA0000A1Z5', email: 'a@test.com' },
      { id: '2', name: 'B', contact: '2', gst: '', email: 'b@test.com' },
      { id: '3', name: 'C', contact: '3' }
    ];

    const metrics = calculateSupplierMetrics(sampleList);
    expect(metrics.totalSuppliers).toBe(3);
    expect(metrics.withGstCount).toBe(1);
    expect(metrics.withEmailCount).toBe(2);
  });

  it('7. Formatters format contact and GST cleanly', () => {
    expect(formatSupplierContact('9876543210')).toBe('+91 98765 43210');
    expect(formatSupplierGst('27aaaaa0000a1z5')).toBe('27AAAAA0000A1Z5');
    expect(formatSupplierGst('')).toBe('Unregistered');
  });
});
