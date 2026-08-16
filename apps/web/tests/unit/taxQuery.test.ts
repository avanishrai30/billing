import { taxApi } from '../../features/tax/api';
import { taxQueryKeys } from '../../features/tax/hooks';
import { invoicesApi } from '../../features/invoices/api';
import { purchasesApi } from '../../features/purchases/api';
import { franchiseApi } from '../../features/franchises/api';
import { customersApi } from '../../features/customers/api';
import { storesApi } from '../../features/stores/api';

jest.mock('../../features/invoices/api');
jest.mock('../../features/purchases/api');
jest.mock('../../features/franchises/api');
jest.mock('../../features/customers/api');
jest.mock('../../features/stores/api');

describe('Tax Query & API Data Loader Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. taxQueryKeys generates deterministic cache keys', () => {
    expect(taxQueryKeys.all).toEqual(['tax-reports']);
    expect(taxQueryKeys.sourceData({ storeId: 'store-1' })).toEqual([
      'tax-reports',
      'source-data',
      { storeId: 'store-1' }
    ]);
  });

  it('2. taxApi.getTaxSourceData aggregates across verified transactional APIs', async () => {
    (invoicesApi.getInvoices as jest.Mock).mockResolvedValue([]);
    (purchasesApi.getPurchases as jest.Mock).mockResolvedValue([]);
    (franchiseApi.getSupplyOrders as jest.Mock).mockResolvedValue([]);
    (customersApi.getCustomers as jest.Mock).mockResolvedValue([]);
    (storesApi.getStores as jest.Mock).mockResolvedValue([]);

    const result = await taxApi.getTaxSourceData({ storeId: 'store-1' });

    expect(invoicesApi.getInvoices).toHaveBeenCalledWith({
      storeId: 'store-1',
      startDate: undefined,
      endDate: undefined,
      limit: 1000
    });
    expect(purchasesApi.getPurchases).toHaveBeenCalledWith({
      storeId: 'store-1',
      startDate: undefined,
      endDate: undefined,
      limit: 1000
    });
    expect(franchiseApi.getSupplyOrders).toHaveBeenCalled();
    expect(customersApi.getCustomers).toHaveBeenCalled();
    expect(storesApi.getStores).toHaveBeenCalled();

    expect(result).toEqual({
      invoices: [],
      purchases: [],
      franchiseOrders: [],
      customers: [],
      stores: []
    });
  });
});
