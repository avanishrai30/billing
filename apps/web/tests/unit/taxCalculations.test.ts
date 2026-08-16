import {
  isValidGSTIN,
  classifyB2BOrB2C,
  groupByTaxRate,
  calculateTaxSummaryMetrics,
  buildB2BSegmentationLists
} from '../../features/tax/calculations';
import type { Invoice } from '../../features/invoices/types';
import type { PurchaseDoc } from '../../features/purchases/types';
import type { CustomerDoc } from '../../features/customers/types';

describe('Tax & GST Calculations Suite', () => {
  const mockCustomerB2B: CustomerDoc = {
    id: 'cust-b2b',
    name: 'Reliance Fresh Ltd',
    phone: '9876543210',
    gstin: '27AAAAA0000A1Z5',
    createdAt: new Date().toISOString()
  };

  const mockCustomerB2C: CustomerDoc = {
    id: 'cust-b2c',
    name: 'Suresh Patil',
    phone: '9876543211',
    gstin: '',
    createdAt: new Date().toISOString()
  };

  const customersMap = new Map<string, CustomerDoc>();
  customersMap.set('cust-b2b', mockCustomerB2B);
  customersMap.set('cust-b2c', mockCustomerB2C);

  const mockInvoices: Invoice[] = [
    {
      _id: 'inv-1',
      id: 'INV-1001',
      invoiceNumber: 'INV-1001',
      customerId: 'cust-b2b',
      customerName: 'Reliance Fresh Ltd',
      locationId: 'store-1',
      storeId: 'store-1',
      subtotal: 1000,
      tax: 50,
      discount: 0,
      grandTotal: 1050,
      paymentMode: 'UPI',
      status: 'PAID',
      createdAt: '2026-08-17T01:00:00.000Z',
      items: [
        {
          productId: 'prod-1',
          name: 'Organic Ghee',
          quantity: 2,
          price: 500,
          sellingPrice: 500,
          gst: 5,
          tax: 50,
          lineTotal: 1000
        }
      ]
    },
    {
      _id: 'inv-2',
      id: 'INV-1002',
      invoiceNumber: 'INV-1002',
      customerId: 'cust-b2c',
      customerName: 'Suresh Patil',
      locationId: 'store-1',
      storeId: 'store-1',
      subtotal: 2000,
      tax: 360,
      discount: 0,
      grandTotal: 2360,
      paymentMode: 'CASH',
      status: 'COMPLETED',
      createdAt: '2026-08-17T02:00:00.000Z',
      items: [
        {
          productId: 'prod-2',
          name: 'Packaged Drinks',
          quantity: 10,
          price: 200,
          sellingPrice: 200,
          gst: 18,
          tax: 360,
          lineTotal: 2000
        }
      ]
    },
    {
      _id: 'inv-3',
      id: 'INV-1003',
      invoiceNumber: 'INV-1003',
      customerId: 'cust-b2c',
      customerName: 'Suresh Patil',
      locationId: 'store-1',
      storeId: 'store-1',
      subtotal: 500,
      tax: 0,
      discount: 0,
      grandTotal: 500,
      paymentMode: 'CASH',
      status: 'VOIDED', // Should be ignored
      createdAt: '2026-08-17T03:00:00.000Z',
      items: []
    }
  ];

  const mockPurchases: PurchaseDoc[] = [
    {
      _id: 'pur-1',
      id: 'PUR-5001',
      purchaseId: 'PUR-5001',
      purchaseDate: '2026-08-16',
      locationId: 'store-1',
      storeId: 'store-1',
      supplierId: 'sup-1',
      supplierName: 'Dairy Wholesale Corp',
      subtotal: 5000,
      taxAmount: 250,
      shipping: 200,
      grandTotal: 5450,
      paymentStatus: 'PAID',
      status: 'RECEIVED',
      createdAt: '2026-08-16T10:00:00.000Z',
      items: []
    }
  ];

  it('1. isValidGSTIN accurately detects verified tax IDs', () => {
    expect(isValidGSTIN('27AAAAA0000A1Z5')).toBe(true);
    expect(isValidGSTIN('29ABCDE1234F2Z5')).toBe(true);
    expect(isValidGSTIN('')).toBe(false);
    expect(isValidGSTIN(null)).toBe(false);
    expect(isValidGSTIN('unregistered')).toBe(false);
    expect(isValidGSTIN('none')).toBe(false);
  });

  it('2. classifyB2BOrB2C categorizes based on customer GSTIN', () => {
    const resB2B = classifyB2BOrB2C(mockInvoices[0], customersMap);
    expect(resB2B.isB2B).toBe(true);
    expect(resB2B.gstin).toBe('27AAAAA0000A1Z5');

    const resB2C = classifyB2BOrB2C(mockInvoices[1], customersMap);
    expect(resB2C.isB2B).toBe(false);
    expect(resB2C.gstin).toBe('');
  });

  it('3. groupByTaxRate groups items and divides CGST/SGST 50/50', () => {
    const slabs = groupByTaxRate(mockInvoices);
    expect(slabs.length).toBeGreaterThanOrEqual(4);

    const slab5 = slabs.find((s) => s.rate === 5);
    expect(slab5).toBeDefined();
    expect(slab5?.taxableValue).toBe(1000);
    expect(slab5?.taxAmount).toBe(50);
    expect(slab5?.cgst).toBe(25);
    expect(slab5?.sgst).toBe(25);

    const slab18 = slabs.find((s) => s.rate === 18);
    expect(slab18).toBeDefined();
    expect(slab18?.taxableValue).toBe(2000);
    expect(slab18?.taxAmount).toBe(360);
    expect(slab18?.cgst).toBe(180);
    expect(slab18?.sgst).toBe(180);
  });

  it('4. calculateTaxSummaryMetrics computes accurate financial summaries', () => {
    const metrics = calculateTaxSummaryMetrics(mockInvoices, mockPurchases, [], customersMap);

    expect(metrics.grossSales).toBe(3410); // 1050 + 2360
    expect(metrics.taxableSales).toBe(3000); // 1000 + 2000
    expect(metrics.outwardGst).toBe(410); // 50 + 360
    expect(metrics.cgstShare).toBe(205); // 410 / 2
    expect(metrics.sgstShare).toBe(205); // 410 / 2

    expect(metrics.purchaseTaxable).toBe(5000);
    expect(metrics.inwardGst).toBe(250);
    expect(metrics.freightCharges).toBe(200);

    expect(metrics.b2bSalesTotal).toBe(1050);
    expect(metrics.b2bInvoicesCount).toBe(1);
    expect(metrics.b2cSalesTotal).toBe(2360);
    expect(metrics.b2cInvoicesCount).toBe(1);
  });

  it('5. buildB2BSegmentationLists creates partitioned B2B and B2C tables', () => {
    const storesMap = new Map<string, string>();
    storesMap.set('store-1', 'Mumbai Flagship');

    const { b2b, b2c } = buildB2BSegmentationLists(mockInvoices, customersMap, storesMap);

    expect(b2b.length).toBe(1);
    expect(b2b[0].invoiceId).toBe('INV-1001');
    expect(b2b[0].gstin).toBe('27AAAAA0000A1Z5');
    expect(b2b[0].cgst).toBe(25);
    expect(b2b[0].sgst).toBe(25);

    expect(b2c.length).toBe(1);
    expect(b2c[0].invoiceId).toBe('INV-1002');
    expect(b2c[0].grandTotal).toBe(2360);
  });
});
