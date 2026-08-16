import { customersApi } from '../../features/customers/api';
import { customerQueryKeys } from '../../features/customers/hooks';
import {
  calculateCustomerMetrics,
  formatCustomerPhone,
  formatCustomerGst
} from '../../features/customers/calculations';
import { apiClient } from '../../lib/api/client';
import type { CustomerDoc } from '../../features/customers/types';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

describe('Customer API, Query Keys & Calculation Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Generates deterministic customer query keys', () => {
    expect(customerQueryKeys.list()).toEqual(['customers', 'list']);
    expect(customerQueryKeys.detail('cust-101')).toEqual(['customer', 'cust-101']);
  });

  it('2. customersApi.getCustomers requests GET /api/v1/customers', async () => {
    const mockCustomers: CustomerDoc[] = [
      { id: 'c1', name: 'Avanish', phone: '9876543210' }
    ];
    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockCustomers);

    const res = await customersApi.getCustomers();
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/customers');
    expect(res).toEqual(mockCustomers);
  });

  it('3. customersApi.createCustomer posts payload to /api/v1/customers', async () => {
    const payload = { name: 'Avanish', phone: '9876543210' };
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      customer: { id: 'c1', ...payload }
    });

    const res = await customersApi.createCustomer(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/customers', payload);
    expect(res.success).toBe(true);
  });

  it('4. customersApi.updateCustomer patches payload to /api/v1/customers/:id', async () => {
    const payload = { name: 'Avanish Rai' };
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      success: true,
      customer: { id: 'c1', name: 'Avanish Rai', phone: '9876543210' }
    });

    const res = await customersApi.updateCustomer('c1', payload);
    expect(apiClient.patch).toHaveBeenCalledWith('/api/v1/customers/c1', payload);
    expect(res.success).toBe(true);
  });

  it('5. customersApi.deleteCustomer deletes /api/v1/customers/:id', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Customer deleted successfully'
    });

    const res = await customersApi.deleteCustomer('c1');
    expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/customers/c1');
    expect(res.success).toBe(true);
  });

  it('6. calculateCustomerMetrics computes total customers, GST accounts, and email counts', () => {
    const sampleList: CustomerDoc[] = [
      { id: '1', name: 'A', phone: '1', gstin: '27AAAAA0000A1Z5', email: 'a@test.com' },
      { id: '2', name: 'B', phone: '2', gstin: '', email: 'b@test.com' },
      { id: '3', name: 'C', phone: '3' }
    ];

    const metrics = calculateCustomerMetrics(sampleList);
    expect(metrics.totalCustomers).toBe(3);
    expect(metrics.withGstinCount).toBe(1);
    expect(metrics.withEmailCount).toBe(2);
  });

  it('7. Formatters format phone and GST cleanly', () => {
    expect(formatCustomerPhone('9876543210')).toBe('+91 98765 43210');
    expect(formatCustomerGst('27aaaaa0000a1z5')).toBe('27AAAAA0000A1Z5');
    expect(formatCustomerGst('')).toBe('Unregistered');
  });
});
