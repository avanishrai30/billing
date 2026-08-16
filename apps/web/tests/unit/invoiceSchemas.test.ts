import {
  invoiceLineItemSchema,
  invoiceSchema,
  invoicesResponseSchema,
  voidInvoiceSchema
} from '../../features/invoices/schemas';

describe('Invoices Zod Validation Schemas', () => {
  it('1. Validates invoice line item schema', () => {
    const validItem = {
      productId: 'prod-1',
      name: 'A2 Cow Ghee 1L',
      sku: 'GHEE-1L',
      unit: 'tin',
      quantity: 2,
      price: 650,
      cost: 450,
      tax: 65,
      discount: 0,
      lineTotal: 1300
    };

    const res = invoiceLineItemSchema.safeParse(validItem);
    expect(res.success).toBe(true);
  });

  it('2. Validates complete invoice schema', () => {
    const validInvoice = {
      id: 'INV-2026-001',
      invoiceNumber: 'INV-2026-001',
      transactionId: 'TXN-987654',
      locationId: 'store-1',
      customerName: 'Avanish Rai',
      customerPhone: '+919876543210',
      items: [
        {
          productId: 'prod-1',
          name: 'A2 Cow Ghee 1L',
          quantity: 2,
          price: 650,
          lineTotal: 1300
        }
      ],
      subtotal: 1300,
      discount: 100,
      tax: 60,
      grandTotal: 1260,
      paymentMode: 'UPI',
      status: 'PAID',
      createdAt: new Date().toISOString()
    };

    const res = invoiceSchema.safeParse(validInvoice);
    expect(res.success).toBe(true);
  });

  it('3. Validates invoices list response schema with pagination', () => {
    const validResponse = {
      success: true,
      invoices: [
        {
          id: 'INV-2026-001',
          invoiceNumber: 'INV-2026-001',
          locationId: 'store-1',
          items: [],
          subtotal: 500,
          discount: 0,
          tax: 25,
          grandTotal: 525,
          status: 'PAID',
          createdAt: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    const res = invoicesResponseSchema.safeParse(validResponse);
    expect(res.success).toBe(true);
  });

  it('4. Validates void invoice schema', () => {
    const validVoid = {
      invoiceId: 'INV-2026-001',
      reason: 'Customer returned items / billing correction'
    };

    const res = voidInvoiceSchema.safeParse(validVoid);
    expect(res.success).toBe(true);
  });

  it('5. Rejects void invoice with reason shorter than 3 characters', () => {
    const shortVoid = {
      invoiceId: 'INV-2026-001',
      reason: 'no'
    };

    const res = voidInvoiceSchema.safeParse(shortVoid);
    expect(res.success).toBe(false);
  });
});
