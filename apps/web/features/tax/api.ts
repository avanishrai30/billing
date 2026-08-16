import { invoicesApi } from '../invoices/api';
import { purchasesApi } from '../purchases/api';
import { franchiseApi } from '../franchises/api';
import { customersApi } from '../customers/api';
import { storesApi } from '../stores/api';
import type { Invoice } from '../invoices/types';
import type { PurchaseDoc } from '../purchases/types';
import type { FranchiseSupplyOrderDoc } from '../franchises/types';
import type { CustomerDoc } from '../customers/types';
import type { StoreDoc } from '../stores/types';

export interface TaxReportSourceData {
  invoices: Invoice[];
  purchases: PurchaseDoc[];
  franchiseOrders: FranchiseSupplyOrderDoc[];
  customers: CustomerDoc[];
  stores: StoreDoc[];
}

export const taxApi = {
  /**
   * Fetches all underlying transactional datasets using verified APIs
   */
  async getTaxSourceData(params: {
    storeId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<TaxReportSourceData> {
    const [invoicesRes, purchasesRes, franchiseOrders, customers, stores] = await Promise.all([
      invoicesApi.getInvoices({
        storeId: params.storeId,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 1000
      }),
      purchasesApi.getPurchases({
        storeId: params.storeId,
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 1000
      }),
      franchiseApi.getSupplyOrders(),
      customersApi.getCustomers(),
      storesApi.getStores()
    ]);

    const invoices = Array.isArray(invoicesRes)
      ? invoicesRes
      : invoicesRes?.invoices || [];

    const purchases = Array.isArray(purchasesRes)
      ? purchasesRes
      : purchasesRes?.purchases || [];

    return {
      invoices,
      purchases,
      franchiseOrders: Array.isArray(franchiseOrders) ? franchiseOrders : [],
      customers: Array.isArray(customers) ? customers : [],
      stores: Array.isArray(stores) ? stores : []
    };
  }
};
