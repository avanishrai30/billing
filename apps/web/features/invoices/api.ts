import { apiClient, getApiBaseUrl } from '../../lib/api/client';
import type {
  Invoice,
  InvoicesResponse,
  InvoiceQueryParams
} from './types';

export const invoicesApi = {
  /**
   * Fetch paginated invoice ledger with server-side filters
   * GET /api/v1/invoices
   */
  async getInvoices(params?: InvoiceQueryParams): Promise<InvoicesResponse> {
    const queryParams: Record<string, any> = {};

    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.customerId && params.customerId !== 'all') queryParams.customerId = params.customerId;
    const loc = params?.locationId || params?.storeId;
    if (loc && loc !== 'all') queryParams.locationId = loc;
    if (params?.startDate) queryParams.startDate = params.startDate;
    if (params?.endDate) queryParams.endDate = params.endDate;
    if (params?.search) queryParams.search = params.search;

    const res = await apiClient.get<InvoicesResponse>('/api/v1/invoices', {
      params: queryParams
    });

    return res;
  },

  /**
   * Fetch single detailed invoice record
   * GET /api/v1/invoices/:id
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await apiClient.get<Invoice | { success: boolean; invoice: Invoice }>(
      `/api/v1/invoices/${encodeURIComponent(id)}`
    );

    if (res && typeof res === 'object' && 'invoice' in res) {
      return (res as { success: boolean; invoice: Invoice }).invoice;
    }
    return res as Invoice;
  },

  /**
   * Atomically void invoice & revert stock batch
   * POST /api/v1/invoices/:id/void
   */
  async voidInvoice(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/api/v1/invoices/${encodeURIComponent(id)}/void`,
      { reason }
    );
  },

  /**
   * Professional tax invoice PDF download URL
   * GET /api/v1/invoices/:invoiceNumber/pdf
   */
  getPdfUrl(invoiceNumber: string): string {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api/v1/invoices/${encodeURIComponent(invoiceNumber)}/pdf`;
  }
};
