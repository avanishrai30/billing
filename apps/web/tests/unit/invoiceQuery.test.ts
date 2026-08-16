import { invoicesApi } from '../../features/invoices/api';
import { invoiceQueryKeys } from '../../features/invoices/hooks';
import { calculateInvoiceSummary } from '../../features/invoices/calculations';
import { apiClient } from '../../lib/api/client';
import type { Invoice } from '../../features/invoices/types';

jest.mock('../../lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

describe('Invoices API & Query Keys Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('1. Generates deterministic invoice query keys', () => {
    expect(
      invoiceQueryKeys.list({ page: 2, limit: 50, locationId: 'store-1', status: 'PAID' })
    ).toEqual(['invoices', 'list', 2, 50, 'PAID', 'all', 'store-1', '', '', '']);

    expect(invoiceQueryKeys.detail('INV-101')).toEqual([
      'invoices',
      'detail',
      'INV-101'
    ]);
  });

  it('2. invoicesApi.getInvoices requests GET /api/v1/invoices with correct query params', async () => {
    const mockRes = {
      success: true,
      invoices: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce(mockRes);

    const res = await invoicesApi.getInvoices({
      page: 1,
      limit: 50,
      locationId: 'store-1',
      status: 'PAID',
      search: 'Avanish'
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/invoices', {
      params: {
        page: 1,
        limit: 50,
        locationId: 'store-1',
        status: 'PAID',
        search: 'Avanish'
      }
    });
    expect(res).toEqual(mockRes);
  });

  it('3. invoicesApi.voidInvoice posts to /api/v1/invoices/:id/void', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: 'Invoice voided successfully'
    });

    const res = await invoicesApi.voidInvoice('INV-101', 'Customer returned items');
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/invoices/INV-101/void', {
      reason: 'Customer returned items'
    });
    expect(res.success).toBe(true);
  });

  it('4. calculateInvoiceSummary calculates total revenue, taxes, discounts, and average bill size', () => {
    const mockInvoices: Invoice[] = [
      {
        id: '1',
        invoiceNumber: 'INV-1',
        locationId: 'store-1',
        items: [],
        subtotal: 1000,
        discount: 50,
        tax: 50,
        grandTotal: 1000,
        status: 'PAID',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        invoiceNumber: 'INV-2',
        locationId: 'store-1',
        items: [],
        subtotal: 2000,
        discount: 100,
        tax: 100,
        grandTotal: 2000,
        status: 'PAID',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        invoiceNumber: 'INV-3',
        locationId: 'store-1',
        items: [],
        subtotal: 500,
        discount: 0,
        tax: 25,
        grandTotal: 525,
        status: 'VOIDED', // Excluded from metrics
        isArchived: true,
        createdAt: new Date().toISOString()
      }
    ];

    const metrics = calculateInvoiceSummary(mockInvoices);
    expect(metrics.totalInvoices).toBe(2);
    expect(metrics.totalRevenue).toBe(3000);
    expect(metrics.totalTax).toBe(150);
    expect(metrics.totalDiscount).toBe(150);
    expect(metrics.averageTicket).toBe(1500);
  });
});
