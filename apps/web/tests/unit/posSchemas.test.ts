import {
  posProductSchema,
  posCartItemSchema,
  posCheckoutPayloadSchema,
  posCustomerSchema
} from '../../features/pos/schemas';

describe('POS Zod Schemas Validation', () => {
  it('1. Validates valid product schema', () => {
    const valid = {
      id: 'prod-101',
      name: 'Organic Desi Ghee 1L',
      sku: 'GHEE-1',
      price: 650,
      gst: 5,
      unit: 'tin'
    };

    const res = posProductSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('2. Rejects negative price on product', () => {
    const invalid = {
      id: 'prod-101',
      name: 'Item',
      price: -50
    };

    const res = posProductSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('3. Validates valid checkout payload', () => {
    const validCheckout = {
      locationId: 'store-1',
      paymentMode: 'CASH',
      items: [
        {
          productId: 'prod-1',
          name: 'Butter 500g',
          unit: 'pack',
          quantity: 2,
          price: 250,
          sellingPrice: 250,
          cost: 180,
          tax: 25,
          gst: 5,
          lineTotal: 525
        }
      ],
      subtotal: 500,
      discount: 0,
      tax: 25,
      grandTotal: 525
    };

    const res = posCheckoutPayloadSchema.safeParse(validCheckout);
    expect(res.success).toBe(true);
  });

  it('4. Rejects checkout payload without items or without location', () => {
    const noItems = {
      locationId: 'store-1',
      paymentMode: 'CASH',
      items: [],
      subtotal: 0,
      grandTotal: 0
    };

    const res = posCheckoutPayloadSchema.safeParse(noItems);
    expect(res.success).toBe(false);
  });

  it('5. Validates valid customer schema', () => {
    const validCustomer = {
      id: 'cust-1',
      name: 'Sunil Verma',
      phone: '9822012345'
    };

    const res = posCustomerSchema.safeParse(validCustomer);
    expect(res.success).toBe(true);
  });
});
